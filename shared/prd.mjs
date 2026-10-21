import { parseMilliseconds, formatMilliseconds, normalizePerformanceRecord, performanceMilliseconds } from './performance.ts';
// PRD dates are stored as ISO calendar dates; examples are not athlete facts.
export const PRD_VERSION = 2;
export const SCORE_DISTANCES = ['10m', '15m', '25m', '50m', '100m', '200m', '400m', '800m', '1500m'];
export const TEST_ITEMS = ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳', '抱板打腿', '自由泳打腿', '仰泳打腿', '蛙泳打腿', '蝶泳打腿'];
export const BODY_FIELDS = ['height', 'weight', 'handWidth', 'handLength', 'footLength', 'armLength', 'armSpan', 'sitAndReach'];
const SCORE_TEXT = ['location', 'testedBy', 'ageGroup', 'team', 'competitionSession', 'eventName', 'heat', 'testItem', 'previousTime', 'winnerTime'];
const SCORE_NUMBERS = ['rank', 'lane', 'preliminaryRank'];
const hasValue = value => value !== '' && value != null;
const decimal = value => Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
// Compatibility wrappers. Arithmetic and comparisons use integer milliseconds.
export function parseScore(value, allowZero = false) {
  const ms = parseMilliseconds(value, allowZero);
  return ms === null ? null : ms / 1000;
}
export function scoreFormat(seconds) {
  return typeof seconds === 'number' && Number.isFinite(seconds) ? formatMilliseconds(Math.round(seconds * 1000)) : '';
}
export function dateFormat(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${Number(value.slice(0, 4))}年${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日` : value || '未填写';
}
export function bodyFormat(value) { return value == null || value === '' ? '未填写' : Number(value).toFixed(1); }
export function validatePrdRecord(collection, record, { canonicalize = false } = {}) {
  if (['growth', 'swim'].includes(collection) && (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '') || Number.isNaN(Date.parse(record.date)) || new Date(`${record.date}T00:00:00Z`).toISOString().slice(0, 10) !== record.date)) throw new Error('记录日期无效');
  if (collection === 'growth') for (const key of BODY_FIELDS) {
    if (hasValue(record[key]) && (typeof record[key] !== 'number' || !Number.isFinite(record[key]) || !decimal(record[key]))) throw new Error(`${key}须精确到小数点后一位`);
  }
  if (collection !== 'swim') return record;
  if (!SCORE_DISTANCES.includes(record.distance)) throw new Error('测试 / 比赛长度须从固定选项中选择');
  if (!['25m', '50m', '其他'].includes(record.poolLength)) throw new Error('池长须选择25m、50m或其他');
  if (!['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳', '打腿'].includes(record.stroke)) throw new Error('泳姿须从固定选项中选择');
  if (hasValue(record.testItem) && !TEST_ITEMS.includes(record.testItem)) throw new Error('测试项目须从固定选项中选择');
  if (record.stroke === '打腿' && (!record.testItem || !record.testItem.includes('打腿'))) throw new Error('打腿测试须选择具体打腿项目');
  if (hasValue(record.testItem) && (record.testItem.includes('打腿') ? record.stroke !== '打腿' : record.testItem !== record.stroke)) throw new Error('测试项目与泳姿不一致');
  if (hasValue(record.recordType) && !['训练', '比赛', '测试', '未知'].includes(record.recordType)) throw new Error('记录性质无效');
  normalizePerformanceRecord(record, canonicalize);
  const ownMs = performanceMilliseconds(record);
  const winnerMs = performanceMilliseconds(record, 'winnerTime');
  for (const key of SCORE_NUMBERS) if (hasValue(record[key]) && (!Number.isInteger(record[key]) || record[key] < 1 || record[key] > (key === 'lane' ? 100 : 100000))) throw new Error(`${key}须为正整数`);
  if (record.isFinal != null && typeof record.isFinal !== 'boolean') throw new Error('是否决赛须为布尔值或未知');
  if (record.isFinal === false && hasValue(record.preliminaryRank)) throw new Error('预赛记录不能填写决赛前的预赛排名');
  if (winnerMs !== null && winnerMs > ownMs) throw new Error('第一名成绩不能慢于本人成绩');
  if (record.rank === 1 && winnerMs !== null && winnerMs !== ownMs) throw new Error('排名第一时第一名成绩须与本人成绩一致');
  return record;
}
// Derived fields never create a previous result when timing conditions are unknown.
export function derivePrdState(state) {
  if (state.schemaVersion !== PRD_VERSION) return state;
  const deleted = state.trash || [];
  const scores = [...state.swim, ...deleted.filter(t => t.collection === 'swim').map(t => t.record)];
  const media = [...state.media, ...deleted.filter(t => t.collection === 'media').map(t => t.record)];
  for (const score of scores) {
    score.testAgeGroup = score.recordType === '测试' && state.profile.birthDate && score.date >= state.profile.birthDate ? Number(score.date.slice(0, 4)) - Number(state.profile.birthDate.slice(0, 4)) : null;
    const ownMs = performanceMilliseconds(score), winnerMs = performanceMilliseconds(score, 'winnerTime');
    const gapMs = ownMs !== null && winnerMs !== null && ownMs >= winnerMs ? ownMs - winnerMs : null;
    score.gapTime = formatMilliseconds(gapMs);
    if (score.timeMs !== undefined) score.gapTimeMs = gapMs;
    score.mediaIds = media.filter(m => m.recordId === score.id).map(m => m.id).sort();
  }
  return state;
}
export function upgradePrdState(raw) {
  const state = structuredClone(raw);
  const corrections = [];
  const records = [...state.growth.map(record => ['growth', record]), ...state.swim.map(record => ['swim', record]), ...(state.trash || []).map(item => [item.collection, item.record])];
  const changed = (collection, record, key, value) => {
    if (record[key] === value) return;
    if (hasValue(record[key])) { record.legacyValues ||= {}; if (!Object.hasOwn(record.legacyValues, key)) record.legacyValues[key] = record[key]; }
    corrections.push({ collection, id: record.id, field: key, before: record[key] ?? null, after: value });
    record[key] = value;
  };
  for (const [collection, record] of records) {
    if (collection === 'growth') for (const key of BODY_FIELDS) {
      const value = record[key];
      if (value == null) changed(collection, record, key, null);
      else if (typeof value === 'number' && Number.isFinite(value)) changed(collection, record, key, Math.round((value + Number.EPSILON) * 10) / 10);
    }
    if (collection !== 'swim') continue;
    for (const key of SCORE_TEXT) if (record[key] == null) changed(collection, record, key, '');
    for (const key of SCORE_NUMBERS) if (record[key] == null) changed(collection, record, key, null);
    if (record.isFinal == null) changed(collection, record, 'isFinal', null);
    if (!record.recordType) {
      // Only explicit original wording supports automatic classification.
      const evidence = `${record.eventName || ''} ${record.notes || ''}`;
      changed(collection, record, 'recordType', /比赛/.test(evidence) ? '比赛' : /初测|考核|测试/.test(evidence) ? '测试' : '未知');
    }
    if (!record.testItem && TEST_ITEMS.includes(record.stroke)) changed(collection, record, 'testItem', record.stroke);
    for (const key of ['time', 'previousTime', 'winnerTime']) if (hasValue(record[key]) && parseScore(record[key]) != null) {
      const ms = parseMilliseconds(record[key]);
      if (ms % 10 && record[`${key}Ms`] == null) {
        changed(collection, record, `${key}Ms`, ms);
        changed(collection, record, `${key}Input`, record[key]);
      }
      changed(collection, record, key, scoreFormat(parseScore(record[key])));
    }
    if (parseScore(record.time) != null) changed(collection, record, 'seconds', parseScore(record.time));
  }
  // An explicit matching event title in the original notes is evidence, dates alone are not.
  for (const media of state.media) if (!media.recordId && media.title?.length >= 6 && /比赛/.test(media.title)) {
    const matches = state.swim.filter(record => record.date === media.date && record.notes?.includes(media.title));
    if (matches.length === 1) changed('media', media, 'recordId', matches[0].id);
  }
  state.schemaVersion = PRD_VERSION;
  derivePrdState(state);
  return { data: state, corrections };
}
export function validatePrdState(state) {
  for (const key of ['growth', 'swim']) for (const record of state[key]) validatePrdRecord(key, record);
  for (const item of state.trash || []) validatePrdRecord(item.collection, item.record);
  const expected = derivePrdState(structuredClone(state));
  for (const [index, record] of state.swim.entries()) for (const key of ['testAgeGroup', 'gapTime', 'mediaIds']) {
    if (JSON.stringify(record[key]) !== JSON.stringify(expected.swim[index][key])) throw new Error(`${key}派生数据不一致`);
  }
  for (const [index, record] of state.swim.entries()) if (record.timeMs !== undefined && record.gapTimeMs !== expected.swim[index].gapTimeMs) throw new Error('整数毫秒差距派生数据不一致');
  if (new Set([...state.swim, ...state.trainings].map(r => r.id)).size !== state.swim.length + state.trainings.length) throw new Error('成绩与训练ID不能重复，否则素材关联不明确');
  const ids = new Set([...state.swim, ...state.trainings, ...(state.trash || []).filter(t => ['swim', 'trainings'].includes(t.collection)).map(t => t.record)].map(r => r.id));
  for (const item of [...state.media, ...(state.trash || []).filter(t => t.collection === 'media').map(t => t.record)]) if (item.recordId && !ids.has(item.recordId)) throw new Error('素材关联记录不存在');
}
export function auditPrdState(state) {
  const issues = [];
  const add = (scope, id, field, problem) => issues.push({ scope, id, field, problem });
  for (const field of ['sex', 'birthDate']) if (!state.profile?.[field]) add('profile', 'nico', field, '真实信息待确认，不自动补造');
  const records = Object.entries(state).filter(([, value]) => Array.isArray(value));
  const counts = Object.fromEntries(records.filter(([key]) => !['trash', 'planHistory'].includes(key)).map(([key, value]) => [key, value.length]));
  for (const [key, collection] of records) {
    for (const item of collection) {
      const record = key === 'trash' ? item.record : item;
      const type = key === 'trash' ? item.collection : key;
      if (!['growth', 'swim'].includes(type)) continue;
      try { validatePrdRecord(type, record); } catch (error) { add(type, record.id, '*', error.message); }
      const fields = type === 'growth' ? BODY_FIELDS.filter(f => f !== 'armSpan') : ['location', ...(record.recordType === '测试' ? ['testedBy', 'testAgeGroup', 'testItem'] : record.recordType === '比赛' ? ['ageGroup', 'team', 'competitionSession', 'isFinal', 'eventName', 'heat', 'lane'] : ['recordType']), 'previousTime', 'rank', 'winnerTime'];
      for (const field of fields) if (!hasValue(record[field]) || field === 'recordType' && record[field] === '未知') add(type, record.id, field, '未记录，需实际来源补录');
      if (type === 'swim' && record.isFinal === true && record.preliminaryRank == null) add(type, record.id, 'preliminaryRank', '决赛预赛排名待补录');
      if (type === 'swim' && !record.mediaIds?.length) add(type, record.id, 'mediaIds', '没有已确认关联的影像，不按日期猜测');
    }
  }
  return { schemaVersion: state.schemaVersion || 1, counts, issues };
}
