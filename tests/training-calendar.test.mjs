import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarRange, calendarEntries } from '../shared/training-calendar.mjs';
test('周月边界、闰年与原实体聚合，计划和实际分离',()=>{
  assert.deepEqual(calendarRange('2000-02-29','week'),{start:'2000-02-28',end:'2000-03-05'});assert.deepEqual(calendarRange('2000-02-15','month'),{start:'2000-01-31',end:'2000-03-05'});assert.throws(()=>calendarRange('2000-02-30','week'));assert.throws(()=>calendarRange('2000-01-01','day'));
  const data={plans:[{id:'p',version:1,status:'已确认',sessions:[{id:'a',date:'2000-02-01',type:'训练',totalMeters:1000},{id:'r',date:'2000-02-02',type:'休息'}]},{id:'d',status:'草稿',sessions:[{id:'draft',date:'2000-02-03',type:'训练'}]}],trainings:[{id:'t',date:'2000-02-01',plannedSessionId:'p/a',plannedMeters:1000,durationMinutes:30}],swim:[{id:'s',date:'2000-02-01',recordType:'测试',validityStatus:'未核验'}],skillAssessments:[{id:'a',date:'2000-02-02',status:'待确认'}],competitionEvents:[{id:'c',date:'2000-02-03',name:'协议赛事'}]};
  const before=structuredClone(data),events=calendarEntries(data,'2000-02-01','2000-02-29');assert.equal(events.length,7);assert.equal(events.find(r=>r.recordId==='t').kind,'实际');assert.ok(events.find(r=>r.id==='plans/p/a').label.includes('计划'));assert.ok(events.find(r=>r.id==='plans/d/draft').label.includes('草稿'));assert.equal(events.find(r=>r.id==='plans/p/r').kind,'休息');assert.deepEqual(data,before);assert.equal(calendarEntries({},'2000-01-01','2000-12-31').length,0);
});
test('日历未记录实际距离不能显示0米，实际零与已知部分保留区别',()=>{
  const items=calendarEntries({trainings:[{id:'unknown',date:'2000-01-01',durationMinutes:25},{id:'zero',date:'2000-01-01',totalMeters:0,durationMinutes:0}]},'2000-01-01','2000-01-31');
  assert.match(items.find(r=>r.recordId==='unknown').detail,/实际距离未记录/);assert.doesNotMatch(items.find(r=>r.recordId==='unknown').detail,/0米/);
  assert.match(items.find(r=>r.recordId==='zero').detail,/实际0米/);
});
