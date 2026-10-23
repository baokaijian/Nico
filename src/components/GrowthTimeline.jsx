import { useMemo, useState } from 'react';
import { growthTimeline } from '../../shared/growth-timeline.mjs';
import { today } from '../services/files';
import useGrowthForm from '../services/useGrowthForm';
import { Field, Empty, Message } from './ui';
import { EvidencePicker, GrowthForm, GrowthHistory, GrowthActionDialog } from './GrowthUI';
import SourceWorkspace from './SourceWorkspace';
const defaults = () => ({ title:'', date:today(), body:'', status:'待确认', evidenceRefs:[] });
export default function GrowthTimeline(props) {
  const { data, readOnly, focusId }=props;
  const [filters,setFilters]=useState({year:'',month:'',stroke:'',type:''}),[source,setSource]=useState(null),[action,setAction]=useState(null);
  const events=useMemo(()=>growthTimeline(data,filters).filter(row=>!focusId||row.collection==='growthStories'&&row.recordId===focusId),[data,filters,focusId]);
  const all=useMemo(()=>growthTimeline(data),[data]);
  const form=useGrowthForm({...props,collection:'growthStories',defaults});
  const labels={trainings:'训练',swim:'成绩',skillAssessments:'技能测评',goals:'成长目标',milestones:'已确认里程碑',media:'关联影像',growthStories:'人工故事',competitionEvents:'赛事'};
  return <div className="stack"><header><h1>成长时间轴</h1><p>每一次实际记录都有出处；待确认观察单独标明。</p></header><Message>私有档案。首条有效成绩是基线；后续同项目、泳姿、池长和打腿项目的有效成绩才比较历史PB。</Message>{!focusId&&<div className="filter-bar">{[['year','年份',[...new Set(all.map(r=>r.date.slice(0,4)))]],['month','月份',Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))],['stroke','泳姿',[...new Set(all.map(r=>r.stroke).filter(Boolean))]],['type','事件类型',Object.keys(labels)]].map(([key,label,options])=><Field key={key} field={{key,label,type:'select',options,optionLabels:key==='type'?labels:undefined,emptyLabel:'全部'}} value={filters[key]} onChange={value=>setFilters(f=>({...f,[key]:value}))}/>)}</div>}
    {!readOnly&&<GrowthForm form={form} title="记录人工成长故事"><div className="form-grid"><Field field={{key:'title',label:'故事标题',type:'text',required:true}} value={form.values.title} onChange={v=>form.change('title',v)}/><Field field={{key:'date',label:'发生日期',type:'date',required:true}} value={form.values.date} onChange={v=>form.change('date',v)}/></div><Field field={{key:'body',label:'实际观察与孩子原话',type:'textarea',required:true}} value={form.values.body} onChange={v=>form.change('body',v)}/><EvidencePicker data={data} value={form.values.evidenceRefs} onChange={v=>form.change('evidenceRefs',v)}/></GrowthForm>}
    {events.length?events.map(event=>{const story=event.collection==='growthStories'&&data.growthStories.find(r=>r.id===event.recordId);return <article className="glass-card timeline-event" key={event.id}><small>{event.date} · {labels[event.collection]} · {event.status}</small><h2>{event.title}{event.isPB?' · 有效PB更新':''}</h2><p className="preserve-lines">{event.detail}</p><small className="source-id">{event.collection}/{event.recordId}</small>{story?<><div className="actions">{!readOnly&&<>{story.status==='待确认'&&<><button onClick={()=>form.edit(story)}>编辑故事</button><button onClick={()=>setAction(story)}>人工确认故事</button></>}<button onClick={()=>form.remove(story)}>移入回收站</button></>}</div><GrowthHistory data={data} collection="growthStories" id={story.id}/></>:<div className="actions"><button onClick={()=>setSource({collection:event.collection,id:event.recordId})}>查看原记录</button></div>}</article>}):<Empty>此范围没有记录。可以从工作台记录真实训练，或保存一段人工观察。</Empty>}
    {source&&<SourceWorkspace {...props} source={source} onClose={()=>setSource(null)}/>}{action&&<GrowthActionDialog {...props} collection="growthStories" record={action} action="confirm" onClose={()=>setAction(null)}/>}
  </div>;
}
