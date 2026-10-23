import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonPosition, comparisonRate } from '../shared/video-comparison.mjs';
import { validateGrowthInsight } from '../shared/growth-insight.ts';
test('双片按各自人工起点同步，边界停止，速度白名单',()=>{
  assert.deepEqual(comparisonPosition(8,5,10,30),{time:13,ended:false});
  assert.deepEqual(comparisonPosition(28,5,10,30),{time:30,ended:true});
  assert.deepEqual(comparisonPosition(0,5,1,30),{time:0,ended:false});
  assert.throws(()=>comparisonPosition(NaN,0,0,10));assert.equal(comparisonRate('0.75'),0.75);assert.throws(()=>comparisonRate(2));
});
test('AI扩展仅四类待确认协议，来源与范围不可缺少',()=>{
  const base={text:'协议事实',sources:[{collection:'swim',id:'protocol'}],scope:{start:'2000-01-01',end:'2000-01-31'},limitations:[],status:'pending-human-review'};
  for(const kind of ['fact','calculation','pending-observation','draft-advice'])assert.doesNotThrow(()=>validateGrowthInsight({...base,kind}));
  for(const extra of [{sources:[]},{status:'confirmed'},{kind:'prediction'},{scope:{start:'2000-02-30',end:'2000-03-01'}}])assert.throws(()=>validateGrowthInsight({...base,kind:'fact',...extra}));
});
