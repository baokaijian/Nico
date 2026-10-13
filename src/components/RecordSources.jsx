import { useState } from 'react';
import { FIELDS } from '../../shared/domain.mjs';
import { Modal } from './ui';

function sourceLabel(data, id) {
  const record = Object.keys(FIELDS).map(key => data[key]?.find(r => r.id === id)).find(Boolean);
  return record ? [record.date, record.title || record.session || record.athleteIdentity || (record.distance ? `${record.distance}${record.stroke}` : '原始记录')].filter(Boolean).join(' · ') : id;
}
export function RecordSourceModal({ data, sourceId, onClose }) {
  const collection = Object.keys(FIELDS).find(key => data[key]?.some(r => r.id === sourceId));
  const record = collection && data[collection].find(r => r.id === sourceId);
  if (!record) return null;
  return <Modal title={`原始记录 · ${record.id}`} onClose={onClose}><p className="muted">以下为原始输入，未确认的目标或备注不作为训练指令。</p><dl className="record-fields">{FIELDS[collection].map(f => <div key={f.key}><dt>{f.label}</dt><dd>{String(record[f.key] ?? '未填写')}</dd></div>)}</dl></Modal>;
}
export default function RecordSources({ data, ids }) {
  const [sourceId, setSourceId] = useState(null);
  return <><small>依据：{ids.length ? ids.map(id => <button className="source-button" key={id} onClick={() => setSourceId(id)}>{sourceLabel(data, id)}</button>) : '当前记录集合为空或尚无适用记录'}</small><RecordSourceModal data={data} sourceId={sourceId} onClose={() => setSourceId(null)}/></>;
}
