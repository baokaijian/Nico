import { useState } from 'react';
import { FIELDS } from '../../shared/domain.mjs';
import { SKILL_LEVELS } from '../../shared/growth-model.ts';
import { Modal } from './ui';

const growthFields = { name: '技能名称', dimension: '能力维度', date: '日期', assessor: '评估人', level: '明确测评等级', status: '状态', evidenceNote: '实际证据', improvementNote: '改进说明', title: '名称', baselineText: '起始能力或成绩', targetResult: '目标结果', criteria: '达成标准', deadline: '截止日期', confirmedBy: '人工确认人', confirmationNote: '确认说明', version: '记录版本', definitionVersion: '依据标准版本', reviewedBy: '标准审核人', notes: '备注' };

function sourceLabel(data, id) {
  const record = Object.keys(FIELDS).map(key => data[key]?.find(r => r.id === id)).find(Boolean);
  return record ? [record.date, record.title || record.name || record.standardSnapshot?.name || record.session || record.athleteIdentity || (record.distance ? `${record.distance}${record.stroke}` : '原始记录')].filter(Boolean).join(' · ') : id;
}
export function RecordSourceModal({ data, sourceId, onClose }) {
  const collection = Object.keys(FIELDS).find(key => data[key]?.some(r => r.id === sourceId));
  const record = collection && data[collection].find(r => r.id === sourceId);
  if (!record) return null;
  const fields = record.modelVersion === 1 ? Object.entries(growthFields).filter(([key]) => record[key] !== undefined).map(([key, label]) => ({ key, label })) : FIELDS[collection];
  const standard = record.standardSnapshot || (collection === 'skillDefinitions' ? record : null);
  return <Modal title={`原始记录 · ${record.id}`} onClose={onClose}><p className="muted">以下为原始输入，未确认的目标或备注不作为训练指令。</p><dl className="record-fields">{fields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{String(record[f.key] ?? '未填写')}</dd></div>)}</dl>{standard && <section><h3>当时依据：{standard.name} · v{standard.version}</h3><ol>{SKILL_LEVELS.map(level => <li key={level}>{level}：{standard.levels[level]}</li>)}</ol></section>}</Modal>;
}
export default function RecordSources({ data, ids }) {
  const [sourceId, setSourceId] = useState(null);
  return <><small>依据：{ids.length ? ids.map(id => <button className="source-button" key={id} onClick={() => setSourceId(id)}>{sourceLabel(data, id)}</button>) : '当前记录集合为空或尚无适用记录'}</small><RecordSourceModal data={data} sourceId={sourceId} onClose={() => setSourceId(null)}/></>;
}
