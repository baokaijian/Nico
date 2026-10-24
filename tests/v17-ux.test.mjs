import test from 'node:test';import assert from 'node:assert/strict';
import {adminTasks} from '../shared/admin-tasks.mjs';
import {missingScoreConditions,scoreConditionLabel,readablePerformance} from '../shared/score-conditions.mjs';
import {performanceMilliseconds} from '../shared/performance.ts';
import {REVIEW_GROUPS,MANAGEMENT_NAV} from '../src/services/management.js';
const day='2026-10-24';
const score=(over={})=>({id:'s1',date:'2000-01-01',distance:'50m',stroke:'自由泳',poolLength:'25m',time:'01:00:00',timeMs:60000,recordType:'比赛',validityStatus:'有效',timingMethod:'手动计时',startType:'未知',...over});
test('待办标题给出真实实体，消息列出具体缺失条件',()=>{
 const tasks=adminTasks({swim:[score()]},day);
 const conditions=tasks.find(t=>t.ruleId==='DQ-SCORE-CONDITIONS');
 assert.equal(conditions.title,'2000-01-01 · 50m自由泳（25m池）');
 assert.ok(conditions.message.includes('出发方式'));
 const mediaTasks=adminTasks({media:[{id:'m1',date:'2000-01-02',title:'训练视频',type:'video',url:'/uploads/a.mp4'}],swim:[]},day);
 assert.ok(mediaTasks.some(t=>t.title==='训练视频'));
});
test('缺失条件明细与标签一一对应；已裁决记录在待办层不再催办',()=>{
 assert.deepEqual(missingScoreConditions(score()),['startType']);
 assert.equal(scoreConditionLabel('startType'),'出发方式');
 const adjudicated=score({validityStatus:'未核验',conditionsKeptUnknownAt:'2026-10-24',conditionsKeptUnknownBy:'家长'});
 const tasks=adminTasks({swim:[adjudicated]},day);
 assert.ok(!tasks.some(t=>t.ruleId==='DQ-SCORE-CONDITIONS'),'裁决后不再生成计时条件待办');
 assert.ok(tasks.some(t=>t.ruleId==='DQ-SCORE-REVIEW'),'无关待办（未核验）保留');
});
test('口语化时间辅注与主显示并存，不改毫秒事实',()=>{
 assert.equal(readablePerformance({timeMs:56170}),'56.17秒');
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
// 说明：按未知保留的服务端字段校验（conditionsKeptUnknownAt/By 白名单、条件补齐自动失效、云PUT落库）
// 位于 codex/v1-7-ux-optimizations 分支（tests 同文件含三项后端回环）；待云函数凭据配置后随 1.7.1 部署。
