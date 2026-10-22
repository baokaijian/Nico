import { validateGrowthInput, validateStoredGrowth, growthCollection } from './growth-model.ts';
import { validateGrowthHistory } from './growth-records.mjs';
import { PERFORMANCE_VERSION, TIME_FIELDS, VALIDITY_STATUSES, validTimeMs, formatMilliseconds, parseMilliseconds, normalizePerformanceRecord, performanceMilliseconds, performanceSeconds, validityLabel, eligiblePerformance } from './performance.ts';
import { TRAINING_STROKES, TRAINING_STATUSES, normalizeTraining, trainingSummary } from './training.ts';
import { parseScore, validatePrdRecord, validatePrdState, SCORE_DISTANCES, TEST_ITEMS } from './prd.mjs';
// Shared by the UI, API, reports and tests. Empty measurements stay empty.
// weakpoints / checkins are the parent-run practice loop: the parent decides what
// to work on (from coach feedback), then records each completed practice session.
export const COLLECTIONS = ['growth', 'swim', 'trainings', 'fitness', 'nutrition', 'goals', 'plans', 'annotations', 'media', 'weakpoints', 'checkins', 'trainingTemplates', 'skillDefinitions', 'skillAssessments', 'milestones'];
export const LEGACY_COLLECTIONS = ['growth', 'swim', 'trainings', 'fitness', 'nutrition', 'goals', 'plans', 'annotations', 'media'];
export const STANDARD_SOURCE = 'https://www.sport.gov.cn/rlzx/n5633/c28294142/part/28294152.pdf';
export const STANDARD_VERSION = '2025-01-01 / 2026-10-06复核';
export const WOMEN_50 = {
  自由泳: { '50m': { 二级: 31.5, 三级: 36 }, '25m': { 二级: 30.5, 三级: 34 } },
  仰泳: { '50m': { 二级: 38.5 }, '25m': { 二级: 36.2 } },
  蝶泳: { '50m': { 二级: 36.5 }, '25m': { 二级: 36.4 } },
  蛙泳: { '50m': { 二级: 41 }, '25m': { 二级: 40 } },
};
const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });
const number = (key, label, min = 0, max = 100000, extra = {}) => ({ key, label, type: 'number', min, max, ...extra });
const select = (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra });
const date = { key: 'date', label: '日期', type: 'date', required: true };
const notes = text('notes', '备注 / 原始观察', { type: 'textarea' });
const method = text('measurementMethod', '测量方法 / 器材');
const recorder = text('recordedBy', '记录者');
export const FIELDS = {
  // Structured growth fields are validated by the shared typed contract.
  skillDefinitions: [], skillAssessments: [], milestones: [],
  swim: [date, text('trainingId', '关联本次训练'), select('distance', '测试 / 比赛长度', SCORE_DISTANCES, { required: true }), select('stroke', '泳姿', ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳', '打腿'], { required: true }), select('poolLength', '池长', ['25m', '50m', '其他'], { required: true }), text('time', '成绩（分:秒:百分秒，如00:56:17）', { required: true }), select('startType', '出发方式', ['跳台', '蹬壁', '水中', '未知']), select('timingMethod', '计时方式', ['自动计时', '手动计时', '未知']), select('recordType', '记录性质', ['训练', '比赛', '测试', '未知']), select('validityStatus', '有效性（仅有效成绩计入PB）', VALIDITY_STATUSES), text('validityNote', '有效性依据 / 失格说明'), select('testItem', '测试项目（固定选项）', TEST_ITEMS), text('location', '测试 / 比赛地点'), text('testedBy', '测试人员'), text('ageGroup', '比赛年龄组'), text('team', '代表队伍'), text('competitionSession', '比赛场次'), select('isFinal', '是否决赛', ['否', '是'], { boolean: true }), number('preliminaryRank', '预赛排名（决赛时填写）', 1, 100000, { integer: true }), text('eventName', '赛事 / 比赛项目名称'), text('heat', '比赛组别'), number('lane', '比赛道次', 1, 100, { integer: true }), text('previousTime', '上一次成绩（分:秒:百分秒）'), number('rank', '测试 / 比赛排名', 1, 100000, { integer: true }), text('winnerTime', '第一名成绩（分:秒:百分秒）'), text('task', '测试任务与器材'), text('certificate', '等级证书 / 凭证（如有）'), recorder, notes],
  growth: [date, number('height', '身高（cm）', 20, 250), number('armLength', '臂长（cm，测量口径须确认）', 1, 280), number('armSpan', '臂展（cm，历史字段）', 20, 280), number('weight', '体重（kg）', 1, 250), number('handLength', '手长（cm）', 1, 40), number('handWidth', '手宽（cm）', 1, 30), number('footLength', '脚长（cm）', 1, 50), number('sitAndReach', '坐位体前屈（cm）', -50, 100), method, recorder, notes],
  trainings: [date, text('session', '课次名称'), select('entryMode', '录入方式', ['快速', '训练组']), select('stroke', '泳姿', TRAINING_STROKES), select('completionStatus', '实际完成情况', TRAINING_STATUSES), text('plannedSessionId', '关联计划课次ID'), number('plannedSessionVersion', '关联计划版本', 1, 1000000, { integer: true }), text('templateId', '使用的模板ID'), number('templateVersion', '使用的模板版本', 1, 1000000, { integer: true }), text('copiedFromId', '复制来源训练ID'), number('plannedMeters', '参考距离（非实际）', 0, 50000), number('plannedDurationMinutes', '参考时长（非实际）', 0, 600), number('durationMinutes', '实际时长（分钟）', 0, 600), number('totalMeters', '实际总泳程（m）', 0, 50000), number('kickMeters', '其中打腿（m）', 0, 50000), text('trainingType', '训练内容'), text('intensity', '强度说明（教练原话）'), text('focusSkills', '本次技术提示'), number('rpe', '主观用力感（1–10）', 1, 10, { integer: true }), number('completionRate', '完成度（0–100%）', 0, 100), text('feeling', '课后感受'), text('discomfort', '疼痛 / 不适（没有请明确填无）'), text('coachNotes', '教练原话', { type: 'textarea' }), recorder, notes],
  trainingTemplates: [text('title', '模板名称', { required: true }), select('entryMode', '录入方式', ['快速', '训练组']), select('stroke', '泳姿', TRAINING_STROKES), text('trainingType', '训练内容'), number('plannedMeters', '参考距离（非实际）', 0, 50000), number('plannedDurationMinutes', '参考时长（非实际）', 0, 600), notes],
  fitness: [date, number('standingJump', '立定跳远（cm）', 0, 400), number('plankSeconds', '平板支撑（秒）', 0, 3600), number('sitAndReach', '坐位体前屈（cm）', -50, 100), text('shoulderFlex', '肩关节活动观察'), text('ankleFlex', '踝关节活动观察'), number('shuttleRun', '折返跑（秒）', 0.01, 600), method, recorder, notes],
  nutrition: [date, number('sleepHours', '总睡眠（小时）', 0, 24), text('bedtime', '入睡时间'), text('appetite', '食欲'), text('fatigue', '疲惫感'), text('discomfort', '疼痛 / 不适'), text('willingness', '训练意愿'), text('preMeal', '实际课前饮食'), text('postMeal', '实际课后饮食'), number('waterMl', '实际饮水量（ml，可不填）', 0, 15000), number('morningPulse', '晨脉（次/分，可不填）', 20, 250, { integer: true }), number('recoveryScore', '个人恢复感受（1–5，可不填）', 1, 5, { integer: true }), ...['calciumTaken', 'ironTaken', 'zincTaken'].map((key, i) => select(key, ['钙补充剂', '铁补充剂', '锌补充剂'][i], ['未服用', '按既有专业建议服用'], { boolean: true })), text('supplementAdvice', '既有专业建议、产品及实际用量'), recorder, notes],
  goals: [text('title', '目标名称', { required: true }), text('category', '类别'), text('targetMetric', '个人目标'), { key: 'deadline', label: '个人目标复核日期（不是已确认赛程）', type: 'date' }, select('status', '状态', ['待确认', '进行中', '已达成', '暂停']), number('currentProgress', '手动填写的进度（可不填）', 0, 100), text('ruleSource', '规则 / 赛事来源'), text('reviewedBy', '确认人'), notes],
  plans: [text('title', '计划名称', { required: true }), { key: 'startDate', label: '周期开始', type: 'date', required: true }, { key: 'endDate', label: '周期结束', type: 'date', required: true }, text('focus', '一个主要技术重点', { required: true }), text('reviewedBy', '确认人（家长依据教练反馈确认）'), select('status', '审核状态', ['草稿', '已确认'], { required: true }), notes],
  annotations: [text('mediaId', '素材ID', { required: true }), text('athleteIdentity', '运动员 / 泳道确认'), number('startSecond', '片段开始（秒）', 0, 86400, { required: true }), number('endSecond', '片段结束（秒）', 0, 86400, { required: true }), text('observation', '可见事实', { required: true, type: 'textarea' }), text('limitation', '证据限制'), text('suggestion', '下一次练习方向（待审核）', { type: 'textarea' }), text('recordId', '关联成绩 / 训练ID'), text('reviewedBy', '审核人'), select('status', '审核状态', ['草稿', '已审核'], { required: true })],
  media: [date, text('title', '标题', { required: true }), text('description', '原始说明（与录像批注分开）', { type: 'textarea' }), text('category', '分类'), text('recordId', '关联成绩 / 训练ID')],
  // Practised by the parent at home or before/after training; never invented by the platform.
  weakpoints: [date, text('title', '薄弱点（一句话，如“转身后蹬壁不充分”）', { required: true }), select('category', '类别', ['技术动作', '出发与转身', '打腿与腿法', '体能', '节奏与配合', '心理与习惯', '其他'], { required: true }), select('sourceType', '来源', ['教练反馈原话', '已审核录像观察', '成绩对比', '家长观察', '平台建议待确认', '技能评估'], { required: true }), text('sourceRef', '来源记录ID（多个用逗号分隔，可留空）'), text('evidence', '依据原文 / 观察（照录，不改写）', { type: 'textarea' }), number('targetPerWeek', '每周练习目标次数（家长填写，可不填）', 1, 21, { integer: true }), text('drillHint', '练习方式提示（照录教练建议或家长安排，可留空）', { type: 'textarea' }), select('status', '状态', ['待确认', '练习中', '已改善', '暂停'], { required: true }), recorder, notes],
  checkins: [date, text('weakPointId', '薄弱点ID', { required: true }), number('times', '本次完成次数 / 组数（实际填写，未完成可填0）', 0, 200, { integer: true }), number('durationMinutes', '练习时长（分钟，可不填）', 0, 600), select('quality', '完成质量（家长观察）', ['未完成', '部分完成', '按要求完成', '超出要求']), text('childFeeling', '孩子主观感受（原话，可不填）'), notes, recorder],
};
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export const parseTime = parseScore;
export const timeLabel = seconds => seconds == null ? '未记录' : formatMilliseconds(Math.round(seconds * 1000));
export function validateRecord(collection, input, previous = null) {
  if (['skillDefinitions', 'skillAssessments', 'milestones'].includes(collection) || collection === 'goals' && (input?.modelVersion === 1 || previous?.modelVersion === 1)) return validateGrowthInput(collection, input, previous);
  const fields = FIELDS[collection];
  if (!fields || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('记录格式无效');
  const result = { ...previous };
  if (collection === 'swim') {
    input = { ...input };
    for (const field of TIME_FIELDS) {
      const msKey = `${field}Ms`;
      if (Object.hasOwn(input, msKey)) {
        result[msKey] = input[msKey]; delete result[`${field}Input`];
        if (input[field] === undefined) input[field] = formatMilliseconds(input[msKey]);
      } else if (Object.hasOwn(input, field) && input[field] !== previous?.[field]) {
        delete result[msKey]; delete result[`${field}Input`];
      }
    }
  }
  const training = ['trainings', 'trainingTemplates'].includes(collection);
  const allowed = new Set([...fields.map(f => f.key), 'sessions', 'sourceIds', 'sourceVersion', 'generatedBy', ...(training ? ['sets', 'clientRequestId', ...(collection === 'trainings' ? ['mediaIds'] : [])] : []), ...(['swim', 'media', 'weakpoints', 'checkins'].includes(collection) ? ['clientRequestId'] : []), ...(collection === 'swim' ? TIME_FIELDS.map(key => `${key}Ms`) : [])]);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new Error(`不支持的字段：${key}`);
  for (const field of fields) {
    if (previous && input[field.key] === undefined) continue;
    const value = input[field.key];
    const empty = value === '' || value == null;
    if (empty && field.required) throw new Error(`请填写${field.label}`);
    if (field.type === 'number') {
      if (empty) { result[field.key] = null; continue; }
      if ((typeof value !== 'number' && typeof value !== 'string') || typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error(`${field.label}须为有效数值`);
      const n = Number(value);
      if (!Number.isFinite(n) || n < field.min || n > field.max || field.integer && !Number.isInteger(n)) throw new Error(`${field.label}须在${field.min}–${field.max}范围内${field.integer ? '并为整数' : ''}`);
      result[field.key] = n;
    } else if (field.boolean) {
      if (empty) result[field.key] = null;
      else if (value === true || value === false) result[field.key] = value;
      else if (field.options.includes(value)) result[field.key] = value === field.options[1];
      else throw new Error(`${field.label}状态无效`);
    } else {
      if (!empty && typeof value !== 'string') throw new Error(`${field.label}格式无效`);
      const s = empty ? '' : value.trim();
      if (field.required && !s) throw new Error(`请填写${field.label}`);
      if (s.length > 4000) throw new Error(`${field.label}过长`);
      if (field.type === 'date' && s && !validDate(s)) throw new Error(`${field.label}不是有效日期`);
      if (field.type === 'select' && s && !field.options.includes(s) && s !== previous?.[field.key]) throw new Error(`${field.label}选项无效`);
      result[field.key] = s;
    }
  }
  if (collection === 'swim') {
    if (!/^\d{1,4}m$/.test(result.distance) || parseInt(result.distance) < 1 || parseInt(result.distance) > 5000) throw new Error('距离须填写1–5000米范围，如25m');
    normalizePerformanceRecord(result, true);
  }
  if (training) {
    result.sets = input.sets !== undefined ? input.sets : previous?.sets ?? [];
    normalizeTraining(result, collection === 'trainingTemplates');
    if (collection === 'trainingTemplates') result.version = (previous?.version || 0) + 1;
    if (collection === 'trainings') {
      const ids = input.mediaIds !== undefined ? input.mediaIds : previous?.mediaIds ?? [];
      if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('训练关联影像ID无效或重复');
      result.mediaIds = ids;
      if (result.kickMeters != null && (result.totalMeters == null || result.kickMeters > result.totalMeters)) throw new Error('打腿泳程不能大于实际总泳程，需同时填写总泳程');
    }
  }
  if (collection === 'nutrition' && [result.calciumTaken, result.ironTaken, result.zincTaken].includes(true) && !result.supplementAdvice) throw new Error('请记录既有专业建议、产品及实际用量');
  if (collection === 'weakpoints' && result.sourceRef) {
    const refs = String(result.sourceRef).split(/[,，、\s]+/).filter(Boolean);
    if (!refs.length || !refs.every(id => /^[A-Za-z0-9_-]{1,64}$/.test(id))) throw new Error('来源记录ID格式无效，请参考提示用逗号分隔');
  }
  if (collection === 'annotations' && (result.endSecond < result.startSecond || result.status === '已审核' && !result.reviewedBy)) throw new Error('片段结束须不早于开始；已审核须填写审核人');
  if (collection === 'plans') {
    if (result.endDate < result.startDate || result.status === '已确认' && !result.reviewedBy) throw new Error('周期结束须不早于开始；已确认须填写确认人（家长依据教练反馈确认）');
    result.sessions = validateSessions(input.sessions !== undefined ? input.sessions : previous?.sessions ?? [], result);
    result.version = (previous?.version || 0) + 1;
    if (input.sourceIds !== undefined) {
      if (!Array.isArray(input.sourceIds) || !input.sourceIds.every(s => typeof s === 'string')) throw new Error('来源记录格式无效');
      result.sourceIds = input.sourceIds;
    }
    if (input.sourceVersion !== undefined) result.sourceVersion = String(input.sourceVersion).slice(0, 100);
    if (input.generatedBy !== undefined || previous?.generatedBy !== undefined) {
      result.generatedBy = validateGeneratedBy(input.generatedBy !== undefined ? input.generatedBy : previous.generatedBy);
    }
  }
  if (['growth', 'swim'].includes(collection)) validatePrdRecord(collection, result, { canonicalize: true });
  return result;
}
// Metadata the deterministic plan engine attaches to the reserved draft slot.
// It carries provenance only; removing it never changes a coach's own plan.
function validateGeneratedBy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('计划生成元数据格式无效');
  const allowed = new Set(['engine', 'evidenceVersion', 'triggeredByRecordId', 'generatedAt', 'manualEdited', 'dataRange', 'history']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`计划生成元数据不支持字段：${key}`);
  if (typeof value.engine !== 'string' || !value.engine.trim() || value.engine.length > 100) throw new Error('计划生成引擎标识无效');
  if (typeof value.evidenceVersion !== 'string' || !value.evidenceVersion || value.evidenceVersion.length > 100) throw new Error('计划依据版本无效');
  if (value.triggeredByRecordId != null && typeof value.triggeredByRecordId !== 'string') throw new Error('计划触发记录无效');
  if (typeof value.generatedAt !== 'string' || !Number.isFinite(Date.parse(value.generatedAt))) throw new Error('计划生成时间无效');
  if (value.manualEdited != null && typeof value.manualEdited !== 'boolean') throw new Error('计划手动编辑标记无效');
  if (value.dataRange !== undefined) {
    if (!value.dataRange || typeof value.dataRange !== 'object' || Array.isArray(value.dataRange)) throw new Error('计划数据范围格式无效');
    for (const key of Object.keys(value.dataRange)) if (!['start', 'end', 'counts'].includes(key)) throw new Error(`计划数据范围不支持字段：${key}`);
    for (const key of ['start', 'end']) if (value.dataRange[key] !== '' && !validDate(value.dataRange[key])) throw new Error('计划数据范围日期无效');
    if (value.dataRange.counts !== undefined) {
      if (typeof value.dataRange.counts !== 'object' || Array.isArray(value.dataRange.counts)) throw new Error('计划数据范围计数格式无效');
      for (const [key, count] of Object.entries(value.dataRange.counts)) if (!/^[a-z]{1,20}$/.test(key) || !Number.isInteger(count) || count < 0) throw new Error('计划数据范围计数无效');
    }
  }
  if (value.history !== undefined) {
    if (!Array.isArray(value.history) || value.history.length > 50) throw new Error('计划触发历史格式无效');
    for (const entry of value.history) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('计划触发历史条目无效');
      if (typeof entry.triggeredAt !== 'string' || !Number.isFinite(Date.parse(entry.triggeredAt))) throw new Error('计划触发历史时间无效');
      if (typeof entry.evidenceVersion !== 'string' || !entry.evidenceVersion || entry.evidenceVersion.length > 100) throw new Error('计划触发历史版本无效');
      if (!Array.isArray(entry.rules) || entry.rules.some(id => typeof id !== 'string' || !/^R-[A-Z]+$/.test(id))) throw new Error('计划触发历史规则无效');
    }
  }
  return structuredClone(value);
}
export function validateSessions(sessions, plan) {
  if (!Array.isArray(sessions) || sessions.length > 100) throw new Error('课次格式无效');
  const numeric = value => typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value);
  const result = sessions.map((s, index) => {
    if (!validDate(s.date) || s.date < plan.startDate || s.date > plan.endDate) throw new Error('课次日期须在计划周期内');
    if (!['训练', '休息', '待确认'].includes(s.type)) throw new Error('请选择课次类型');
    if (!Array.isArray(s.sets) || s.sets.length > 50) throw new Error('训练组表格式无效');
    if (s.durationMinutes !== '' && s.durationMinutes != null && (!numeric(s.durationMinutes) || Number(s.durationMinutes) < 0 || Number(s.durationMinutes) > 600)) throw new Error('计划时长须在0–600分钟范围内');
    if (s.poolLength && !['25m', '50m'].includes(s.poolLength) || s.startType && !['跳台', '蹬壁', '水中', '未知'].includes(s.startType)) throw new Error('课次池长或出发方式无效');
    const sets = s.sets.map(g => {
      if (!g.task || typeof g.task !== 'string' || [g.repeats, g.distance, g.restSeconds].some(v => !numeric(v)) || !Number.isInteger(Number(g.repeats)) || Number(g.repeats) < 1 || Number(g.repeats) > 100 || Number(g.distance) <= 0 || Number(g.distance) > 1500 || Number(g.restSeconds) < 0 || Number(g.restSeconds) > 3600) throw new Error('组表须填写任务、有效次数、距离与休息秒数');
      return { task: String(g.task || '').slice(0, 500), repeats: Number(g.repeats), distance: Number(g.distance), restSeconds: Number(g.restSeconds) };
    });
    if (s.type === '休息' && sets.length) throw new Error('休息日不应包含训练组表');
    return { id: String(s.id || `session-${index + 1}`), date: s.date, type: s.type, title: String(s.title || '').slice(0, 200), poolLength: s.poolLength || '', startType: s.startType || '', durationMinutes: s.durationMinutes === '' || s.durationMinutes == null ? null : Number(s.durationMinutes), sets, totalMeters: sets.length ? sets.reduce((n, g) => n + g.repeats * g.distance, 0) : s.type === '休息' ? 0 : null };
  });
  if (new Set(result.map(s => s.id)).size !== result.length) throw new Error('课次ID重复，请核对组表');
  return result;
}
export function emptyState() {
  return { ...Object.fromEntries(COLLECTIONS.map(key => [key, []])), profile: { name: 'Nico', sex: '', birthDate: '' }, publishing: { swimIds: [], mediaIds: [], story: '', confirmedBy: '', confirmedAt: '' }, trash: [] };
}
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('数据文件格式无效，禁止用空库覆盖');
  if (raw.performanceSchemaVersion !== undefined && raw.performanceSchemaVersion !== PERFORMANCE_VERSION) throw new Error('不支持的成绩结构版本');
  if (raw.schemaVersion !== undefined && ![1, 2].includes(raw.schemaVersion)) throw new Error('不支持的数据结构版本，请勿覆盖事实库');
  const state = { ...emptyState(), ...raw };
  for (const key of COLLECTIONS) {
    if (!Array.isArray(state[key]) || state[key].some(r => !r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) || new Set(state[key].map(r => r.id)).size !== state[key].length) throw new Error(`数据集合${key}格式或ID无效`);
    for (const record of state[key]) validateStoredFields(key, record);
  }
  if (!state.profile || typeof state.profile !== 'object' || typeof state.profile.name !== 'string' || !['', '女', '男', '其他'].includes(state.profile.sex) || state.profile.birthDate && !validDate(state.profile.birthDate)) throw new Error('档案格式无效');
  if (!state.publishing || !['swimIds', 'mediaIds'].every(k => Array.isArray(state.publishing[k]) && state.publishing[k].every(id => typeof id === 'string')) || typeof state.publishing.story !== 'string') throw new Error('发布范围格式无效');
  if (!Array.isArray(state.trash) || state.trash.some(t => !t || !COLLECTIONS.includes(t.collection) || typeof t.record?.id !== 'string' || !t.record.id)) throw new Error('回收站格式无效');
  for (const item of state.trash) validateStoredFields(item.collection, item.record);
  if (state.planHistory !== undefined && !Array.isArray(state.planHistory)) throw new Error('计划历史格式无效');
  for (const media of state.media) if (media.duration != null && (typeof media.duration !== 'number' || !Number.isFinite(media.duration) || media.duration <= 0)) throw new Error('素材时长格式无效');
  for (const plan of [...state.plans, ...(state.planHistory || [])]) {
    if (!Number.isInteger(plan.version) || plan.version < 1) throw new Error('计划版本格式无效');
    validateRecord('plans', { ...Object.fromEntries(FIELDS.plans.map(f => [f.key, plan[f.key]])), sessions: plan.sessions, ...(plan.generatedBy !== undefined ? { generatedBy: plan.generatedBy } : {}) });
    if (!Array.isArray(plan.sessions)) throw new Error('计划课次格式无效');
  }
  for (const annotation of state.annotations) validateRecord('annotations', Object.fromEntries(FIELDS.annotations.map(f => [f.key, annotation[f.key]])));
  for (const record of [...state.swim, ...state.trash.filter(item => item.collection === 'swim').map(item => item.record)]) {
    if (record.validityStatus && !VALIDITY_STATUSES.includes(record.validityStatus)) throw new Error('成绩有效性状态无效');
    if (state.performanceSchemaVersion === PERFORMANCE_VERSION && (!validTimeMs(record.timeMs) || !VALIDITY_STATUSES.includes(record.validityStatus))) throw new Error('毫秒成绩迁移不完整');
    if (record.timeMs !== undefined) normalizePerformanceRecord(record);
  }
  validateGrowthHistory(state);
  if (state.schemaVersion === 2) validatePrdState(state);
  return state;
}
function validateStoredFields(collection, record) {
  if (growthCollection(collection, record)) { validateStoredGrowth(collection, record); return; }
  for (const field of FIELDS[collection]) {
    const value = record[field.key];
    if (value == null || value === '') continue;
    if (field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max || field.integer && !Number.isInteger(value)) throw new Error(`数据集合${collection}的${field.label}不是范围内的有效实测数值`);
    } else if (field.boolean) {
      if (typeof value !== 'boolean') throw new Error(`数据集合${collection}的${field.label}状态无效`);
    } else if (typeof value !== 'string') throw new Error(`数据集合${collection}的${field.label}不是文字`);
    if (field.type === 'date' && !validDate(value)) throw new Error(`数据集合${collection}的日期无效`);
  }
  if (['trainings', 'trainingTemplates'].includes(collection) && record.entryMode !== undefined) {
    const normalized = normalizeTraining(structuredClone(record), collection === 'trainingTemplates');
    if (record.entryMode === '训练组' && collection === 'trainings' && (record.totalMeters !== normalized.totalMeters || record.kickMeters !== normalized.kickMeters)) throw new Error('训练组实际距离与保存的汇总不一致，禁止覆盖');
    if (collection === 'trainingTemplates' && (!Number.isInteger(record.version) || record.version < 1 || !record.title)) throw new Error('训练模板版本或名称无效');
  }
  if (collection === 'trainings' && record.mediaIds !== undefined && (!Array.isArray(record.mediaIds) || record.mediaIds.length > 100 || record.mediaIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) || new Set(record.mediaIds).size !== record.mediaIds.length)) throw new Error('训练关联影像格式无效');
}
export const ordered = (records = []) => [...records].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
export const latest = records => ordered(records).at(-1) || null;
export function eventRecords(records, distance = '50m', stroke = '自由泳', poolLength = '50m') {
  return ordered(records).filter(r => r.distance === distance && r.stroke === stroke && r.poolLength === poolLength && eligiblePerformance(r));
}
export function best(records, distance = '50m', stroke = '自由泳', poolLength = '50m') {
  return eventRecords(records, distance, stroke, poolLength).reduce((pb, r) => !pb || performanceMilliseconds(r) < performanceMilliseconds(pb) ? r : pb, null);
}
export function fingerprint(data) {
  let hash = 2166136261;
  // Postgres jsonb and local JSON can return different object-key orders.
  const canonical = JSON.stringify(data, (_, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  for (const char of canonical) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `记录版本-${hash.toString(16).padStart(8, '0')}`;
}
export function planContext(state, day, version = analysis(state).version) {
  if (!validDate(day)) throw new Error('查看计划的日期无效');
  const candidates = state.plans.filter(p => p.status === '已确认' && p.reviewedBy?.trim() && p.startDate <= day && p.endDate >= day);
  const stale = candidates.filter(p => p.sourceVersion && p.sourceVersion !== version);
  // Overlapping confirmations need a human choice, rather than array-order priority.
  const current = candidates.length === 1 && !stale.length ? candidates[0] : null;
  const message = candidates.length > 1 ? '当前周期有多份确认计划，请家长明确采用哪一份（可先与教练核对）。'
    : stale.length ? '当前周期计划的依据已更新，请家长复核后保存新版本。'
      : current && !current.sourceVersion ? '本周期为手动确认计划，尚未关联分析依据。'
        : !current ? '当前日期没有适用的已确认计划；以下为待确认建议。' : '';
  return { day, current, candidates, stale, message };
}
export function analysis(state) {
  const records = eventRecords(state.swim);
  const pb = best(state.swim);
  const recent = latest(state.swim);
  const facts = [];
  if (pb) facts.push({ kind: '事实', text: `50米自由泳（50米池）已录入PB ${timeLabel(performanceSeconds(pb))}，日期${pb.date}。`, sourceIds: [pb.id] });
  if (records.length > 1) facts.push({ kind: '计算', text: `从首条${timeLabel(performanceSeconds(records[0]))}到已录入PB，共缩短${((performanceMilliseconds(records[0]) - performanceMilliseconds(pb)) / 1000).toFixed(3)}秒。计时与出发条件未补齐时，不能归因于某个训练动作。`, sourceIds: [records[0].id, pb.id] });
  if (recent && recent.id !== pb?.id) facts.push({ kind: '事实', text: `最新${recent.distance}${recent.stroke}为${timeLabel(performanceSeconds(recent))}（${recent.poolLength}池，${recent.date}，${validityLabel(recent)}），与主项PB分别展示。`, sourceIds: [recent.id] });
  const unverified = state.swim.filter(record => validityLabel(record) === '未核验');
  if (unverified.length) facts.push({ kind: '待核验', text: `${unverified.length}条成绩尚未确认有效性，保留在历史中，不计入PB、改善率或有效成绩趋势。`, sourceIds: unverified.map(record => record.id) });
  if (recent?.notes) facts.push({ kind: '原始记录', text: recent.notes, sourceIds: [recent.id] });
  if (pb) for (const goal of state.goals) {
    const threshold = /(?:<\s*|^)(\d+(?:\.\d+)?)\s*(?:s|秒)/.exec(goal.targetMetric || '');
    if (threshold) {
      const targetMs = parseMilliseconds(threshold[1]);
      const target = targetMs === null ? null : targetMs / 1000, gapMs = targetMs === null ? 0 : performanceMilliseconds(pb) - targetMs;
      const gap = gapMs / 1000;
      if (gap > 0) facts.push({ kind: '计算', text: `原始个人目标${target.toFixed(2)}秒与当前长池50米PB相差${gap.toFixed(2)}秒（约${(gapMs / performanceMilliseconds(pb) * 100).toFixed(1)}%）。这是差距，不是提速预测；对应赛事与晋升条件待确认。`, sourceIds: [pb.id, goal.id] });
    }
    const stretch = /(\d+)\s*[-~～]\s*(\d+)秒/.exec(goal.targetMetric || '');
    if (stretch && parseMilliseconds(stretch[2]) !== null && performanceMilliseconds(pb) > parseMilliseconds(stretch[2])) facts.push({ kind: '待验证建议', text: `原始目标的${stretch[1]}–${stretch[2]}秒范围尚未由当前PB达到；已突破1分钟与达到该范围应分别记录。`, sourceIds: [pb.id, goal.id] });
    if (/国家三级/.test(`${goal.title} ${goal.targetMetric}`) && /39\.50/.test(`${goal.title} ${goal.targetMetric}`)) facts.push({ kind: '待验证建议', text: '原始目标中的国家三级39.50秒口径需纠正。女子50米自由泳现行参考为长池36.00秒、短池34.00秒；先确认档案性别及赛事条件，原文保留。', sourceIds: [goal.id] });
  }
  for (const [key, name] of [['trainings', '水上训练'], ['fitness', '体能'], ['nutrition', '恢复'], ['checkins', '薄弱点打卡']]) facts.push({ kind: '事实', text: `${name}已录入${state[key].length}条${state[key].length ? '。' : '，尚不能评估实际状态；未录入不代表未训练。'}`, sourceIds: state[key].map(r => r.id) });
  const practising = (state.weakpoints || []).filter(point => point.status === '练习中');
  if ((state.weakpoints || []).length) facts.push({ kind: '事实', text: `薄弱点已录入${state.weakpoints.length}条，其中练习中${practising.length}条；薄弱点由家长依据教练反馈、已审核录像观察或已录入成绩确认，平台只提示候选、不自动写入。`, sourceIds: (state.weakpoints || []).map(point => point.id) });
  const growth = ordered(state.growth);
  if (growth.length > 1) {
    const a = growth.at(-2), b = growth.at(-1);
    const down = [['handWidth', '手宽'], ['footLength', '脚长']].filter(([key]) => a[key] != null && b[key] != null && b[key] < a[key]);
    if (down.length) facts.push({ kind: '待验证建议', text: `${down.map(([, name]) => name).join('、')}两次测量下降，先核对测量方法和录入，不据此推断生长异常或竞技天赋。`, sourceIds: [a.id, b.id] });
  }
  const training = latest(state.trainings), recovery = latest(state.nutrition);
  const feedback = latest(state.trainings.filter(r => r.focusSkills?.trim() || r.coachNotes?.trim()));
  if (training) facts.push({ kind: '事实', text: `最近训练记录为${training.date}；实际时长${training.durationMinutes == null ? '未填' : `${training.durationMinutes}分钟`}，泳程${training.totalMeters == null ? '未填' : `${training.totalMeters}m`}。`, sourceIds: [training.id] });
  if (feedback) facts.push({ kind: '原始意见', text: `${feedback.date}的训练技术提示：${feedback.focusSkills || '未填'}；教练原话：${feedback.coachNotes || '未填'}。原话需在现场核对适用条件。`, sourceIds: [feedback.id] });
  if (recovery) facts.push({ kind: '原始记录', text: `最近恢复记录为${recovery.date}；总睡眠${recovery.sleepHours == null ? '未填' : `${recovery.sleepHours}小时`}，疲惫感：${recovery.fatigue || '未填'}；不适：${recovery.discomfort || '未填'}；训练意愿：${recovery.willingness || '未填'}。未填项不代表状态正常。`, sourceIds: [recovery.id] });
  const videos = ordered(state.media.filter(m => m.type === 'video'));
  const reviewed = state.annotations.filter(a => {
    const media = videos.find(m => m.id === a.mediaId);
    return media && a.status === '已审核' && a.reviewedBy?.trim() && a.athleteIdentity?.trim()
      && a.observation?.trim() && Number.isFinite(a.startSecond) && Number.isFinite(a.endSecond)
      && a.startSecond >= 0 && a.endSecond > a.startSecond && (media.duration == null || a.endSecond <= media.duration)
      && (!a.recordId || [...state.swim, ...state.trainings].some(r => r.id === a.recordId));
  }).sort((a, b) => {
    const key = x => `${videos.find(m => m.id === x.mediaId).date}/${x.updatedAt || x.createdAt || ''}/${x.id}`;
    return key(a).localeCompare(key(b));
  });
  for (const a of reviewed) facts.push({ kind: '已审核观察', text: `${videos.find(m => m.id === a.mediaId).title}，${a.startSecond}–${a.endSecond}秒；运动员/泳道：${a.athleteIdentity}；观察：${a.observation}；限制：${a.limitation || '未填写'}；审核人：${a.reviewedBy}。`, sourceIds: [a.id, a.mediaId, ...(a.recordId ? [a.recordId] : [])] });
  facts.push({ kind: '事实', text: `已录入视频${videos.length}段；具备运动员确认、有效时间片段和审核人的批注${reviewed.length}条。其余批注不作为个体技术分析依据。`, sourceIds: [...videos.map(m => m.id), ...state.annotations.map(a => a.id)] });
  const candidates = [
    ...(recent?.notes ? [{ date: recent.date, kind: '原始成绩备注', text: recent.notes, sourceIds: [recent.id], focus: '请家长核对最新成绩备注（可结合教练反馈），确认一个主要技术重点' }] : []),
    ...(feedback ? [{ date: feedback.date, kind: '原始训练意见', text: [feedback.focusSkills, feedback.coachNotes].filter(Boolean).join('；'), sourceIds: [feedback.id], focus: '请家长复核最近训练的技术提示与教练原话，确认一个主要技术重点' }] : []),
    ...reviewed.map(a => ({ date: videos.find(m => m.id === a.mediaId).date, kind: '已审核录像观察', text: a.observation, sourceIds: [a.id, a.mediaId, ...(a.recordId ? [a.recordId] : [])], focus: '请家长围绕已审核录像观察（可结合教练反馈），确认一个主要技术重点' })),
  ];
  // Date wins; on the same date a reviewed observation has priority over raw notes.
  const focusEvidence = candidates.map((c, index) => ({ ...c, index })).sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index).at(-1) || null;
  const focus = focusEvidence?.focus || '请家长依据当前成绩与教练反馈确认一个主要技术重点';
  const reference = records.at(-1) || null;
  const conditions = [['startType', '出发方式'], ['timingMethod', '计时方式'], ['recordType', '记录性质']];
  const missingConditions = reference ? conditions.filter(([key]) => !reference[key] || reference[key] === '未知').map(([, label]) => label) : [];
  const comparable = reference && !missingConditions.length ? records.filter(r => conditions.every(([key]) => r[key] === reference[key]) && ['testItem', 'task'].every(key => (r[key] || '') === (reference[key] || ''))) : [];
  const baseline = { recordId: reference?.id || null, missingConditions, comparableIds: comparable.map(r => r.id), text: reference ? `${reference.date} · ${reference.distance}${reference.stroke} · ${reference.poolLength}池 · ${timeLabel(performanceSeconds(reference))}；出发${reference.startType || '未知'}，计时${reference.timingMethod || '未知'}，性质${reference.recordType || '未知'}` : '尚无长池50米自由泳成绩，先录入真实参考成绩。' };
  const unique = ids => [...new Set(ids)];
  const stages = [
    { title: '第1周 · 确认基线', action: `${focus}。参考成绩：${baseline.text}。${missingConditions.length ? `须先补齐${missingConditions.join('、')}，目前不能确认同条件变化。` : reference ? '请家长确认此记录是否适合作为本周期参考；相同项目仍须核对任务与器材。' : '建立真实记录后再比较成绩。'}核实实际课表和休息日。`, delivery: '一个经家长确认的重点（依据教练反馈） + 有条件说明的基线卡', sourceIds: unique([...(focusEvidence?.sourceIds || []), ...(reference ? [reference.id] : [])]) },
    { title: '第2周 · 记录执行', action: `${training ? `最近实际训练为${training.date}，时长${training.durationMinutes == null ? '未填' : `${training.durationMinutes}分钟`}、泳程${training.totalMeters == null ? '未填' : `${training.totalMeters}m`}；先核对是否与当前重点有关。` : '尚无实际训练记录，先记录现场教练原课表及本次执行。'}${recovery ? `结合${recovery.date}的恢复原始记录与教练沟通，不从留空项判断可否加量。` : '尚无恢复记录，补记实际睡眠、感受、不适和训练意愿。'}记录时长、泳程和教练原话，不自动追加训练量。`, delivery: '可关联课次的实际记录 + 教练反馈 + 恢复记录', sourceIds: [training?.id, recovery?.id].filter(Boolean) },
    { title: '第3周 · 录像验证', action: reviewed.length ? `当前有${reviewed.length}条具备身份、时间片段和审核人的观察；围绕已定位片段复核当前重点及证据限制，再由家长与教练确认练习方向。` : videos.length ? `当前有${videos.length}段视频，尚无符合条件的审核观察。先确认运动员与泳道，定位时间片段并请教练审核；不能从素材说明直接得出个体技术结论。` : '尚无视频，选择真实片段并确认运动员、泳道和时间点；缺少证据时保留建议待验证。', delivery: '已定位、已审核的观察或明确的证据缺口', sourceIds: unique(reviewed.length ? reviewed.flatMap(a => [a.id, a.mediaId, ...(a.recordId ? [a.recordId] : [])]) : videos.map(m => m.id)) },
    { title: '第4周 · 复测调整', action: `${comparable.length > 1 ? `有${comparable.length}条与参考记录的已填条件一致的成绩，可逐条核对后复盘；记录变化不能直接归因于某个动作。` : reference ? `当前可确认同条件的成绩${comparable.length}条，${missingConditions.length ? '先补齐参考条件，再由教练安排适合的复测' : '需由教练安排同条件复测后再评估变化'}。` : '建立真实基线并由教练安排同条件复测后再评估变化。'}结合实际课次、恢复与已审核观察决定保留或调整重点，不承诺固定提速秒数和晋升时间。`, delivery: '有实际来源的周期复盘 + 教练确认的下一周期重点', sourceIds: unique([...comparable.map(r => r.id), ...(reference ? [reference.id] : []), training?.id, recovery?.id].filter(Boolean)) },
  ];
  // Plans deliberately stay outside their own evidence version, so saving one
  // cannot make itself stale. Media/annotations are evidence and must invalidate it.
  const evidence = Object.fromEntries(['swim', 'trainings', 'growth', 'fitness', 'nutrition', 'goals', 'media', 'annotations'].map(key => [key, [...state[key]].sort((a, b) => a.id.localeCompare(b.id))]));
  // Encoding/storage status does not change an observation or coach decision.
  evidence.media = evidence.media.map(m => Object.fromEntries(['id', 'date', 'title', 'type', 'duration', 'recordId'].filter(key => m[key] !== undefined).map(key => [key, m[key]])));
  return { pb, recent, facts, focus, focusEvidence, baseline, sourceIds: unique([...facts.flatMap(f => f.sourceIds), ...stages.flatMap(s => s.sourceIds)]), version: fingerprint({ rules: 'evidence-v2', ...evidence, profile: state.profile }), stages };
}
export function rangeSummary(state, start, end) {
  const inRange = key => ordered(state[key]).filter(r => r.date >= start && r.date <= end);
  const trainings = inRange('trainings'), nutrition = inRange('nutrition');
  const sessions = state.plans.filter(p => p.status === '已确认').flatMap(p => (p.sessions || []).filter(s => s.type === '训练' && s.date >= start && s.date <= end).map(s => ({ ...s, linkId: `${p.id}/${s.id}`, planVersion: p.version })));
  const matching = (training, requireVersion = false) => sessions.some(s => s.linkId === training.plannedSessionId && (training.plannedSessionVersion != null ? training.plannedSessionVersion === s.planVersion : !requireVersion));
  const count = new Set(trainings.filter(t => matching(t)).map(t => t.plannedSessionId)).size;
  const values = (key, field) => inRange(key).map(r => r[field]).filter(v => typeof v === 'number' && Number.isFinite(v));
  const sleep = values('nutrition', 'sleepHours');
  const actual = trainingSummary(trainings);
  const completed = new Set(trainings.filter(t => t.completionStatus === '已完成' && matching(t, true)).map(t => t.plannedSessionId)).size;
  return { start, end, trainings, nutrition, swim: inRange('swim'), plannedCount: sessions.length || null, coverage: sessions.length ? Math.round(count / sessions.length * 100) : null, planCompletionRate: sessions.length ? Math.round(completed / sessions.length * 100) : null, ...actual, sleep: sleep.length ? sleep.reduce((a, b) => a + b, 0) / sleep.length : null, sleepCount: sleep.length };
}
export function publicSnapshot(state, selection = state.publishing) {
  if (!selection.confirmedBy || !validDate(selection.confirmedAt)) return { publishedAt: null, story: '', swim: [], media: [] };
  return { publishedAt: selection.confirmedAt, story: selection.story || '', swim: state.swim.filter(r => selection.swimIds.includes(r.id)).map(r => ({ ...Object.fromEntries(['id', 'date', 'distance', 'stroke', 'poolLength'].map(k => [k, r[k]])), time: formatMilliseconds(performanceMilliseconds(r)), seconds: parseTime(formatMilliseconds(performanceMilliseconds(r))), timeMs: performanceMilliseconds(r), validityStatus: validityLabel(r), timingMethod: r.timingMethod || '未知' })), media: state.media.filter(r => selection.mediaIds.includes(r.id)).map(r => ({ id: r.id, date: r.date, title: r.title, type: r.type, url: r.playbackUrl || r.url, posterUrl: r.posterUrl || '', duration: r.duration ?? null })) };
}
