// The same typed domain code runs in Vite, Node and Deno; no generated copy.
export const PERFORMANCE_VERSION = 1;
export const MAX_TIME_MS = 86_400_000;
export const VALIDITY_STATUSES = ['未核验', '有效', '失格', '无效'] as const;
export type ValidityStatus = typeof VALIDITY_STATUSES[number];
export interface PerformanceSource {
  id?: string;
  date?: string;
  distance?: string;
  stroke?: string;
  poolLength?: string;
  time?: unknown;
  timeMs?: unknown;
  validityStatus?: unknown;
  [key: string]: unknown;
}
export interface SwimPerformance extends PerformanceSource {
  id: string;
  date: string;
  time: string;
  timeMs: number;
  validityStatus: ValidityStatus;
}
export const TIME_FIELDS = ['time', 'previousTime', 'winnerTime'] as const;
export type TimeField = typeof TIME_FIELDS[number];
export function validTimeMs(value: unknown, allowZero = false): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 10) && value <= MAX_TIME_MS;
}
// Decimal digits are converted with integer arithmetic, never parseFloat * 1000.
export function parseMilliseconds(value: unknown, allowZero = false): number | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  let total: number;
  if (/^\d{2,4}:\d{2}:\d{2}$/.test(text)) {
    const parts = text.split(':').map(Number);
    const minutes = parts[0]!, seconds = parts[1]!, centiseconds = parts[2]!;
    if (seconds >= 60) return null;
    total = minutes * 60_000 + seconds * 1000 + centiseconds * 10;
  } else if (/^\d{2}:\d{2}:\d{2}:\d{2}$/.test(text)) {
    const parts = text.split(':').map(Number);
    const hours = parts[0]!, minutes = parts[1]!, seconds = parts[2]!, centiseconds = parts[3]!;
    if (minutes >= 60 || seconds >= 60) return null;
    total = hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + centiseconds * 10;
  } else {
    const match = /^(?:(\d{1,4}):)?(\d{1,5})(?:\.(\d{1,3}))?$/.exec(text);
    if (!match) return null;
    const minutes = Number(match[1] || 0), seconds = Number(match[2]);
    if (match[1] !== undefined && seconds >= 60) return null;
    total = minutes * 60_000 + seconds * 1000 + Number((match[3] || '').padEnd(3, '0'));
  }
  return validTimeMs(total, allowZero) ? total : null;
}
export function formatMilliseconds(value: unknown): string {
  if (!validTimeMs(value, true)) return '';
  const ticks = Math.floor((value + 5) / 10);
  const hours = Math.floor(ticks / 360_000);
  const minutes = Math.floor(ticks / 6000) % (hours ? 60 : 10000);
  const seconds = Math.floor(ticks / 100) % 60, centiseconds = ticks % 100;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}:${pad(centiseconds)}`;
}
export function performanceMilliseconds(record: PerformanceSource, field: TimeField = 'time'): number | null {
  const stored = record[`${field}Ms`];
  // A corrupt canonical value must not silently fall back to rounded text.
  return stored === undefined ? parseMilliseconds(record[field]) : validTimeMs(stored) ? stored : null;
}
export function performanceSeconds(record: PerformanceSource): number | null {
  const ms = performanceMilliseconds(record);
  return ms === null ? null : ms / 1000;
}
export function performanceLabel(record: PerformanceSource, field: TimeField = 'time'): string {
  return formatMilliseconds(performanceMilliseconds(record, field)) || '未记录';
}
// 口语化辅注：56.17秒 / 1分02.05秒。原始主显示保持分:秒:百分秒不变，仅并列提示。
export function readablePerformance(record: PerformanceSource, field: TimeField = 'time'): string {
  const ms = performanceMilliseconds(record, field);
  if (ms === null) return '';
  const seconds = ms / 1000;
  return seconds < 60 ? `${seconds.toFixed(2)}秒` : `${Math.floor(seconds / 60)}分${(seconds % 60).toFixed(2).padStart(5, '0')}秒`;
}
export function improvementRateLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '数据不足';
  return value > 0 && value < 0.01 ? '小于0.01%' : `${value.toFixed(2)}%`;
}
export function performanceInput(record: PerformanceSource, field: TimeField = 'time'): string {
  const ms = performanceMilliseconds(record, field);
  if (ms === null) return '';
  return ms % 10 ? `${Math.floor(ms / 1000)}.${String(ms % 1000).padStart(3, '0')}` : formatMilliseconds(ms);
}
export function validityLabel(record: PerformanceSource): ValidityStatus {
  return VALIDITY_STATUSES.includes(record.validityStatus as ValidityStatus) ? record.validityStatus as ValidityStatus : '未核验';
}
export function eligiblePerformance(record: PerformanceSource): boolean {
  return record.validityStatus === '有效' && ['25m', '50m'].includes(record.poolLength || '') && performanceMilliseconds(record) !== null;
}
export function performanceGroups<T extends PerformanceSource>(records: T[]): Array<{ key: string; records: T[]; valid: T[]; best: T | null; improvementMs: number | null; improvementRate: number | null }> {
  const groups = new Map<string, T[]>();
  const sorted = [...records].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id || '').localeCompare(String(b.id || '')));
  for (const record of sorted) {
    if (performanceMilliseconds(record) === null) continue;
    const key = [record.distance, record.stroke, record.poolLength].join('|');
    const group = groups.get(key) || [];
    group.push(record); groups.set(key, group);
  }
  return [...groups].map(([key, all]) => {
    const valid = all.filter(eligiblePerformance);
    const best = valid.reduce<T | null>((pb, record) => !pb || performanceMilliseconds(record)! < performanceMilliseconds(pb)! ? record : pb, null);
    const baseline = valid.length >= 2 ? performanceMilliseconds(valid[0]!) : null;
    const improvementMs = baseline !== null && best ? baseline - performanceMilliseconds(best)! : null;
    return { key, records: all, valid, best, improvementMs, improvementRate: improvementMs !== null && baseline ? improvementMs / baseline * 100 : null };
  });
}
export function normalizePerformanceRecord(record: PerformanceSource, canonicalize = false): PerformanceSource {
  if (record.validityStatus != null && record.validityStatus !== '' && !VALIDITY_STATUSES.includes(record.validityStatus as ValidityStatus)) throw new Error('成绩有效性状态无效');
  if (canonicalize) record.validityStatus = validityLabel(record);
  for (const field of TIME_FIELDS) {
    const msKey = `${field}Ms`, inputKey = `${field}Input`;
    const raw = record[field];
    if (field === 'time' && record[msKey] === null) throw new Error('整数毫秒不能留空');
    if ((raw === '' || raw == null) && record[msKey] == null) {
      if (field === 'time') throw new Error('请填写成绩');
      if (record[inputKey] != null && record[inputKey] !== '') throw new Error(`${field}为空时不能保留不一致的精确输入`);
      if (canonicalize) { record[msKey] = null; record[inputKey] = ''; }
      continue;
    }
    const parsed = parseMilliseconds(raw);
    const ms = record[msKey] === undefined ? parsed : record[msKey];
    if (!validTimeMs(ms)) throw new Error(`${field}须为0.010秒至24小时内的有效成绩（最多三位小数）`);
    const display = formatMilliseconds(ms);
    if (parsed !== ms && raw !== display) throw new Error(`${field}与整数毫秒不一致`);
    if (canonicalize) {
      record[msKey] = ms;
      if (record[inputKey] == null || record[inputKey] === '') record[inputKey] = parsed === ms && typeof raw === 'string' ? raw.trim() : performanceInput({ timeMs: ms });
      record[field] = display;
    } else if (raw !== display) throw new Error(`${field}须为分:秒:百分秒格式`);
    if (record[inputKey] != null && record[inputKey] !== '' && parseMilliseconds(record[inputKey]) !== ms) throw new Error(`${field}原始输入与整数毫秒不一致`);
  }
  // Keep legacy seconds consistent with the legacy display for old exports.
  const legacy = parseMilliseconds(record.time);
  if (canonicalize) record.seconds = legacy === null ? null : legacy / 1000;
  else if (record.seconds !== (legacy === null ? null : legacy / 1000)) throw new Error('成绩与兼容秒数不一致');
  return record;
}

export interface PerformanceState {
  swim: PerformanceSource[];
  trash?: Array<{ collection: string; record: PerformanceSource; [key: string]: unknown }>;
  performanceSchemaVersion?: number;
  [key: string]: unknown;
}
export function upgradePerformanceState<T extends PerformanceState>(input: T): { data: T; corrections: Array<{ id: string | undefined; field: string }> } {
  const data = structuredClone(input);
  const corrections: Array<{ id: string | undefined; field: string }> = [];
  for (const record of [...data.swim, ...(data.trash || []).filter(item => item.collection === 'swim').map(item => item.record)]) {
    const before = structuredClone(record);
    normalizePerformanceRecord(record, true);
    for (const key of Object.keys(record)) if (JSON.stringify(before[key]) !== JSON.stringify(record[key])) corrections.push({ id: record.id, field: key });
  }
  data.performanceSchemaVersion = PERFORMANCE_VERSION;
  return { data, corrections };
}
