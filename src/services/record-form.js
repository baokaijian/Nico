import { FIELDS } from '../../shared/domain.mjs';
import { editableGrowth } from '../../shared/growth-model.ts';
import { TEST_ITEMS } from '../../shared/prd.mjs';

const SIMPLE_KEYS = {
  trainings: ['date', 'durationMinutes', 'totalMeters', 'completionStatus'],
  nutrition: ['date', 'sleepHours', 'fatigue', 'discomfort', 'willingness'],
  swim: ['date', 'distance', 'stroke', 'testItem', 'poolLength', 'time', 'validityStatus'],
  growth: ['date', 'height', 'weight', 'measurementMethod', 'recordedBy'],
  fitness: ['date', 'standingJump', 'plankSeconds', 'sitAndReach', 'measurementMethod', 'recordedBy'],
};

const SWIM_CONDITION_KEYS = ['startType', 'timingMethod', 'recordType'];

export function quickFields(type, values = {}, fields = FIELDS[type] || []) {
  const kicking = type === 'swim' && values?.stroke === '打腿';
  const grouped = type === 'trainings' && values?.entryMode === '训练组';
  const rawPrimaryKeys = SIMPLE_KEYS[type] || fields.map(field => field.key);
  const primaryKeys = rawPrimaryKeys.filter(key => {
    if (type === 'swim' && key === 'testItem') return kicking;
    if (type === 'trainings' && key === 'totalMeters') return !grouped;
    return true;
  });
  const options = fields.map(field => type === 'swim' && field.key === 'testItem' ? {
    ...field, label: kicking ? '具体打腿项目' : field.label, required: kicking,
    options: field.options.filter(item => !values?.stroke || (kicking ? item.includes('打腿') : item === values.stroke)),
    emptyLabel: kicking ? '请选择具体打腿项目' : '未填写',
    description: kicking ? '请按实际训练选择具体项目；仅选择“打腿”还不能保存。' : '',
  } : field);
  const primary = primaryKeys.map(key => options.find(field => field.key === key)).filter(Boolean);
  const conditions = type === 'swim'
    ? SWIM_CONDITION_KEYS.map(key => options.find(field => field.key === key)).filter(Boolean)
    : [];
  const excludedFromSecondary = new Set([
    ...primaryKeys,
    ...(type === 'swim' ? [...SWIM_CONDITION_KEYS, ...(!kicking ? ['testItem'] : [])] : []),
    ...(type === 'trainings' && grouped ? ['totalMeters'] : []),
  ]);
  const secondary = options.filter(field => !excludedFromSecondary.has(field.key));
  const result = [...primary];
  Object.assign(result, {
    primary,
    conditions,
    secondary,
    keys: primary.map(field => field.key),
    conditionKeys: conditions.map(field => field.key),
    secondaryKeys: secondary.map(field => field.key),
  });
  return result;
}

export function recordFormFields(type, fields = FIELDS[type] || [], values = {}) {
  const resolved = quickFields(type, values, fields);
  return {
    primary: resolved.primary,
    conditions: resolved.conditions,
    secondary: resolved.secondary,
  };
}

export function changeRecordField(type, values, key, value) {
  const next = { ...values, [key]: value };
  if (type === 'swim' && key === 'stroke' && values.testItem) {
    const matches = TEST_ITEMS.includes(values.testItem) && (value === '打腿' ? values.testItem.includes('打腿') : values.testItem === value);
    if (!matches) next.testItem = '';
  }
  return next;
}

export function editableManagementRecord(collection, record) {
  if (['weakpoints', 'checkins'].includes(collection)) return Object.fromEntries(FIELDS[collection].filter(field => record[field.key] !== undefined).map(field => [field.key, record[field.key] ?? '']));
  return editableGrowth(collection, record);
}
