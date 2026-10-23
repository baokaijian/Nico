import { useMemo, useState } from 'react';
import { diagnoseQuality } from '../../shared/data-quality.mjs';
import { today } from '../services/files';
import { Empty, Message } from './ui';
import SourceWorkspace from './SourceWorkspace';
export default function DataQuality(props) {
  const issues = useMemo(() => diagnoseQuality(props.data, today()), [props.data]);
  const [type, setType] = useState(''), [source, setSource] = useState(null);
  const visible = issues.filter(row => !type || row.type === type);
  return <div className="stack"><header><h1>数据质量</h1><p>按真实记录检查，帮助找回待处理事项。</p></header><Message>只读诊断，不修改数据。未记录不等于未完成；网络素材是否可播放需打开后验证。</Message><label>问题类型<select className="apple-input" value={type} onChange={e => setType(e.target.value)}><option value="">全部（{issues.length}）</option>{[...new Set(issues.map(row => row.type))].map(value => <option key={value}>{value}</option>)}</select></label><p role="status">当前{visible.length}项</p>{visible.length ? visible.map(row => <article className="glass-card" key={row.id}><div className="flex-between"><h2>{row.type}</h2><span>{row.priority}优先级</span></div><p>{row.message}</p><small className="source-id">{row.ruleId} · {row.collection}/{row.recordId}</small><div className="actions"><button onClick={() => setSource({ collection: row.collection, id: row.recordId })}>处理原记录</button></div></article>) : <Empty>此范围暂无待处理问题。完整性检查不代替人工核验。</Empty>}{source && <SourceWorkspace {...props} source={source} onClose={() => setSource(null)}/>}</div>;
}
