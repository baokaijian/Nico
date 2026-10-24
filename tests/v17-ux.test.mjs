import test from 'node:test';import assert from 'node:assert/strict';
import {adminTasks} from '../shared/admin-tasks.mjs';
import {diagnoseQuality} from '../shared/data-quality.mjs';
import {missingScoreConditions,scoreConditionLabel,validateRecord} from '../shared/domain.mjs';
import {readablePerformance,performanceMilliseconds} from '../shared/performance.ts';
import {REVIEW_GROUPS,MANAGEMENT_NAV} from '../src/services/management.js';
import {archiveHarness} from './archive-harness.mjs';
import {emptyState} from '../shared/domain.mjs';
const day='2026-10-24';
const score=(over={})=>({id:'s1',date:'2000-01-01',distance:'50m',stroke:'自由泳',poolLength:'25m',time:'01:00:00',timeMs:60000,seconds:60,recordType:'比赛',validityStatus:'有效',timingMethod:'手动计时',startType:'未知',...over});
test('待办标题给出真实实体，不再复述类型',()=>{
 const tasks=adminTasks({swim:[score()]},day);
 const conditions=tasks.find(t=>t.ruleId==='DQ-SCORE-CONDITIONS');
 assert.equal(conditions.title,'2000-01-01 · 50m自由泳（25m池）');
 assert.ok(conditions.message.includes('出发方式'));
 const mediaTasks=adminTasks({media:[{id:'m1',date:'2000-01-02',title:'训练视频',type:'video',url:'/uploads/a.mp4'}],swim:[]},day);
 assert.ok(mediaTasks.some(t=>t.title==='训练视频'));
});
test('缺失条件明细与标签一一对应，裁决后不再催办',()=>{
 const row=score();
 assert.deepEqual(missingScoreConditions(row),['startType']);
 assert.equal(scoreConditionLabel('startType'),'出发方式');
 const open=diagnoseQuality({swim:[row]},day);
 assert.equal(open.filter(i=>i.ruleId==='DQ-SCORE-CONDITIONS').length,1);
 const adjudicated=score({conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'家长'});
 assert.equal(diagnoseQuality({swim:[adjudicated]},day).filter(i=>i.ruleId==='DQ-SCORE-CONDITIONS').length,0);
 const tasks=adminTasks({swim:[adjudicated]},day);
 assert.ok(!tasks.some(t=>t.ruleId==='DQ-SCORE-CONDITIONS'));
});
test('按未知保留裁决只新增两个字段，不改成绩事实与有效性',()=>{
 const previous=score();
 const kept=validateRecord('swim',{conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'家长'},previous);
 assert.equal(kept.timeMs,60000);assert.equal(kept.validityStatus,'有效');assert.equal(kept.startType,'未知');
 assert.equal(kept.conditionsKeptUnknownAt,'2026-10-24');assert.equal(kept.conditionsKeptUnknownBy,'家长');
 assert.throws(()=>validateRecord('swim',{conditionsKeptUnknownAt:'2026-13-99',conditionsKeptUnknownBy:'x'},previous),/裁决日期无效/);
 assert.throws(()=>validateRecord('swim',{conditionsKeptUnknownAt:'2026-10-24'},previous),/需填写裁决人/);
 assert.throws(()=>validateRecord('swim',{conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'家'.repeat(51)},previous),/50字以内/);
 const cleared=validateRecord('swim',{conditionsKeptUnknownAt:'',conditionsKeptUnknownBy:''},kept);
 assert.equal('conditionsKeptUnknownAt' in cleared,false);
});
test('条件补齐后过期裁决自动失效，仍未知时保留',()=>{
 const previous=score({conditionsKeptUnknownAt:'2026-10-01',conditionsKeptUnknownBy:'家长'});
 const completed=validateRecord('swim',{startType:'蹬壁'},previous);
 assert.equal('conditionsKeptUnknownAt' in completed,false);
 const stillUnknown=validateRecord('swim',{location:'市队测试'},previous);
 assert.equal(stillUnknown.conditionsKeptUnknownAt,'2026-10-01');
});
test('口语化时间辅注与主显示并存，不改毫秒事实',()=>{
 const fast={timeMs:56170};
 assert.equal(readablePerformance(fast),'56.17秒');
 assert.equal(readablePerformance({timeMs:62050}),'1分02.05秒');
 assert.equal(readablePerformance({time:'bad'}),'');
 assert.equal(performanceMilliseconds({timeMs:56170}),56170);
});
test('分析复盘分组覆盖且仅覆盖既有入口',()=>{
 const flat=MANAGEMENT_NAV.find(item=>item.key==='review').views.map(([key])=>key);
 const grouped=REVIEW_GROUPS.flatMap(([,keys])=>keys);
 assert.deepEqual([...grouped].sort(),[...flat].sort());
 assert.equal(new Set(grouped).size,grouped.length);
});
test('云端协议PUT通道支持裁决并落库，冲突保护保留',async t=>{
 const seed=emptyState();
 seed.swim=[score({id:'protocol-score',validityStatus:'未核验'})]; const harness=await archiveHarness(t,'cloud',seed);
 const revision=harness.read().revision;
 const put=await harness.send('/api/swim/protocol-score','PUT',{conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'protocol-parent'},revision);
 assert.equal(put.status,200);
 const saved=harness.read().data.swim.find(row=>row.id==='protocol-score');
 assert.equal(saved.conditionsKeptUnknownBy,'protocol-parent');
 assert.equal(saved.timeMs,60000);
 const replay=await harness.send('/api/swim/protocol-score','PUT',{conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'protocol-parent'},revision);
 assert.equal(replay.status,409);
 assert.equal(adminTasks(harness.read().data,day).filter(task=>task.ruleId==='DQ-SCORE-CONDITIONS').length,0);
});
