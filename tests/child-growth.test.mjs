import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,normalizeState,publicSnapshot} from '../shared/domain.mjs';
import {saveGrowth,actGrowth} from '../shared/growth-records.mjs';
import {childProjection,childContext} from '../shared/child-growth.mjs';
import {diagnoseQuality,recordReferences} from '../shared/data-quality.mjs';
const opts={id:'view',actor:'protocol-parent',now:'2000-01-03T00:00:00Z'};
test('儿童感受待审与照片失效引用可诊断，不能自动确认',()=>{
  const data={childViews:[{id:'view',selectedMediaIds:['gone']}],childReflections:[{id:'feeling',status:'待确认',viewId:'view',trainingId:''}]};
  assert.ok(diagnoseQuality(data,'2000-01-01').some(row=>row.ruleId==='DQ-CHILD-REVIEW'));assert.deepEqual(recordReferences('childViews',data.childViews[0]),[{collection:'media',id:'gone'}]);
});
test('儿童摘要只含已确认成长和同口径有效PB，照片由家长选择，不返回完整事实',()=>{
  const data=emptyState();data.media=[{id:'photo',date:'2000-01-01',type:'photo',title:'合成照片',url:'/uploads/photo.png'},{id:'private',date:'2000-01-01',type:'video',title:'原片',url:'/uploads/private.mp4'}];
  const view=saveGrowth(data,'childViews',{title:'我的成长',theme:'自由呼吸',selectedMediaIds:['photo'],status:'启用'},opts);
  data.swim=[{id:'valid',date:'2000-01-01',stroke:'自由泳',distance:'50m',poolLength:'25m',timeMs:60000,validityStatus:'有效'},{id:'unchecked',date:'2000-01-02',stroke:'自由泳',distance:'50m',poolLength:'25m',timeMs:50000,validityStatus:'未核验'}];
  data.milestones=[{id:'m',date:'2000-01-01',title:'已确认一步',status:'已确认'},{id:'pending',date:'2000-01-02',title:'不可称突破',status:'待确认'}];
  const out=childProjection(data,view.id,'2000-01-03');assert.equal(out.bests[0].timeMs,60000);assert.equal(out.milestones.length,1);assert.equal(out.photos[0].id,'photo');assert.doesNotMatch(JSON.stringify(out),/uploads|private\.mp4|不可称突破|createdBy|profile/);
  assert.deepEqual(publicSnapshot(data).media,[]);assert.doesNotThrow(()=>childContext(data,{viewId:'view',viewVersion:1}));view.version++;assert.throws(()=>childContext(data,{viewId:'view',viewVersion:1}),/授权/);
});
test('儿童感受是独立待确认实体，不能带入确认或事实元数据，历史可恢复',()=>{
  const data=emptyState();saveGrowth(data,'childViews',{title:'我的成长',theme:'练习主题',selectedMediaIds:[],status:'启用'},opts);
  const input={date:'2000-01-03',viewId:'view',trainingId:'',mood:'开心',text:'想再试一次'};
  const row=saveGrowth(data,'childReflections',input,{...opts,id:'feeling'});assert.equal(row.status,'待确认');assert.equal(data.trainings.length,0);
  assert.equal(saveGrowth(data,'childReflections',{...input,mood:'不想说',text:''},{...opts,id:'quiet'}).text,'');
  assert.throws(()=>saveGrowth(data,'childReflections',{...input,status:'已确认'},{...opts,id:'forged'}));
  actGrowth(data,'childReflections',row.id,'confirm',{confirmedBy:'协议家长',note:'照孩子原话核对'},opts);assert.equal(data.childReflections[0].status,'已确认');assert.equal(data.growthHistory.filter(r=>r.recordId==='feeling').length,2);assert.doesNotThrow(()=>normalizeState(data));
  assert.throws(()=>saveGrowth(data,'childViews',{title:'bad',theme:'bad',selectedMediaIds:['missing'],status:'启用'},{...opts,id:'bad'}));
});
