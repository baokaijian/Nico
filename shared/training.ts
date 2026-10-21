// One calculation path for forms, APIs and statistics. Planned work is never actual work.
export const TRAINING_STROKES = ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳', '综合', '其他'] as const;
export const TRAINING_STATUSES = ['未记录', '已完成', '部分完成', '未完成', '已取消'] as const;
export type TrainingSet = {
  id: string; task: string; stroke: string; distanceMeters: number;
  plannedRepeats: number | null; completedRepeats: number | null;
  restSeconds: number | null; isKick: boolean;
};
type Row = Record<string, unknown>;
const missing = (value: unknown) => value === '' || value == null;
function numeric(value: unknown, label: string, max: number, integer = false, min = 0): number | null {
  if (missing(value)) return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))) throw new Error(`${label}须为有效数值`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || integer && !Number.isInteger(n)) throw new Error(`${label}超出范围${integer ? '或不是整数' : ''}`);
  return n;
}
const smallText = (value: unknown, label: string): string => {
  if (missing(value)) return '';
  if (typeof value !== 'string' || value.length > 4000) throw new Error(`${label}格式无效或过长`);
  return value.trim();
};
export function validateTrainingSets(value: unknown, template = false): TrainingSet[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('训练组须为列表，最多50组');
  const ids = new Set<string>();
  return value.map((raw: unknown, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('训练组格式无效');
    const s = raw as Row;
    for (const key of Object.keys(s)) if (!['id', 'task', 'stroke', 'distanceMeters', 'plannedRepeats', 'completedRepeats', 'restSeconds', 'isKick'].includes(key)) throw new Error(`训练组不支持字段：${key}`);
    const id = s.id === undefined ? `set-${i + 1}` : smallText(s.id, '训练组ID');
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw new Error('训练组ID缺失或重复');
    ids.add(id);
    const distanceMeters = numeric(s.distanceMeters, '每次距离', 5000, false, 0.01);
    if (distanceMeters == null || Math.abs(distanceMeters * 100 - Math.round(distanceMeters * 100)) > 1e-7) throw new Error('每次距离须大于零，最多两位小数');
    const stroke = smallText(s.stroke, '训练组泳姿');
    if (stroke && !(TRAINING_STROKES as readonly string[]).includes(stroke)) throw new Error('训练组泳姿无效');
    const completedRepeats = numeric(s.completedRepeats, '实际次数', 2000, true);
    if (template && completedRepeats != null) throw new Error('模板不能保存实际完成次数');
    if (s.isKick !== undefined && typeof s.isKick !== 'boolean') throw new Error('打腿标记须为布尔值');
    return { id, task: smallText(s.task, '训练组内容'), stroke, distanceMeters,
      plannedRepeats: numeric(s.plannedRepeats, '计划次数', 2000, true), completedRepeats,
      restSeconds: numeric(s.restSeconds, '间歇秒数', 3600, true), isKick: s.isKick === true };
  });
}
export function setTotals(sets: readonly TrainingSet[]) {
  let actual = 0, kick = 0, planned = 0, unknown = 0, unknownPlanned = 0;
  const strokes: Record<string, number> = {};
  for (const s of sets) {
    const cm = Math.round(s.distanceMeters * 100);
    if (s.plannedRepeats == null) unknownPlanned++; else planned += cm * s.plannedRepeats;
    if (s.completedRepeats == null) { unknown++; continue; }
    const distance = cm * s.completedRepeats;
    actual += distance;
    if (s.isKick) kick += distance;
    const stroke = s.stroke || '未记录'; strokes[stroke] = (strokes[stroke] || 0) + distance / 100;
  }
  if (actual > 5000000 || planned > 5000000) throw new Error('单次训练实际或计划总距离不能超过50000米');
  return { knownMeters: actual / 100, totalMeters: unknown || !sets.length ? null : actual / 100,
    kickMeters: unknown || !sets.length ? null : kick / 100, plannedMeters: unknownPlanned || !sets.length ? null : planned / 100, unknown, strokes };
}
export function normalizeTraining(record: Row, template = false): Row {
  const mode = record.entryMode || '快速';
  if (!['快速', '训练组'].includes(String(mode))) throw new Error('训练录入模式无效');
  record.entryMode = mode;
  const sets = validateTrainingSets(record.sets ?? [], template);
  if (mode === '训练组' && !sets.length) throw new Error('训练组模式至少填写一组');
  if (mode === '快速' && sets.length) throw new Error('快速模式不能同时保存训练组，请选择训练组模式');
  record.sets = sets;
  const totals = setTotals(sets);
  if (template) {
    record.plannedMeters = mode === '训练组' ? totals.plannedMeters : numeric(record.plannedMeters, '参考距离', 50000);
    record.plannedDurationMinutes = numeric(record.plannedDurationMinutes, '参考时长', 600);
    return record;
  }
  if (mode === '训练组') { record.totalMeters = totals.totalMeters; record.kickMeters = totals.kickMeters; }
  const status = record.completionStatus || '未记录';
  if (!(TRAINING_STATUSES as readonly unknown[]).includes(status)) throw new Error('训练完成状态无效');
  record.completionStatus = status;
  if (status === '已完成' && mode === '训练组' && (totals.unknown || sets.some(s => s.plannedRepeats != null && (s.completedRepeats ?? 0) < s.plannedRepeats))) throw new Error('仍有未填或未完成的训练组，请核对完成状态');
  if (['未完成', '已取消'].includes(String(status)) && (Number(record.totalMeters) > 0 || totals.knownMeters > 0 || Number(record.durationMinutes) > 0)) throw new Error('未完成或已取消不能同时填写实际训练量，请核对状态');
  return record;
}
export function trainingFacts(record: Row) {
  const grouped = record.entryMode === '训练组';
  const totals = grouped ? setTotals(validateTrainingSets(record.sets)) : null;
  const excluded = ['未完成', '已取消'].includes(String(record.completionStatus));
  const rawMeters = typeof record.totalMeters === 'number' && Number.isFinite(record.totalMeters) ? record.totalMeters : null;
  const meters = excluded ? null : grouped ? totals!.totalMeters : rawMeters;
  const knownMeters = excluded ? 0 : totals?.knownMeters ?? meters ?? 0;
  const minutes = excluded ? null : typeof record.durationMinutes === 'number' && Number.isFinite(record.durationMinutes) ? record.durationMinutes : null;
  const occurred = !excluded && (record.completionStatus === '已完成' || record.completionStatus === '部分完成' || knownMeters > 0 || Number(minutes) > 0);
  const strokes = excluded ? {} : totals?.strokes ?? (meters != null ? { [String(record.stroke || '未记录')]: meters } : {});
  return { meters, knownMeters, minutes, occurred, completed: record.completionStatus === '已完成', unknownSets: totals?.unknown ?? 0, strokes };
}
export function trainingSummary(records: readonly Row[]) {
  const facts = records.map(trainingFacts), actual = facts.filter(f => f.occurred);
  const withMeters = facts.filter(f => f.meters != null), withMinutes = facts.filter(f => f.minutes != null);
  const strokes: Record<string, number> = {};
  for (const f of facts) for (const [stroke, meters] of Object.entries(f.strokes)) strokes[stroke] = (strokes[stroke] || 0) + meters;
  return { records: records.length, count: actual.length, confirmedCompleted: facts.filter(f => f.completed).length,
    meters: withMeters.length ? withMeters.reduce((n, f) => n + f.meters!, 0) : null,
    metersCount: withMeters.length, knownMeters: Math.round(facts.reduce((n, f) => n + f.knownMeters, 0) * 100) / 100,
    minutes: withMinutes.length ? withMinutes.reduce((n, f) => n + f.minutes!, 0) : null, minutesCount: withMinutes.length,
    unknownSets: facts.reduce((n, f) => n + f.unknownSets, 0), strokes };
}
// Copy only the arrangement. Never carry real completion, media, feelings or identity metadata.
export function trainingDraft(source: Row, template = false): Row {
  const sets = validateTrainingSets(source.sets ?? []).map((s, i) => ({ ...s, id: `set-${i + 1}`, completedRepeats: null }));
  return { session: template ? source.title || '' : source.session || '', entryMode: source.entryMode || '快速',
    stroke: source.stroke || '', trainingType: source.trainingType || '', sets,
    plannedMeters: template ? source.plannedMeters ?? null : source.totalMeters ?? null,
    plannedDurationMinutes: template ? source.plannedDurationMinutes ?? null : source.durationMinutes ?? null,
    completionStatus: '未记录', durationMinutes: null, totalMeters: null, kickMeters: null, mediaIds: [],
    ...(template ? { templateId: source.id, templateVersion: source.version, notes: source.notes || '' } : { copiedFromId: source.id }) };
}
