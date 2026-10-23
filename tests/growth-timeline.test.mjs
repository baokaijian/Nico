import test from 'node:test';
import assert from 'node:assert/strict';
import { growthTimeline } from '../shared/growth-timeline.mjs';
import { emptyState, normalizeState, publicSnapshot } from '../shared/domain.mjs';
import { saveGrowth, actGrowth } from '../shared/growth-records.mjs';
test('时间轴按项目池长分离有效PB，未确认数据不是正式突破', () => {
  const data = emptyState();
  const score = { distance: '50m', stroke: '自由泳', poolLength: '25m', validityStatus: '有效', timeMs: 60000 };
  data.swim = [{ ...score, id:'s1', date:'2000-01-01' }, { ...score, id:'s2', date:'2000-01-02', timeMs:59000 }, { ...score, id:'s3', date:'2000-01-03', timeMs:50000, validityStatus:'未核验' }, { ...score, id:'s4', date:'2000-01-03', timeMs:55000, poolLength:'50m' }, { ...score, id:'s5', date:'2000-01-04', timeMs:57000, stroke:'仰泳' }];
  data.media=[{id:'m',date:'2000-01-01',recordId:'s1',title:'协议录像'},{id:'unlinked',date:'2000-01-01',title:'未关联'}];
  data.skillAssessments=[{id:'a',date:'2000-01-01',level:'L3',status:'待确认'}];
  data.milestones=[{id:'l',date:'2000-01-01',status:'待确认'}];
  const all=growthTimeline(data); assert.equal(all.filter(r=>r.isPB).length,1); assert.equal(all.find(r=>r.id==='swim/s2').isPB,true); assert.equal(all.find(r=>r.id==='swim/s3').status,'未核验');
  assert.ok(!all.some(r=>r.recordId==='unlinked'||r.recordId==='l')); assert.equal(all.find(r=>r.recordId==='a').status,'待确认');
  assert.equal(growthTimeline(data,{year:'2001'}).length,0); assert.equal(growthTimeline(data,{type:'swim',stroke:'自由泳',month:'01'}).length,4);
  for(const item of all) assert.ok(item.collection && item.recordId && item.status);
});
test('人工故事独立确认，版本/作者/历史/公开白名单保留', () => {
  const data=emptyState(), options={id:'story-protocol',actor:'protocol-parent',now:'2000-01-01T00:00:00Z'};
  const row=saveGrowth(data,'growthStories',{title:'协议成长观察',date:'2000-01-01',body:'今天的实际观察',evidenceRefs:[],status:'待确认'},options);
  assert.equal(row.createdBy,'protocol-parent'); assert.equal(row.version,1);
  assert.throws(()=>saveGrowth(data,'growthStories',{status:'已确认'},options));
  actGrowth(data,'growthStories',row.id,'confirm',{confirmedBy:'协议家长',note:'已核对实际观察'},options);
  assert.equal(data.growthStories[0].status,'已确认'); assert.equal(data.growthHistory.length,2); assert.doesNotThrow(()=>normalizeState(data));
  assert.ok(!Object.hasOwn(publicSnapshot(data),'growthStories'));
  assert.throws(()=>saveGrowth(data,'growthStories',{body:'覆盖已确认事实'},options));
});
