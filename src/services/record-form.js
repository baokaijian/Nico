import { FIELDS } from '../../shared/domain.mjs';
import { editableGrowth } from '../../shared/growth-model.ts';
const SIMPLE_KEYS = {
  trainings: ['date', 'plannedSessionId', 'durationMinutes', 'totalMeters', 'feeling', 'discomfort', 'coachNotes'],
  nutrition: ['date', 'sleepHours', 'fatigue', 'discomfort', 'willingness'],
  swim: ['date', 'distance', 'stroke', 'testItem', 'poolLength', 'time', 'startType', 'timingMethod', 'recordType', 'validityStatus'],
  growth: ['date', 'height', 'weight', 'measurementMethod', 'recordedBy'],
  fitness: ['date', 'standingJump', 'plankSeconds', 'sitAndReach', 'measurementMethod', 'recordedBy'],
};
export function recordFormFields(type, fields, values) {
  const keys = SIMPLE_KEYS[type] || fields.map(field => field.key);
  const kicking = values.stroke === '打腿';
  const options = fields.map(field => type === 'swim' && field.key === 'testItem' ? {
    ...field, label: kicking ? '具体打腿项目' : field.label, required: kicking,
    options: field.options.filter(item => !values.stroke || (kicking ? item.includes('打腿') : item === values.stroke)),
    emptyLabel: kicking ? '请选择具体打腿项目' : '未填写',
    description: kicking ? '请按实际训练选择具体项目；仅选择“打腿”还不能保存。' : '',
  } : field);
  return { primary: keys.map(key => options.find(field => field.key === key)).filter(Boolean), secondary: options.filter(field => !keys.includes(field.key)) };
}
export function changeRecordField(type, values, key, value) {
  const next = { ...values, [key]: value };
  if (type === 'swim' && key === 'stroke' && values.testItem) {
    const matches = TEST_ITEMS.includes(values.testItem) && (value === '打腿' ? values.testItem.includes('打腿') : values.testItem === value);
    if (!matches) next.testItem = '';
  }
  return next;
}
import { TEST_ITEMS } from '../../shared/prd.mjs';

export function editableManagementRecord(collection, record) {
  if (['weakpoints', 'checkins'].includes(collection)) return Object.fromEntries(FIELDS[collection].filter(field => record[field.key] !== undefined).map(field => [field.key, record[field.key] ?? '']));
  return editableGrowth(collection, record);
}
