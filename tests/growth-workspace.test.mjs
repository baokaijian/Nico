import test from 'node:test';
import assert from 'node:assert/strict';
import { skillWorkspace } from '../src/services/growth-workspace.js';
test('技能工作区只组合显式关联，打卡数量不改变确认等级', () => {
  const data = { skillAssessments: [{id:'a', skillId:'s', date:'2000-01-01', level:'L1',status:'已确认'}, {id:'b',skillId:'s',date:'2000-01-02',level:'L5',status:'待确认'}, {id:'c',skillId:'other',date:'2000-01-03',level:'L4',status:'已确认'}], weakpoints:[{id:'p',sourceType:'技能评估',sourceRef:'a'}, {id:'q',sourceType:'技能评估',sourceRef:'aa'}], checkins:[{id:'x',weakPointId:'p',times:200},{id:'y',weakPointId:'q'}], goals:[{id:'g',relatedSkillIds:['s']},{id:'u',relatedSkillIds:[]}] };
  const model=skillWorkspace(data,'s'); assert.equal(model.current.level,'L1'); assert.deepEqual(model.points.map(x=>x.id),['p']); assert.deepEqual(model.checkins.map(x=>x.id),['x']); assert.deepEqual(model.goals.map(x=>x.id),['g']); assert.equal(skillWorkspace(data,'missing').current,null);
});

test('编辑既有技术短板保留原字段，服务端元数据不进入可编辑值', async () => {
  const { editableManagementRecord } = await import('../src/services/record-form.js');
  const original={id:'point-one',date:'2000-01-01',title:'原技术短板',category:'技术动作',sourceType:'技能评估',sourceRef:'assessment-one',evidence:'原观察',targetPerWeek:3,drillHint:'原练习提示',status:'暂停',notes:'原备注',createdAt:'2000-01-01T00:00:00Z',creationRequest:{id:'receipt'}};
  const values=editableManagementRecord('weakpoints',original);
  assert.equal(values.title,original.title); assert.equal(values.evidence,original.evidence); assert.equal(values.sourceRef,original.sourceRef); assert.equal(values.targetPerWeek,3); assert.equal(values.status,'暂停'); assert.equal(values.drillHint,'原练习提示'); assert.equal(values.notes,'原备注'); assert.equal(editableManagementRecord('weakpoints',{...original,targetPerWeek:null}).targetPerWeek,''); assert.equal(values.id,undefined); assert.equal(values.creationRequest,undefined);
});

test('短板和打卡的真实数值可以存草稿，损坏反馈草稿拒绝恢复', async () => {
  const {validGrowthDraft,validFeedbackDraft}=await import('../src/services/drafts.js');
  assert.equal(validGrowthDraft({values:{title:'原短板',targetPerWeek:3},editing:'point-one',baseRevision:1,clientRequestId:'stable-request'}),true);
  assert.equal(validGrowthDraft({values:{times:0,durationMinutes:5},baseRevision:1,clientRequestId:'stable-request'}),true);
  assert.equal(validGrowthDraft({values:{targetPerWeek:{}},baseRevision:1,clientRequestId:'stable-request'}),false);
  assert.equal(validFeedbackDraft({values:{coachNotes:'原话'},baseRevision:1}),true);
  for(const payload of [{values:null,baseRevision:1},{values:{coachNotes:{}},baseRevision:1},{values:{coachNotes:'原话'},baseRevision:-1},{values:{coachNotes:'原话',totalMeters:999},baseRevision:1}]) assert.equal(validFeedbackDraft(payload),false);
});

test('切换技能后未提交打卡保留真实原关联并报告范围变化', async () => {
  const { practiceDraftContext }=await import('../src/services/growth-workspace.js');
  const data={skillAssessments:[{id:'a',skillId:'one',date:'2000-01-01',status:'已确认'}],weakpoints:[{id:'p',sourceType:'技能评估',sourceRef:'a',title:'原技能短板'}],checkins:[],goals:[]};
  const current=practiceDraftContext(data,'two',{weakPointId:'p',times:2},{sourceType:'技能评估',sourceRef:'a'});
  assert.equal(current.checkinPoint.title,'原技能短板'); assert.equal(current.checkinOutside,true); assert.equal(current.pointOutside,true);
  assert.equal(practiceDraftContext(data,'one',{weakPointId:'p'},{}).checkinOutside,false);
  assert.equal(practiceDraftContext(data,'two',{weakPointId:''},{}).checkinOutside,false);
});
