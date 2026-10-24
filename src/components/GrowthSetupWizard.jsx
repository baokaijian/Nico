import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {growthSetup} from '../../shared/growth-setup.mjs';
import {createSetupProgress} from '../services/setup-progress';
import {today} from '../services/files';
import {Message,Modal} from './ui';
import SourceWorkspace from './SourceWorkspace';
const Skills=lazy(()=>import('./Skills'));
const stateLabel={ready:'已整理','needs-action':'待处理',empty:'暂无记录'};
export default function GrowthSetupWizard(props){
 const {data,api,navigate,openQuickEntry,role}=props,scope=api.getDraftScope(),store=useMemo(()=>createSetupProgress({scope,isCurrent:s=>api.getDraftScope()===s}),[api,scope]),[position,setPosition]=useState(()=>store.read()),[source,setSource]=useState(null),[standardsOpen,setStandardsOpen]=useState(false),[notice,setNotice]=useState(''),day=today(),model=useMemo(()=>growthSetup(data,day),[data,day]);
 useEffect(()=>setPosition(store.read()),[store]);
 const current=model.steps.find(s=>s.id===position.activeStep)||model.steps[0],index=model.steps.indexOf(current);
 const remember=next=>{setPosition(next);setNotice(store.write(next)?'':'当前设备无法记住位置，仍可继续使用；真实资料不会受影响。');};
 const choose=id=>remember({...position,activeStep:id,deferredIds:position.deferredIds.filter(k=>k!==id)});
 const defer=()=>remember({activeStep:model.steps[(index+1)%model.total].id,deferredIds:[...new Set([...position.deferredIds,current.id])]});
 if(role!=='owner')return <Message>首次使用引导仅限家长管理者，真实核验和资料录入仍遵守原有权限。</Message>;
 return <div className="stack growth-setup"><header><h1>整理真实成长档案</h1><p>从已有资料开始，一次处理一件事。可以跳过，稍后再回来。</p></header><div className="setup-summary"><p><b>{model.readyCount} / {model.total}</b> 步已按真实资料整理</p><progress value={model.readyCount} max={model.total} aria-label="根据真实资料计算的已整理步骤"/><p>稍后处理不计作完成；尚无记录不代表孩子没有训练或不会这项技能。</p></div><nav className="setup-steps" aria-label="首次使用步骤">{model.steps.map((step,i)=><button key={step.id} aria-current={step.id===current.id?'step':undefined} onClick={()=>choose(step.id)}><span className="setup-number">{i+1}</span><span>{step.title}<small>{stateLabel[step.status]}{position.deferredIds.includes(step.id)&&step.status!=='ready'?' · 稍后处理':''}</small></span></button>)}</nav><Message>{notice}</Message>
 <section className="glass-card setup-workspace"><div className="section-head"><h2>{current.title}</h2><span className="badge">{stateLabel[current.status]}</span></div><p>{current.summary}</p><p>{current.guidance}</p>
 <div className="actions">{current.id==='skills'&&<><button className="apple-btn apple-btn-primary" onClick={()=>setStandardsOpen(true)}>配置或审核技能标准</button><button onClick={()=>openQuickEntry('skill')}>录入真实基线测评</button></>}{current.id==='training'&&<button className="apple-btn apple-btn-primary" onClick={()=>openQuickEntry('training')}>记录本次真实训练</button>}{current.id==='scores'&&!current.records.length&&<button onClick={()=>openQuickEntry('score')}>记录真实成绩</button>}{current.id==='goals'&&!current.records.length&&<button onClick={()=>navigate('growth','goals')}>按实际需要建立目标</button>}{current.id==='media'&&!current.records.length&&<button onClick={()=>openQuickEntry('media')}>添加真实影像</button>}</div>
 {!!current.records.length&&<div className="setup-records">{current.records.map(ref=>{const row=data[ref.collection]?.find(r=>r.id===ref.id);return <article key={`${ref.collection}/${ref.id}`}><div><b>{row?.title||row?.name||row?.trainingType||row?.session||row?.standardSnapshot?.name||`${row?.date||''} ${row?.distance||''}${row?.stroke||''}`}</b><p>{row?.status||row?.validityStatus||'已录入原始记录'}</p></div><button onClick={()=>setSource(ref)}>核对这条记录</button></article>;})}</div>}
 {current.id==='skills'&&<p className="muted">已保存的待确认测评请到待办中心独立确认；改变标准版本后，旧等级继续留在历史中。</p>}
 <div className="setup-footer actions"><button onClick={defer}>稍后处理此步</button><button onClick={()=>choose(model.steps[(index+1)%model.total].id)}>下一步</button><button onClick={()=>navigate('workbench','home')}>返回工作台，稍后继续</button></div></section>
 <p><button onClick={()=>navigate('workbench','tasks')}>查看全部真实待办</button> · 真人操作验收请使用仓库中的验收记录模板，软件状态不代替家长验收。</p>
 {source&&<SourceWorkspace {...props} source={source} onClose={()=>setSource(null)}/>}{standardsOpen&&<Modal title="配置真实技能标准" onClose={()=>setStandardsOpen(false)}><Suspense fallback={<Message>正在打开现有技能标准…</Message>}><Skills {...props} initialSection="standards"/></Suspense></Modal>}</div>;
}
