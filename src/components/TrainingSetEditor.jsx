import { TRAINING_STROKES, validateTrainingSets, setTotals } from '../../shared/training.ts';
import { Field, Message } from './ui';
export function TrainingSetSummary({ sets, template = false }) {
  try {
    const totals = setTotals(validateTrainingSets(sets, template));
    return <p role="status">参考计划量：{totals.plannedMeters == null ? '未填完整' : `${totals.plannedMeters}米`}{!template && <> · 实际量：{totals.totalMeters == null ? `尚未填完整（已知${totals.knownMeters}米，${totals.unknown}组待填）` : `${totals.totalMeters}米`}</>}</p>;
  } catch (error) { return <Message>{error.message}；填写完成后会自动汇总。</Message>; }
}
export default function TrainingSetEditor({ sets, onChange, template = false, disabled = false }) {
  const update = (index, key, value) => onChange(sets.map((set, i) => i === index ? { ...set, [key]: value } : set));
  return <fieldset disabled={disabled} className="training-sets"><legend>{template ? '模板中的训练安排' : '专业训练组'}</legend><p className="muted">每组填写每次距离和次数；{template ? '模板只保存计划，不保存实际完成。' : '实际次数留空表示未知，明确填0表示没有完成。'}</p>
    {sets.map((set, index) => <fieldset key={set.id} className="training-set"><legend>第{index + 1}组</legend><div className="form-grid">
      {[{ key: 'task', label: '练习内容', type: 'text' }, { key: 'stroke', label: '泳姿', type: 'select', options: TRAINING_STROKES }, { key: 'distanceMeters', label: '每次距离（米）', type: 'number', min: 0.01, max: 5000, step: 0.01, required: true }, { key: 'plannedRepeats', label: '计划次数（参考）', type: 'number', min: 0, max: 2000, integer: true }, ...(!template ? [{ key: 'completedRepeats', label: '实际完成次数', type: 'number', min: 0, max: 2000, integer: true }] : []), { key: 'restSeconds', label: '间歇（秒，可选）', type: 'number', min: 0, max: 3600, integer: true }].map(field => <Field key={field.key} field={field} value={set[field.key]} onChange={value => update(index, field.key, value)}/>)}
      <label className="training-check"><input type="checkbox" checked={set.isKick === true} onChange={e => update(index, 'isKick', e.target.checked)}/>其中打腿练习</label>
    </div><button type="button" className="apple-btn apple-btn-secondary" onClick={() => onChange(sets.filter((_, i) => i !== index))}>移除第{index + 1}组</button></fieldset>)}
    <button type="button" disabled={sets.length >= 50} className="apple-btn apple-btn-secondary" onClick={() => onChange([...sets, { id: crypto.randomUUID(), task: '', stroke: '', distanceMeters: '', plannedRepeats: '', completedRepeats: null, restSeconds: '', isKick: false }])}>添加训练组</button>
    <TrainingSetSummary sets={sets} template={template}/>
  </fieldset>;
}
