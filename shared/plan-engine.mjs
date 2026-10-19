import { analysis, best, ordered, parseTime, rangeSummary, validDate, validateRecord } from './domain.mjs';

// Deterministic plan-draft engine. Every number it outputs is computed from
// records the administrator actually entered; insufficient data stays empty.
export const PLAN_DRAFT_ID = 'plan-draft';
export const PLAN_ENGINE_VERSION = 'rules-v1';
export const PLAN_HISTORY_LIMIT = 20;
export const DRAFT_HISTORY_LIMIT = 50;
export const EVIDENCE_COLLECTIONS = ['swim', 'trainings', 'growth', 'fitness', 'nutrition', 'goals', 'media', 'annotations'];
export const VOLUME_MIN_RECORDS = 6;
export const VOLUME_MIN_WEEKS = 3;
export const VOLUME_WINDOW_DAYS = 28;
export const RECOVERY_WINDOW_DAYS = 14;
export const RECOVERY_MIN_RECORDS = 2;
export const RPE_MIN_RECORDS = 3;
export const RPE_HIGH_THRESHOLD = 8;
export const SLEEP_DROP_HOURS = 1;
export const SLEEP_MIN_RECORDS = 3;
export const VOLUME_CHANGE_RATIO = 0.15;
export const COVERAGE_LOW_THRESHOLD = 70;

const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const addDays = (date, days) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const weekStart = date => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const unique = ids => [...new Set(ids.filter(Boolean))];
const round1 = value => Math.round(value * 10) / 10;

function dataRange(state) {
  const dates = [];
  for (const key of EVIDENCE_COLLECTIONS) for (const record of state[key] || []) if (validDate(record.date)) dates.push(record.date);
  dates.sort();
  return {
    start: dates[0] || '',
    end: dates.at(-1) || '',
    counts: Object.fromEntries(EVIDENCE_COLLECTIONS.map(key => [key, (state[key] || []).length])),
  };
}

function trainingVolumeWindow(state, end, days) {
  const start = addDays(end, -(days - 1));
  const records = ordered(state.trainings).filter(r => r.date >= start && r.date <= end && typeof r.totalMeters === 'number' && Number.isFinite(r.totalMeters));
  const weeks = new Map();
  for (const record of records) weeks.set(weekStart(record.date), (weeks.get(weekStart(record.date)) || 0) + record.totalMeters);
  return {
    start, end, records,
    weeks: [...weeks.entries()],
    meterTotal: records.reduce((sum, r) => sum + r.totalMeters, 0),
    kickTotal: records.reduce((sum, r) => sum + (typeof r.kickMeters === 'number' && Number.isFinite(r.kickMeters) ? r.kickMeters : 0), 0),
  };
}

function volumeDimension(state, today) {
  const current = trainingVolumeWindow(state, today, VOLUME_WINDOW_DAYS);
  const base = {
    windowStart: current.start, windowEnd: current.end,
    records: current.records.length, weeks: current.weeks.length,
    sourceIds: current.records.map(r => r.id),
  };
  if (current.records.length < VOLUME_MIN_RECORDS || current.weeks.length < VOLUME_MIN_WEEKS) {
    return { ...base, status: 'insufficient', threshold: `需要近${VOLUME_WINDOW_DAYS / 7}周内≥${VOLUME_MIN_RECORDS}条填写了实际泳程的训练记录，且分布于≥${VOLUME_MIN_WEEKS}个不同周；未达标时不生成训练量参考。` };
  }
  const averagePerActiveWeek = current.meterTotal / current.weeks.length;
  const previous = trainingVolumeWindow(state, addDays(current.start, -1), VOLUME_WINDOW_DAYS);
  const previousAverage = previous.records.length >= VOLUME_MIN_RECORDS && previous.weeks.length >= VOLUME_MIN_WEEKS
    ? previous.meterTotal / previous.weeks.length : null;
  return {
    ...base, status: 'ok',
    meterTotal: current.meterTotal,
    kickTotal: current.kickTotal,
    averagePerActiveWeek: round1(averagePerActiveWeek),
    referenceRange: [Math.round(averagePerActiveWeek * 0.9), Math.round(averagePerActiveWeek * 1.1)],
    kickRatio: current.kickTotal > 0 ? round1(current.kickTotal / current.meterTotal * 100) / 100 : null,
    previousAverage: previousAverage == null ? null : round1(previousAverage),
    previousWindowStart: previous.start, previousWindowEnd: previous.end,
  };
}

function recoveryRules(state, today) {
  const start = addDays(today, -(RECOVERY_WINDOW_DAYS - 1));
  const recovery = ordered(state.nutrition).filter(r => r.date >= start && r.date <= today);
  const rules = [];
  if (recovery.length >= RECOVERY_MIN_RECORDS) {
    const discomfort = recovery.filter(r => (r.discomfort || '').trim() && (r.discomfort || '').trim() !== '无');
    if (discomfort.length) rules.push({
      id: 'R-REC', level: 'adjustment', triggered: true,
      text: `近${RECOVERY_WINDOW_DAYS / 7}周${recovery.length}条恢复记录中${discomfort.length}条记录了疼痛/不适（${discomfort.map(r => r.date).join('、')}）。强度档位建议先降低并与教练沟通；具体安排由教练确认。`,
      sourceIds: discomfort.map(r => r.id),
      threshold: `近${RECOVERY_WINDOW_DAYS / 7}周≥${RECOVERY_MIN_RECORDS}条恢复记录且其中1条以上疼痛/不适非“无”`,
    });
    const recentSleepRecords = recovery.filter(r => typeof r.sleepHours === 'number' && Number.isFinite(r.sleepHours));
    const historical = ordered(state.nutrition).filter(r => r.date < start && typeof r.sleepHours === 'number' && Number.isFinite(r.sleepHours));
    if (recentSleepRecords.length >= SLEEP_MIN_RECORDS && historical.length >= SLEEP_MIN_RECORDS) {
      const recentMean = average(recentSleepRecords.map(r => r.sleepHours));
      const baseline = average(historical.map(r => r.sleepHours));
      if (baseline - recentMean >= SLEEP_DROP_HOURS) rules.push({
        id: 'R-SLEEP', level: 'adjustment', triggered: true,
        text: `近${RECOVERY_WINDOW_DAYS / 7}周平均总睡眠${recentMean.toFixed(1)}小时，低于本人此前记录均值${baseline.toFixed(1)}小时${SLEEP_DROP_HOURS}小时以上（仅与本人已录入记录比较）。已录入观察仅供参考，是否调整强度由教练确认。`,
        sourceIds: unique([...recentSleepRecords.map(r => r.id), ...historical.map(r => r.id)]),
        threshold: `近${RECOVERY_WINDOW_DAYS / 7}周≥${SLEEP_MIN_RECORDS}条含睡眠记录，且此前≥${SLEEP_MIN_RECORDS}条可作本人基线，均值下降≥${SLEEP_DROP_HOURS}小时`,
      });
    }
  }
  const rpeStart = addDays(today, -(VOLUME_WINDOW_DAYS - 1));
  const rpeRecords = ordered(state.trainings).filter(r => r.date >= rpeStart && r.date <= today && typeof r.rpe === 'number' && Number.isFinite(r.rpe));
  if (rpeRecords.length >= RPE_MIN_RECORDS && average(rpeRecords.map(r => r.rpe)) >= RPE_HIGH_THRESHOLD) rules.push({
    id: 'R-RPE', level: 'adjustment', triggered: true,
    text: `近${VOLUME_WINDOW_DAYS / 7}周${rpeRecords.length}条训练的主观用力感平均${round1(average(rpeRecords.map(r => r.rpe)))}（≥${RPE_HIGH_THRESHOLD}）。已录入观察显示用力偏高；强度安排由教练确认。`,
    sourceIds: rpeRecords.map(r => r.id),
    threshold: `近${VOLUME_WINDOW_DAYS / 7}周≥${RPE_MIN_RECORDS}条含RPE训练且均值≥${RPE_HIGH_THRESHOLD}`,
  });
  return { recovery, rpeRecords, rules };
}

export function planDimensions(state, now = new Date().toISOString()) {
  const today = validDate(now.slice(0, 10)) ? now.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const result = analysis(state);
  const volume = volumeDimension(state, today);
  const { recovery, rpeRecords, rules: adjustmentRules } = recoveryRules(state, today);
  const pb = best(state.swim);
  const goalWithSeconds = pb ? state.goals.filter(goal => /(?:<\s*|^)(\d+(?:\.\d+)?)\s*(?:s|秒)/.exec(goal.targetMetric || '')) : [];
  const observationRules = [
    {
      id: 'R-GOAL', level: 'observation', triggered: Boolean(pb && goalWithSeconds.length),
      text: pb && goalWithSeconds.length ? `已录入PB与${goalWithSeconds.length}条含秒数口径的个人目标可计算差距；阶段目标卡按当前差距更新，差距不是提速预测。` : '尚无可计算的PB与目标差距（缺PB或目标无秒数口径）。',
      sourceIds: unique([pb?.id, ...goalWithSeconds.map(goal => goal.id)]),
      threshold: '需要已录入PB，且个人目标原文含秒数口径',
    },
    {
      id: 'R-FOCUS', level: 'observation', triggered: result.focusEvidence?.kind === '已审核录像观察',
      text: result.focusEvidence?.kind === '已审核录像观察' ? '重点候选来自已审核录像观察（具备运动员确认、有效时间片段与审核人）。' : '尚无合规的已审核录像观察；重点候选仍来自最新成绩备注或训练反馈。',
      sourceIds: result.focusEvidence?.sourceIds || [],
      threshold: '需要1条通过审核条件校验的录像批注',
    },
    {
      id: 'R-VOL', level: 'adjustment', triggered: volume.status === 'ok' && volume.previousAverage != null && Math.abs(volume.averagePerActiveWeek - volume.previousAverage) / volume.previousAverage > VOLUME_CHANGE_RATIO,
      text: volume.status === 'ok' && volume.previousAverage != null && Math.abs(volume.averagePerActiveWeek - volume.previousAverage) / volume.previousAverage > VOLUME_CHANGE_RATIO
        ? `近${VOLUME_WINDOW_DAYS / 7}周实际周均泳程${volume.averagePerActiveWeek}m较上一窗口${volume.previousAverage}m变化超过±${Math.round(VOLUME_CHANGE_RATIO * 100)}%，参考区间已按新窗口重算；是否加量由教练确认。`
        : '近两个4周窗口的实际量变化未超过阈值或数据不足，训练量参考维持当前窗口。',
      sourceIds: volume.sourceIds,
      threshold: `两个${VOLUME_WINDOW_DAYS / 7}周窗口各≥${VOLUME_MIN_RECORDS}条且≥${VOLUME_MIN_WEEKS}周，周均变化>±${Math.round(VOLUME_CHANGE_RATIO * 100)}%`,
    },
    {
      id: 'R-EXEC', level: 'observation', triggered: false,
      text: '', sourceIds: [], threshold: `需要已确认计划课次作分母，且覆盖率<${COVERAGE_LOW_THRESHOLD}%`,
    },
    {
      id: 'R-GROWTH', level: 'observation', triggered: (state.growth || []).length > 0,
      text: (state.growth || []).length ? `已录入${state.growth.length}条身体测量；测量仅作记录展示，不用于推断。` : '尚无身体测量记录。',
      sourceIds: (state.growth || []).map(r => r.id),
      threshold: '—',
    },
  ];
  const confirmed = (state.plans || []).filter(p => p.status === '已确认' && (p.reviewedBy || '').trim() && p.startDate <= today && p.endDate >= today);
  let execRule = observationRules.find(rule => rule.id === 'R-EXEC');
  if (confirmed.length) {
    const summary = rangeSummary(state, confirmed.reduce((min, p) => p.startDate < min ? p.startDate : min, confirmed[0].startDate), confirmed.reduce((max, p) => p.endDate > max ? p.endDate : max, confirmed[0].endDate));
    execRule.triggered = summary.coverage != null && summary.coverage < COVERAGE_LOW_THRESHOLD;
    execRule.text = summary.coverage == null
      ? `当前周期有${confirmed.length}份确认计划，但尚未填写课次，覆盖率暂不计算。`
      : `当前周期计划训练课次覆盖率${summary.coverage}%${summary.coverage < COVERAGE_LOW_THRESHOLD ? `（<${COVERAGE_LOW_THRESHOLD}%），草稿已附执行偏差观察，课次频率参考供教练决定。` : '，未见明显执行偏差。'}`;
    execRule.sourceIds = unique(confirmed.flatMap(p => p.sourceIds || []));
  } else execRule.text = '当前日期没有适用的已确认计划，执行覆盖率暂不计算。';
  const rules = [...adjustmentRules, ...observationRules];
  return {
    generatedAt: now,
    today,
    period: {
      start: today, end: addDays(today, 27), weeks: 4,
      ranges: Array.from({ length: 4 }, (_, index) => ({ start: addDays(today, index * 7), end: addDays(today, index * 7 + 6) })),
    },
    dataRange: dataRange(state),
    focus: result.focus,
    volume,
    intensity: {
      status: recovery.length >= RECOVERY_MIN_RECORDS || rpeRecords.length >= RPE_MIN_RECORDS ? 'ok' : 'insufficient',
      recoveryWindowStart: addDays(today, -(RECOVERY_WINDOW_DAYS - 1)), recoveryWindowEnd: today,
      recoveryCount: recovery.length,
      rpeCount: rpeRecords.length,
      rpeAverage: rpeRecords.length ? round1(average(rpeRecords.map(r => r.rpe))) : null,
      warnings: rules.filter(rule => ['R-REC', 'R-SLEEP', 'R-RPE'].includes(rule.id)),
      sourceIds: unique([...recovery.map(r => r.id), ...rpeRecords.map(r => r.id)]),
      threshold: `需要近${RECOVERY_WINDOW_DAYS / 7}周≥${RECOVERY_MIN_RECORDS}条恢复记录，或近${VOLUME_WINDOW_DAYS / 7}周≥${RPE_MIN_RECORDS}条含RPE训练记录；未达标时强度仅展示已录入观察，不作安排建议。`,
    },
    rules,
  };
}

const pbKey = state => { const pb = best(state.swim); return pb ? `${pb.id}:${parseTime(pb.time)}` : ''; };

// Runs inside the same write transaction as the administrator's save. Never
// fabricates values: the draft only quotes computed references and the exact
// record ids they came from.
export function syncPlanDraft(previous, next, { now = new Date().toISOString(), triggeredByRecordId = null } = {}) {
  const evidenceTouched = EVIDENCE_COLLECTIONS.some(key => canonical(previous?.[key]) !== canonical(next[key]));
  if (!evidenceTouched) return { changed: false, reason: 'evidence-unchanged' };
  const existing = next.plans.find(p => p.id === PLAN_DRAFT_ID && p.status === '草稿');
  if (existing?.generatedBy?.manualEdited) return { changed: false, reason: 'manual-edited' };
  const result = analysis(next);
  if (existing?.generatedBy?.evidenceVersion === result.version) return { changed: false, reason: 'version-current' };
  if (!next.swim.length) {
    if (existing) {
      next.plans.splice(next.plans.indexOf(existing), 1);
      return { changed: true, removed: true };
    }
    return { changed: false, reason: 'no-scores' };
  }
  const dimensions = planDimensions(next, now);
  const pbChanged = pbKey(next) !== pbKey(previous || { swim: [] });
  const entry = {
    triggeredAt: now,
    evidenceVersion: result.version,
    rules: unique([...dimensions.rules.filter(rule => rule.triggered).map(rule => rule.id), ...(pbChanged ? ['R-PB'] : [])]),
  };
  const history = [...(existing?.generatedBy?.history || []), entry].slice(-DRAFT_HISTORY_LIMIT);
  const validated = validateRecord('plans', {
    title: '基于当前记录的4周提升计划草稿',
    startDate: dimensions.period.start,
    endDate: dimensions.period.end,
    focus: result.focus,
    status: '草稿',
    notes: '由平台依据已录入记录自动生成的草稿；课次与组表由教练填写，其中数值均为参考区间或已录入观察，不含虚构训练处方。',
    sessions: [],
    sourceIds: result.sourceIds,
    sourceVersion: result.version,
    generatedBy: {
      engine: PLAN_ENGINE_VERSION,
      evidenceVersion: result.version,
      triggeredByRecordId: triggeredByRecordId || '',
      generatedAt: now,
      manualEdited: false,
      dataRange: dimensions.dataRange,
      history,
    },
  }, existing || null);
  const record = { ...validated, id: PLAN_DRAFT_ID };
  if (existing) next.plans[next.plans.indexOf(existing)] = record;
  else next.plans.push(record);
  return { changed: true, record, dimensions };
}

// Client plan updates: the reserved draft slot stays a draft; manual edits stop
// automatic regeneration; human plan history keeps a bounded tail per plan.
export function commitPlanUpdate(data, planId, previous, record) {
  if (planId === PLAN_DRAFT_ID) {
    if (record.status !== '草稿') return { error: '草稿槽位计划须保持草稿状态；请先以此草稿另建正式计划，再由教练确认' };
    if (record.generatedBy) record.generatedBy = { ...record.generatedBy, manualEdited: true };
    return {};
  }
  data.planHistory ||= [];
  data.planHistory.push(structuredClone(previous));
  const seen = new Map();
  data.planHistory = data.planHistory.slice().reverse().filter(item => {
    const count = (seen.get(item.id) || 0) + 1;
    seen.set(item.id, count);
    return count <= PLAN_HISTORY_LIMIT;
  }).reverse();
  return {};
}
