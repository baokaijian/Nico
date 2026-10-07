import { today } from '../services/files';
import { useMemo, useState } from 'react';
import { reportHTML } from '../../shared/reports.mjs';
import { rangeSummary, validDate } from '../../shared/domain.mjs';
import { Field } from './ui';
export default function Reports({ data }) {
  const [end, setEnd] = useState(today()), [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const html = useMemo(() => reportHTML(data, start, end), [data, start, end]);
  const summary = rangeSummary(data, start, end);
  const valid = validDate(start) && validDate(end) && end >= start;
  const saveHTML = () => { const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Nico-${start}-${end}-完整报告.html`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <div className="stack"><header className="no-print"><h1>周期报告与完整方案</h1><p className="muted">全部章节同时交付，不受当前选中的方案页面影响。</p></header><div className="glass-card no-print"><div className="form-grid"><Field field={{ key: 'start', label: '记录范围开始', type: 'date', required: true }} value={start} onChange={setStart}/><Field field={{ key: 'end', label: '记录范围结束', type: 'date', required: true }} value={end} onChange={setEnd}/></div><p>{!valid && '请选择有效日期范围，结束不能早于开始。'}</p><p>本周期：训练{summary.trainings.length}条，成绩{summary.swim.length}条，恢复{summary.nutrition.length}条。{summary.coverage == null ? '暂无已确认课次分母，覆盖率无法计算。' : `计划记录覆盖率${summary.coverage}%。`}</p><div className="actions"><button className="apple-btn apple-btn-primary" disabled={!valid} onClick={() => document.getElementById('report-preview').contentWindow.print()}>打印 / 保存PDF（全部章节）</button><button className="apple-btn apple-btn-secondary" disabled={!valid} onClick={saveHTML}>下载独立完整报告</button></div></div><iframe id="report-preview" className="report-preview" title="完整报告预览，共7章" srcDoc={html}/></div>;
}
