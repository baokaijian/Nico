import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonPosition, comparisonRate } from '../shared/video-comparison.mjs';
test('双片按各自人工起点同步，边界停止，速度白名单',()=>{
  assert.deepEqual(comparisonPosition(8,5,10,30),{time:13,ended:false});
  assert.deepEqual(comparisonPosition(28,5,10,30),{time:30,ended:true});
  assert.deepEqual(comparisonPosition(0,5,1,30),{time:0,ended:false});
  assert.throws(()=>comparisonPosition(NaN,0,0,10));assert.equal(comparisonRate('0.75'),0.75);assert.throws(()=>comparisonRate(2));
});
