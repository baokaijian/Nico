import {useCallback,useEffect,useState} from 'react';
import {Message} from './ui';
const labels={login:'登录',session:'会话',health:'健康检查',publicRead:'公开读取',mediaRead:'私有素材读取',upload:'上传原片',processing:'兼容副本提交',processingFailure:'处理失败上报',backup:'备份读取',restore:'恢复',read:'档案读取',write:'档案保存',other:'其他'};
const time=value=>value?new Date(value).toLocaleString():'未采集';
function Counts({value}) {
  if(!value)return <p className="muted">尚无观测样本。</p>;
  return <><p className="muted">窗口：{time(value.startedAt)} 至 {time(value.observedAt)}；异常 {value.pageErrors} 次；日志限流丢弃 {value.droppedLogs} 条。</p><div className="history-table-container"><table className="history-table"><thead><tr><th>请求</th><th>次数</th><th>成功</th><th>权限拒绝</th><th>冲突</th><th>其他错误</th><th>平均耗时</th></tr></thead><tbody>{Object.entries(value.groups).map(([key,row])=><tr key={key}><td>{labels[key]||'其他'}</td><td>{row.requests}</td><td>{row.ok}</td><td>{row.unauthorized}</td><td>{row.conflict}</td><td>{row.invalid+row.serverError+row.networkError}</td><td>{Math.round(row.durationMs/row.requests)} ms</td></tr>)}</tbody></table></div></>;
}
export default function HealthPanel({api}) {
  const [server,setServer]=useState(null),[device,setDevice]=useState(()=>api.health.snapshot()),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const expected=import.meta.env.NICO_RELEASE;
  const refresh=useCallback(async(signal)=>{setBusy(true);setError('');try{const value=await api.request('/api/health',{signal});if(!signal?.aborted)setServer(value);}catch(problem){if(problem.name!=='AbortError')setError(problem.status===404?'本机服务尚未提供云端健康统计；设备计数仍可查看。':problem.message);}finally{if(!signal?.aborted){setDevice(api.health.snapshot());setBusy(false);}}},[api]);
  useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[refresh]);
  const matches=server&&expected?.sourceHash===server.release.sourceHash;
  function download(){const blob=new Blob([JSON.stringify({schema:1,frontend:expected,device:api.health.snapshot(),server},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nico-health.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const ops=server?.operations;
  return <section className="stack"><header className="flex-between"><div><h1>运行健康</h1><p className="muted">仅记录程序版本、请求分类和数字，不记录档案内容。</p></div><div className="actions"><button disabled={busy} onClick={()=>refresh()}>{busy?'正在核对…':'刷新诊断'}</button><button onClick={download}>导出无内容诊断</button></div></header><Message error>{error}</Message>
    <article className="glass-card"><h2>版本核对</h2><p>{server?(server.release.sourceHash?(matches?'前后端程序版本一致':'前后端程序版本不一致，请刷新页面或联系维护者'):'本机开发服务：未进行生产版本核验'):'后端版本尚未确认'}</p><p className="muted">前端 {expected?.release||'开发版本'} · {expected?.commit?.slice(0,8)}；后端 {server?.release.release||'未读取'}。核对依据为 API 源码指纹。</p></article>
    <article className="glass-card"><h2>本设备观测</h2><p>仅本页面生命周期内计数，退出或更换账号后清空。</p><Counts value={device}/></article>
    <article className="glass-card"><h2>当前后端实例</h2><p>实例冷启动会重置；全站趋势需按运维手册查询平台日志。</p><Counts value={server?.instance}/></article>
    <article className="glass-card"><h2>媒体与备份</h2>{ops?<><p>私有存储：{ops.storage?.count??'未知'} 个对象，{ops.storage?.bytes==null?'未知':(ops.storage.bytes/1024/1024).toFixed(1)} MB{ops.storage?.complete===false?'（列表不完整，不能当作总容量）':''}。</p><p>原始素材 {ops.media?.originals??'未知'}；视频 {ops.media?.videos??'未知'}；已处理 {ops.media?.processed??'未知'}；处理失败 {ops.media?.failed??'未知'}；待处理或未知 {ops.media?.pendingOrUnknown??'未知'}。这是当前记录状态，不是处理尝试成功率。</p><p>最近写前备份：{time(ops.backups?.latestAt)}；备份版本 {ops.backups?.latestRevision??'未知'}，当前版本 {ops.backups?.currentRevision??'未知'}。</p></>:<p>存储与备份信息尚未读取。</p>}<p className="muted">定时备份与自动恢复验证尚未配置。隔离恢复演练另记验收记录，不能证明已恢复生产档案。</p></article>
    <article className="glass-card"><h2>待人工验收</h2><p>真人45秒录入、真实手机、真实训练视频转码、浏览器PDF打印和完整无障碍。</p><p className="muted">生产业务样本不足，暂不启用错误率或延迟告警。版本不一致需立即排查；401 权限拒绝包含正常安全校验，不能计作服务故障。</p></article>
  </section>;
}
