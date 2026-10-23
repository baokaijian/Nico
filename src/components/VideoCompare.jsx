import { useEffect, useRef, useState } from 'react';
import { comparisonPosition, comparisonRate } from '../../shared/video-comparison.mjs';
import { today } from '../services/files';
import useGrowthForm from '../services/useGrowthForm';
import { Field, Empty, Message } from './ui';
import { GrowthForm, GrowthHistory } from './GrowthUI';
const defaults=()=>({title:'',date:today(),leftMediaId:'',rightMediaId:'',leftSecond:0,rightSecond:0,mode:'独立',rate:1,observation:'',skillId:'',assessmentId:'',notes:''});
function usePrivateVideo(api,id) {
  const [state,setState]=useState({url:'',error:''});
  useEffect(()=>{const controller=new AbortController();let loaded;setState({url:'',error:''});if(id)api.mediaBlob(id,'playback',controller.signal).then(url=>{loaded=url;if(controller.signal.aborted)URL.revokeObjectURL(url);else setState({url,error:''});}).catch(error=>{if(error.name!=='AbortError')setState({url:'',error:error.message});});return()=>{controller.abort();if(loaded)URL.revokeObjectURL(loaded);};},[api,id]);
  return state;
}
export function ComparisonPlayer({api,data,value,onChange}) {
  const [local,setLocal]=useState(value),[error,setError]=useState('');
  useEffect(()=>{setLocal(value);setError('');},[value]);
  const params=onChange?value:local, update=(key,v)=>onChange?onChange(key,v):setLocal(p=>({...p,[key]:v}));
  const players=useRef([]),left=usePrivateVideo(api,params.leftMediaId),right=usePrivateVideo(api,params.rightMediaId);
  useEffect(()=>{for(const player of players.current)if(player)player.playbackRate=comparisonRate(params.rate);},[params.rate,left.url,right.url]);
  const pause=()=>players.current.forEach(player=>player?.pause());
  const align=index=>{
    if(params.mode!=='同步')return;
    const current=players.current[index],other=players.current[1-index];if(!current||!other||!Number.isFinite(other.duration))return;
    const origins=[Number(params.leftSecond),Number(params.rightSecond)];
    try {const target=comparisonPosition(current.currentTime,origins[index],origins[1-index],other.duration);if(target.ended){pause();return;}if(Math.abs(other.currentTime-target.time)>0.15)other.currentTime=target.time;}
    catch(problem){setError(problem.message);pause();}
  };
  const play=async()=>{
    setError('');pause();
    try {for(const [index,player]of players.current.entries()){const point=Number(index?params.rightSecond:params.leftSecond);if(!player||!Number.isFinite(player.duration)||point>=player.duration||point<0)throw Error('请等待两个视频可播放，并选择小于时长的对比点');player.currentTime=point;player.playbackRate=comparisonRate(params.rate);}if(!left.url||!right.url)throw Error('请先选择并读取两个视频');await Promise.all(players.current.map(player=>player.play()));}
    catch(problem){pause();setError(`播放未完成：${problem.message}`);}
  };
  return <section className="comparison-player stack"><div className="form-grid"><Field field={{key:'mode',label:'播放模式',type:'select',options:['独立','同步']}} value={params.mode} onChange={v=>{pause();update('mode',v);}}/><Field field={{key:'rate',label:'播放速度',type:'select',options:['0.5','0.75','1'],optionLabels:{'0.5':'0.5x','0.75':'0.75x','1':'1x'}}} value={String(params.rate)} onChange={v=>update('rate',Number(v))}/></div><Message error>{error||left.error||right.error}</Message><div className="comparison-grid">{[['left',left],['right',right]].map(([side,asset],index)=><article key={side}><h3>视频{index?'B':'A'} · {data.media.find(row=>row.id===params[`${side}MediaId`])?.title||'未选择'}</h3>{asset.url?<video key={asset.url} ref={el=>{players.current[index]=el;}} src={asset.url} controls playsInline preload="metadata" aria-label={`对比视频${index?'B':'A'}`} onLoadedMetadata={e=>{e.currentTarget.playbackRate=comparisonRate(params.rate);}} onError={()=>{pause();setError('视频格式或网络暂不可播放，请在影像页处理兼容副本后重试。');}} onPlay={()=>{if(params.mode==='同步'){align(index);const other=players.current[1-index];if(other?.paused)other.play().catch(problem=>{pause();setError(problem.message);});}}} onPause={()=>{if(params.mode==='同步')pause();}} onSeeked={()=>align(index)} onTimeUpdate={e=>{if(!e.currentTarget.paused)align(index);}} onEnded={()=>{if(params.mode==='同步')pause();}}/>:<Empty>{asset.error?'视频读取失败，可重新选择素材重试。':'选择视频后，通过私有接口读取。'}</Empty>}<Field field={{key:`${side}Second`,label:`视频${index?'B':'A'}对比起点（秒）`,type:'number',min:0,max:86400,step:0.001}} value={params[`${side}Second`]} onChange={v=>update(`${side}Second`,v)}/><button type="button" onClick={()=>{const player=players.current[index];if(player&&Number.isFinite(player.currentTime))update(`${side}Second`,Math.round(player.currentTime*1000)/1000);}}>将当前画面设为对比点{index?'B':'A'}</button></article>)}</div><div className="actions"><button type="button" disabled={!left.url||!right.url} onClick={play}>从对比点播放两段</button><button type="button" onClick={pause}>暂停两段</button></div><small>同步按各自起点的相对时间对齐，任一片段结束停止双方。独立模式使用各自播放器控制。素材时长未知时请先实际播放核对时间点。</small></section>;
}
export default function VideoCompare(props) {
  const {data,readOnly,focusId}=props,form=useGrowthForm({...props,collection:'videoComparisons',defaults}),[activeId,setActiveId]=useState(focusId||'');
  const videos=data.media.filter(row=>row.type==='video'),active=(data.videoComparisons||[]).find(row=>row.id===activeId);
  return <div className="stack"><header><h1>技术动作视频 A/B 对比</h1><p>保留两段真实影像，记录可见的技术观察。</p></header><Message>私有视频不复制到公开存储。观察不自动改变技能等级、成绩或成长事件。</Message>{!readOnly&&<GrowthForm form={form} title={form.editing?'编辑技术对比记录':'新建技术对比'}><div className="form-grid"><Field field={{key:'title',label:'对比标题',type:'text',required:true}} value={form.values.title} onChange={v=>form.change('title',v)}/><Field field={{key:'date',label:'观察日期',type:'date',required:true}} value={form.values.date} onChange={v=>form.change('date',v)}/>{['left','right'].map((side,index)=><Field key={side} field={{key:`${side}MediaId`,label:`选择视频${index?'B':'A'}`,type:'select',required:true,options:videos.map(row=>row.id),optionLabels:Object.fromEntries(videos.map(row=>[row.id,`${row.date} · ${row.title}`]))}} value={form.values[`${side}MediaId`]} onChange={v=>{form.change(`${side}MediaId`,v);form.change(`${side}Second`,0);}}/>)}</div><ComparisonPlayer api={props.api} data={data} value={form.values} onChange={form.change}/><Field field={{key:'observation',label:'手工技术观察（只写实际看见的内容）',type:'textarea',required:true}} value={form.values.observation} onChange={v=>form.change('observation',v)}/><details><summary>关联技能、测评和证据限制（可选）</summary><Field field={{key:'skillId',label:'技能标准',type:'select',options:data.skillDefinitions.map(row=>row.id),optionLabels:Object.fromEntries(data.skillDefinitions.map(row=>[row.id,`${row.name} · v${row.version}`]))}} value={form.values.skillId} onChange={v=>{form.change('skillId',v);form.change('assessmentId','');}}/><Field field={{key:'assessmentId',label:'同技能测评',type:'select',options:data.skillAssessments.filter(row=>row.skillId===form.values.skillId).map(row=>row.id),optionLabels:Object.fromEntries(data.skillAssessments.map(row=>[row.id,`${row.date} ${row.level} · ${row.status}`]))}} value={form.values.assessmentId} onChange={v=>form.change('assessmentId',v)}/><Field field={{key:'notes',label:'证据限制与备注',type:'textarea'}} value={form.values.notes} onChange={v=>form.change('notes',v)}/></details></GrowthForm>}
    {active&&<section className="glass-card"><h2>{active.title}</h2><ComparisonPlayer key={active.id} api={props.api} data={data} value={active}/><p className="preserve-lines">{active.observation}</p><p>{active.notes||'未填写证据限制'}</p></section>}
    {(data.videoComparisons||[]).length?(data.videoComparisons||[]).filter(row=>!focusId||row.id===focusId).map(row=><article className="glass-card" key={row.id}><h2>{row.title}</h2><p>{row.date} · {row.status} · v{row.version}</p><p className="preserve-lines">{row.observation}</p><div className="actions"><button onClick={()=>setActiveId(row.id)}>打开对比</button>{!readOnly&&<><button onClick={()=>form.edit(row)}>编辑对比备注</button><button onClick={()=>form.remove(row)}>移入回收站</button></>}</div><GrowthHistory data={data} collection="videoComparisons" id={row.id}/></article>):<Empty>尚无对比记录。选择两段已上传的视频，手动观察后保存。</Empty>}
  </div>;
}
