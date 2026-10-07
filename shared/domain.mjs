// Shared by the UI, API, reports and tests. Empty measurements stay empty.
export const COLLECTIONS = ['growth', 'swim', 'trainings', 'fitness', 'nutrition', 'goals', 'plans', 'annotations', 'media'];
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
  swim: [date, text('distance', '距离（如25m，可自填分段）', { required: true, options: ['10m', '15m', '25m', '50m', '100m', '200m', '400m', '800m', '1500m'] }), select('stroke', '泳姿', ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳'], { required: true }), select('poolLength', '池长', ['25m', '50m'], { required: true }), text('time', '成绩（秒或分:秒，如00:56.17）', { required: true }), select('startType', '出发方式', ['跳台', '蹬壁', '水中', '未知']), select('timingMethod', '计时方式', ['自动计时', '手动计时', '未知']), select('recordType', '记录性质', ['训练', '比赛', '测试', '未知']), text('eventName', '赛事 / 测试名称'), text('task', '测试任务与器材'), text('certificate', '等级证书 / 凭证（如有）'), recorder, notes],
  growth: [date, number('height', '身高（cm）', 20, 250), number('armSpan', '臂展（cm）', 20, 280), number('weight', '体重（kg）', 1, 250), number('handLength', '手长（cm）', 1, 40), number('handWidth', '手宽（cm）', 1, 30), number('footLength', '脚长（cm）', 1, 50), method, recorder, notes],
  trainings: [date, text('session', '课次名称'), text('plannedSessionId', '关联计划课次ID'), number('durationMinutes', '实际时长（分钟）', 0, 600), number('totalMeters', '实际总泳程（m）', 0, 50000), number('kickMeters', '其中打腿（m）', 0, 50000), text('trainingType', '训练内容'), text('intensity', '强度说明（教练原话）'), text('focusSkills', '本次技术提示'), number('rpe', '主观用力感（1–10）', 1, 10, { integer: true }), number('completionRate', '完成度（0–100%）', 0, 100), text('feeling', '课后感受'), text('discomfort', '疼痛 / 不适（没有请明确填无）'), text('coachNotes', '教练原话', { type: 'textarea' }), recorder],
  fitness: [date, number('standingJump', '立定跳远（cm）', 0, 400), number('plankSeconds', '平板支撑（秒）', 0, 3600), number('sitAndReach', '坐位体前屈（cm）', -50, 100), text('shoulderFlex', '肩关节活动观察'), text('ankleFlex', '踝关节活动观察'), number('shuttleRun', '折返跑（秒）', 0.01, 600), method, recorder, notes],
  nutrition: [date, number('sleepHours', '总睡眠（小时）', 0, 24), text('bedtime', '入睡时间'), text('appetite', '食欲'), text('fatigue', '疲惫感'), text('discomfort', '疼痛 / 不适'), text('willingness', '训练意愿'), text('preMeal', '实际课前饮食'), text('postMeal', '实际课后饮食'), number('waterMl', '实际饮水量（ml，可不填）', 0, 15000), number('morningPulse', '晨脉（次/分，可不填）', 20, 250, { integer: true }), number('recoveryScore', '个人恢复感受（1–5，可不填）', 1, 5, { integer: true }), ...['calciumTaken', 'ironTaken', 'zincTaken'].map((key, i) => select(key, ['钙补充剂', '铁补充剂', '锌补充剂'][i], ['未服用', '按既有专业建议服用'], { boolean: true })), text('supplementAdvice', '既有专业建议、产品及实际用量'), recorder, notes],
  goals: [text('title', '目标名称', { required: true }), text('category', '类别'), text('targetMetric', '个人目标'), { key: 'deadline', label: '个人目标复核日期（不是已确认赛程）', type: 'date' }, select('status', '状态', ['待确认', '进行中', '已达成', '暂停']), number('currentProgress', '手动填写的进度（可不填）', 0, 100), text('ruleSource', '规则 / 赛事来源'), text('reviewedBy', '确认人'), notes],
  plans: [text('title', '计划名称', { required: true }), { key: 'startDate', label: '周期开始', type: 'date', required: true }, { key: 'endDate', label: '周期结束', type: 'date', required: true }, text('focus', '一个主要技术重点', { required: true }), text('reviewedBy', '教练确认人'), select('status', '审核状态', ['草稿', '已确认'], { required: true }), notes],
  annotations: [text('mediaId', '素材ID', { required: true }), text('athleteIdentity', '运动员 / 泳道确认'), number('startSecond', '片段开始（秒）', 0, 86400, { required: true }), number('endSecond', '片段结束（秒）', 0, 86400, { required: true }), text('observation', '可见事实', { required: true, type: 'textarea' }), text('limitation', '证据限制'), text('suggestion', '下一次练习方向（待审核）', { type: 'textarea' }), text('recordId', '关联成绩 / 训练ID'), text('reviewedBy', '教练审核人'), select('status', '审核状态', ['草稿', '已审核'], { required: true })],
  media: [date, text('title', '标题', { required: true }), text('description', '原始说明（与录像批注分开）', { type: 'textarea' }), text('category', '分类'), text('recordId', '关联成绩 / 训练ID')],
};
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function parseTime(value) {
  if (typeof value !== 'string' || !/^(?:\d{1,3}:)?\d{1,4}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const parts = value.trim().split(':');
  if (parts.length === 2 && Number(parts[1]) >= 60) return null;
  const seconds = parts.length === 2 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0]);
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}
export const timeLabel = (seconds) => seconds == null ? '未记录' : `${Number(seconds).toFixed(2)}秒`;
export function validateRecord(collection, input, previous = null) {
  const fields = FIELDS[collection];
  if (!fields || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('记录格式无效');
  const result = { ...previous };
  const allowed = new Set([...fields.map(f => f.key), 'sessions', 'sourceIds', 'sourceVersion']);
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
      if (s.length > 4000) throw new Error(`${field.label}过长`);
      if (field.type === 'date' && s && !validDate(s)) throw new Error(`${field.label}不是有效日期`);
      if (field.type === 'select' && s && !field.options.includes(s) && s !== previous?.[field.key]) throw new Error(`${field.label}选项无效`);
      result[field.key] = s;
    }
  }
  if (collection === 'swim') {
    if (!/^\d{1,4}m$/.test(result.distance) || parseInt(result.distance) < 1 || parseInt(result.distance) > 5000) throw new Error('距离须填写1–5000米范围，如25m');
    result.seconds = parseTime(result.time);
    if (result.seconds == null) throw new Error('成绩格式无效，请填写正数秒数或分:秒（秒须小于60）');
  }
  if (collection === 'trainings' && result.kickMeters != null && (result.totalMeters == null || result.kickMeters > result.totalMeters)) throw new Error('打腿泳程不能大于实际总泳程，需同时填写总泳程');
  if (collection === 'nutrition' && [result.calciumTaken, result.ironTaken, result.zincTaken].includes(true) && !result.supplementAdvice) throw new Error('请记录既有专业建议、产品及实际用量');
  if (collection === 'annotations' && (result.endSecond < result.startSecond || result.status === '已审核' && !result.reviewedBy)) throw new Error('片段结束须不早于开始；已审核须填写审核人');
  if (collection === 'plans') {
    if (result.endDate < result.startDate || result.status === '已确认' && !result.reviewedBy) throw new Error('周期结束须不早于开始；已确认须填写教练确认人');
    result.sessions = validateSessions(input.sessions !== undefined ? input.sessions : previous?.sessions ?? [], result);
    result.version = (previous?.version || 0) + 1;
    if (input.sourceIds !== undefined) {
      if (!Array.isArray(input.sourceIds) || !input.sourceIds.every(s => typeof s === 'string')) throw new Error('来源记录格式无效');
      result.sourceIds = input.sourceIds;
    }
    if (input.sourceVersion !== undefined) result.sourceVersion = String(input.sourceVersion).slice(0, 100);
  }
  return result;
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
  const state = { ...emptyState(), ...raw };
  for (const key of COLLECTIONS) {
    if (!Array.isArray(state[key]) || state[key].some(r => !r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) || new Set(state[key].map(r => r.id)).size !== state[key].length) throw new Error(`数据集合${key}格式或ID无效`);
    for (const record of state[key]) for (const field of FIELDS[key]) if (record[field.key] != null && record[field.key] !== '') {
      if (field.type === 'number' && (typeof record[field.key] !== 'number' || !Number.isFinite(record[field.key]) || record[field.key] < field.min || record[field.key] > field.max || field.integer && !Number.isInteger(record[field.key]))) throw new Error(`数据集合${key}的${field.label}不是范围内的有效实测数值`);
      if (field.type === 'date' && !validDate(record[field.key])) throw new Error(`数据集合${key}的日期无效`);
    }
  }
  if (!state.profile || typeof state.profile !== 'object' || typeof state.profile.name !== 'string' || !['', '女', '男'].includes(state.profile.sex) || state.profile.birthDate && !validDate(state.profile.birthDate)) throw new Error('档案格式无效');
  if (!state.publishing || !['swimIds', 'mediaIds'].every(k => Array.isArray(state.publishing[k]) && state.publishing[k].every(id => typeof id === 'string')) || typeof state.publishing.story !== 'string') throw new Error('发布范围格式无效');
  if (!Array.isArray(state.trash) || state.trash.some(t => !COLLECTIONS.includes(t.collection) || !t.record?.id)) throw new Error('回收站格式无效');
  if (state.planHistory !== undefined && !Array.isArray(state.planHistory)) throw new Error('计划历史格式无效');
  for (const media of state.media) if (media.duration != null && (typeof media.duration !== 'number' || !Number.isFinite(media.duration) || media.duration <= 0)) throw new Error('素材时长格式无效');
  for (const plan of [...state.plans, ...(state.planHistory || [])]) {
    if (!Number.isInteger(plan.version) || plan.version < 1) throw new Error('计划版本格式无效');
    validateRecord('plans', { ...Object.fromEntries(FIELDS.plans.map(f => [f.key, plan[f.key]])), sessions: plan.sessions });
    if (!Array.isArray(plan.sessions)) throw new Error('计划课次格式无效');
  }
  for (const annotation of state.annotations) validateRecord('annotations', Object.fromEntries(FIELDS.annotations.map(f => [f.key, annotation[f.key]])));
  return state;
}
export const ordered = (records = []) => [...records].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
export const latest = records => ordered(records).at(-1) || null;
export function eventRecords(records, distance = '50m', stroke = '自由泳', poolLength = '50m') {
  return ordered(records).filter(r => r.distance === distance && r.stroke === stroke && r.poolLength === poolLength && parseTime(r.time) != null);
}
export function best(records, distance = '50m', stroke = '自由泳', poolLength = '50m') {
  return eventRecords(records, distance, stroke, poolLength).reduce((pb, r) => !pb || parseTime(r.time) < parseTime(pb.time) ? r : pb, null);
}
export function fingerprint(data) {
  let hash = 2166136261;
  for (const char of JSON.stringify(data)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `记录版本-${hash.toString(16).padStart(8, '0')}`;
}
export function analysis(state) {
  const records = eventRecords(state.swim);
  const pb = best(state.swim);
  const recent = latest(state.swim);
  const facts = [];
  if (pb) facts.push({ kind: '事实', text: `50米自由泳（50米池）已录入PB ${timeLabel(parseTime(pb.time))}，日期${pb.date}。`, sourceIds: [pb.id] });
  if (records.length > 1) facts.push({ kind: '计算', text: `从首条${timeLabel(parseTime(records[0].time))}到已录入PB，共缩短${(parseTime(records[0].time) - parseTime(pb.time)).toFixed(2)}秒。计时与出发条件未补齐时，不能归因于某个训练动作。`, sourceIds: [records[0].id, pb.id] });
  if (recent && recent.id !== pb?.id) facts.push({ kind: '事实', text: `最新${recent.distance}${recent.stroke}为${timeLabel(parseTime(recent.time))}（${recent.poolLength}池，${recent.date}），与主项PB分别展示。`, sourceIds: [recent.id] });
  if (recent?.notes) facts.push({ kind: '原始记录', text: recent.notes, sourceIds: [recent.id] });
  if (pb) for (const goal of state.goals) {
    const threshold = /(?:<\s*|^)(\d+(?:\.\d+)?)\s*(?:s|秒)/.exec(goal.targetMetric || '');
    if (threshold) {
      const target = Number(threshold[1]), gap = parseTime(pb.time) - target;
      if (gap > 0) facts.push({ kind: '计算', text: `原始个人目标${target.toFixed(2)}秒与当前长池50米PB相差${gap.toFixed(2)}秒（约${(gap / parseTime(pb.time) * 100).toFixed(1)}%）。这是差距，不是提速预测；对应赛事与晋升条件待确认。`, sourceIds: [pb.id, goal.id] });
    }
    const stretch = /(\d+)\s*[-~～]\s*(\d+)秒/.exec(goal.targetMetric || '');
    if (stretch && parseTime(pb.time) > Number(stretch[2])) facts.push({ kind: '待验证建议', text: `原始目标的${stretch[1]}–${stretch[2]}秒范围尚未由当前PB达到；已突破1分钟与达到该范围应分别记录。`, sourceIds: [pb.id, goal.id] });
    if (/国家三级/.test(`${goal.title} ${goal.targetMetric}`) && /39\.50/.test(`${goal.title} ${goal.targetMetric}`)) facts.push({ kind: '待验证建议', text: '原始目标中的国家三级39.50秒口径需纠正。女子50米自由泳现行参考为长池36.00秒、短池34.00秒；先确认档案性别及赛事条件，原文保留。', sourceIds: [goal.id] });
  }
  for (const [key, name] of [['trainings', '水上训练'], ['fitness', '体能'], ['nutrition', '恢复']]) facts.push({ kind: '事实', text: `${name}已录入${state[key].length}条${state[key].length ? '。' : '，尚不能评估实际状态；未录入不代表未训练。'}`, sourceIds: state[key].map(r => r.id) });
  const growth = ordered(state.growth);
  if (growth.length > 1) {
    const a = growth.at(-2), b = growth.at(-1);
    const down = [['handWidth', '手宽'], ['footLength', '脚长']].filter(([key]) => a[key] != null && b[key] != null && b[key] < a[key]);
    if (down.length) facts.push({ kind: '待验证建议', text: `${down.map(([, name]) => name).join('、')}两次测量下降，先核对测量方法和录入，不据此推断生长异常或竞技天赋。`, sourceIds: [a.id, b.id] });
  }
  const explosive = /爆发/.test(recent?.notes || '');
  const focus = explosive ? '请教练验证出发、蹬壁和短段加速的具体问题' : '请教练依据当前成绩确认一个主要技术重点';
  return { pb, recent, facts, focus, sourceIds: [...new Set(facts.flatMap(f => f.sourceIds))], version: fingerprint({ swim: state.swim, trainings: state.trainings, growth: state.growth, fitness: state.fitness, nutrition: state.nutrition, goals: state.goals, profile: state.profile }), stages: [
    { title: '第1周 · 确认基线', action: `${focus}。补齐同条件出发、计时方式；核实实际课表和休息日。`, delivery: '一个技术重点 + 同条件基线记录' },
    { title: '第2周 · 记录执行', action: '由教练在原课表内安排练习；记录实际时长、泳程、感受、不适和教练原话。不自动追加训练量。', delivery: '课次记录 + 一个教练提示' },
    { title: '第3周 · 录像验证', action: '先确认运动员与泳道，再用时间点批注验证当前重点。没有录像证据时保留为待验证建议。', delivery: '一段已定位的观察或明确的证据缺口' },
    { title: '第4周 · 复测调整', action: '教练选择适合的同条件复测，比较记录并决定保留或调整重点；不承诺固定提速秒数和晋升时间。', delivery: '周期复盘 + 下一周期重点' },
  ] };
}
export function rangeSummary(state, start, end) {
  const inRange = key => ordered(state[key]).filter(r => r.date >= start && r.date <= end);
  const trainings = inRange('trainings'), nutrition = inRange('nutrition');
  const sessions = state.plans.filter(p => p.status === '已确认').flatMap(p => (p.sessions || []).filter(s => s.type === '训练' && s.date >= start && s.date <= end).map(s => ({ ...s, linkId: `${p.id}/${s.id}` })));
  const count = new Set(trainings.map(t => t.plannedSessionId).filter(id => sessions.some(s => s.linkId === id))).size;
  const values = (key, field) => inRange(key).map(r => r[field]).filter(v => typeof v === 'number' && Number.isFinite(v));
  const sleep = values('nutrition', 'sleepHours');
  const meters = values('trainings', 'totalMeters');
  return { start, end, trainings, nutrition, swim: inRange('swim'), plannedCount: sessions.length || null, coverage: sessions.length ? Math.round(count / sessions.length * 100) : null, meters: meters.length ? meters.reduce((a, b) => a + b, 0) : null, metersCount: meters.length, sleep: sleep.length ? sleep.reduce((a, b) => a + b, 0) / sleep.length : null, sleepCount: sleep.length };
}
export function publicSnapshot(state, selection = state.publishing) {
  if (!selection.confirmedBy || !validDate(selection.confirmedAt)) return { publishedAt: null, story: '', swim: [], media: [] };
  return { publishedAt: selection.confirmedAt, story: selection.story || '', swim: state.swim.filter(r => selection.swimIds.includes(r.id)).map(r => Object.fromEntries(['id', 'date', 'distance', 'stroke', 'poolLength', 'time', 'seconds'].map(k => [k, r[k]]))), media: state.media.filter(r => selection.mediaIds.includes(r.id)).map(r => ({ id: r.id, date: r.date, title: r.title, type: r.type, url: r.playbackUrl || r.url, posterUrl: r.posterUrl || '', duration: r.duration ?? null })) };
}
