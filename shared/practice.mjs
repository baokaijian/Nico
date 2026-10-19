import { ordered, latest, parseTime, validDate, timeLabel } from './domain.mjs';

// Parent-run practice loop. The platform never invents a weak point or a
// practice result: it only turns records the parent already entered into
// candidates, statistics and reminders. Insufficient data stays empty.
export const PRACTICE_ENGINE_VERSION = 'practice-v1';
export const HEATMAP_DAYS = 28;
export const STAGNANT_MIN_RECORDS = 3;
export const WEEK_DAYS = 7;

const addDays = (date, days) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const dayOfToday = now => validDate(String(now).slice(0, 10)) ? String(now).slice(0, 10) : new Date().toISOString().slice(0, 10);
// Monday-based week, same convention as the training-volume windows.
const weekStart = date => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const splitRefs = value => String(value || '').split(/[,，、\s]+/).filter(Boolean);
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}秒`;

function streakOf(dates, today) {
  const set = new Set(dates.filter(date => date <= today));
  if (!set.size) return { days: 0, start: '', end: '' };
  let end = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  if (!end) return { days: 0, start: '', end: '' };
  let start = end, days = 0;
  while (set.has(start)) { days++; start = addDays(start, -1); }
  return { days, start: addDays(start, 1), end };
}

export function practiceOverview(state, now = new Date().toISOString()) {
  const today = dayOfToday(now);
  const week = { start: weekStart(today), end: addDays(weekStart(today), WEEK_DAYS - 1) };
  const points = ordered(state.weakpoints || []);
  const checkins = ordered(state.checkins || []);
  const byPoint = new Map(points.map(point => [point.id, []]));
  for (const record of checkins) (byPoint.get(record.weakPointId) || []).push(record);
  const active = points.filter(point => point.status === '练习中');
  const inWeek = checkins.filter(record => record.date >= week.start && record.date <= week.end);
  const weekTimes = inWeek.filter(record => active.some(point => point.id === record.weakPointId)).reduce((sum, r) => sum + (r.times || 0), 0);
  const weekTarget = active.reduce((sum, point) => sum + (typeof point.targetPerWeek === 'number' ? point.targetPerWeek : 0), 0);
  const detailed = points.map(point => {
    const records = byPoint.get(point.id) || [];
    const dates = records.map(r => r.date);
    return {
      ...point,
      total: records.length,
      times: records.reduce((sum, r) => sum + (r.times || 0), 0),
      minutes: records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0) || null,
      lastDate: dates.at(-1) || '',
      streak: streakOf(dates, today),
      weekTimes: inWeek.filter(r => r.weakPointId === point.id).reduce((sum, r) => sum + (r.times || 0), 0),
      weekDays: new Set(inWeek.filter(r => r.weakPointId === point.id).map(r => r.date)).size,
      done: records.filter(r => r.quality === '按要求完成' || r.quality === '超出要求').length,
    };
  });
  const heatmap = Array.from({ length: HEATMAP_DAYS }, (_, index) => {
    const date = addDays(today, -(HEATMAP_DAYS - 1 - index));
    const times = checkins.filter(r => r.date === date).reduce((sum, r) => sum + (r.times || 0), 0);
    return { date, times, count: checkins.filter(r => r.date === date).length };
  });
  return {
    engine: PRACTICE_ENGINE_VERSION,
    today, week,
    points: detailed,
    active: detailed.filter(point => point.status === '练习中'),
    candidates: weakPointCandidates(state),
    weekTimes, weekTarget, weekDays: new Set(inWeek.map(r => r.date)).size,
    streak: streakOf(checkins.map(r => r.date), today),
    lastDate: checkins.map(r => r.date).at(-1) || '',
    total: checkins.length,
    heatmap,
    recent: [...checkins].reverse().slice(0, 20).map(record => ({ ...record, pointTitle: points.find(point => point.id === record.weakPointId)?.title || '（薄弱点已删除或未录入）' })),
  };
}

// Candidates are quoted from entered records only. Nothing is written to the
// library until the parent confirms one.
export function weakPointCandidates(state) {
  const existing = state.weakpoints || [];
  const takenTitles = new Set(existing.map(point => point.title.trim().toLowerCase()));
  const takenRefs = new Set(existing.flatMap(point => splitRefs(point.sourceRef)));
  const out = [];
  const feedback = latest((state.trainings || []).filter(record => record.focusSkills?.trim() || record.coachNotes?.trim()));
  if (feedback && !takenRefs.has(feedback.id)) out.push({
    id: `cand-training-${feedback.id}`,
    date: feedback.date,
    category: '技术动作',
    sourceType: '教练反馈原话',
    title: (feedback.focusSkills || '').trim() || `教练${feedback.date}反馈中的技术提示`,
    evidence: [feedback.focusSkills, feedback.coachNotes].filter(Boolean).join('；'),
    sourceRef: feedback.id,
    sourceIds: [feedback.id],
  });
  const media = state.media || [];
  for (const annotation of (state.annotations || []).filter(a => a.status === '已审核' && a.suggestion?.trim())) {
    if (takenRefs.has(annotation.id)) continue;
    const item = media.find(m => m.id === annotation.mediaId);
    out.push({
      id: `cand-annotation-${annotation.id}`,
      date: item?.date || '',
      category: '技术动作',
      sourceType: '已审核录像观察',
      title: annotation.suggestion.trim(),
      evidence: `观察：${annotation.observation || '未填写'}；证据限制：${annotation.limitation || '未填写'}`,
      sourceRef: annotation.id,
      sourceIds: [annotation.id, annotation.mediaId],
    });
  }
  const groups = new Map();
  for (const record of ordered(state.swim || [])) {
    if (parseTime(record.time) == null) continue;
    const key = [record.distance, record.stroke, record.poolLength].join(' · ');
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  for (const [key, records] of groups) {
    if (records.length < STAGNANT_MIN_RECORDS) continue;
    const best = records.reduce((pb, record) => !pb || parseTime(record.time) < parseTime(pb.time) ? record : pb, null);
    const recent = records.at(-1);
    if (!best || best.id === recent.id || takenRefs.has(recent.id)) continue;
    out.push({
      id: `cand-score-${recent.id}`,
      date: recent.date,
      category: '技术动作',
      sourceType: '成绩对比',
      title: `${key}：最近一次成绩未刷新该项目已录入最好成绩`,
      evidence: `最近${recent.date}为${recent.time}（${timeLabel(parseTime(recent.time))}），该项目已录入最好成绩为${best.time}（${best.date}），相差${signed(parseTime(recent.time) - parseTime(best.time))}。仅比较同一距离/泳姿/池长的已录入记录，不归因于任何动作。`,
      sourceRef: [recent.id, best.id].join(','),
      sourceIds: [recent.id, best.id],
    });
  }
  return out.filter(candidate => !takenTitles.has(candidate.title.trim().toLowerCase()));
}

// Capability growth, computed from entered scores and measurements only.
export function growthTimeline(state) {
  const groups = new Map();
  for (const record of ordered(state.swim || [])) {
    if (parseTime(record.time) == null) continue;
    const key = [record.distance, record.stroke, record.poolLength].join(' · ');
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  const projects = [...groups.entries()].map(([key, records]) => {
    const first = records[0], best = records.reduce((pb, record) => !pb || parseTime(record.time) < parseTime(pb.time) ? record : pb, null);
    const last = records.at(-1);
    return {
      key, count: records.length,
      first: { date: first.date, time: first.time, seconds: parseTime(first.time) },
      best: { date: best.date, time: best.time, seconds: parseTime(best.time) },
      last: { date: last.date, time: last.time, seconds: parseTime(last.time) },
      improved: parseTime(first.time) - parseTime(best.time),
      sinceLast: parseTime(last.time) - parseTime(best.time),
      start: first.date, end: last.date,
    };
  }).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const body = ordered(state.growth || []);
  const measure = field => {
    const values = body.filter(record => typeof record[field] === 'number' && Number.isFinite(record[field]));
    if (values.length < 2) return null;
    const first = values[0], last = values.at(-1);
    return { field, from: first.date, to: last.date, start: first[field], end: last[field], delta: Math.round((last[field] - first[field]) * 10) / 10, method: last.measurementMethod || '' };
  };
  return { projects, height: measure('height'), weight: measure('weight'), range: { start: projects.length ? projects.reduce((min, p) => p.start < min ? p.start : min, projects[0].start) : '', end: projects.length ? projects.reduce((max, p) => p.end > max ? p.end : max, projects[0].end) : '' } };
}
