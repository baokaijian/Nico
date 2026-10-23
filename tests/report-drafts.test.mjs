import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../shared/domain.mjs';
import { saveGrowth, actGrowth } from '../shared/growth-records.mjs';
import { buildReportFacts, reportStale, reportRange, growthReportHTML } from '../shared/report-drafts.mjs';
const options={id:'report-protocol',actor:'protocol-parent',now:'2000-02-01T00:00:00Z'};
const draft={title:'协议月报',periodType:'month',period:'2000-01',parentSummary:'真实家长总结',childFeeling:'孩子原话',nextFocus:'待观察',selectedMediaIds:[]};
test('月年报告范围、空数据、事实只读和来源过期不静默覆盖',()=>{
  assert.deepEqual(reportRange('month','2000-02'),{start:'2000-02-01',end:'2000-02-29'});assert.deepEqual(reportRange('year','2000'),{start:'2000-01-01',end:'2000-12-31'});assert.throws(()=>reportRange('month','2000-13'));
  const data=emptyState();assert.equal(buildReportFacts(data,draft).facts.training.count,0);
  const r=saveGrowth(data,'reportDrafts',draft,options), frozen=structuredClone(r);
  assert.equal(reportStale(data,r),false);assert.throws(()=>saveGrowth(data,'reportDrafts',{facts:{fake:1}},options));
  data.trainings.push({id:'t',date:'2000-01-01',durationMinutes:30,plannedMeters:1000});assert.equal(reportStale(data,r),true);assert.deepEqual(r,frozen);
  assert.throws(()=>actGrowth(data,'reportDrafts',r.id,'confirm',{confirmedBy:'协议家长',note:'核对'},options),/过期/);
  const updated=saveGrowth(data,'reportDrafts',{parentSummary:'新总结'},options);assert.deepEqual(updated.facts,r.facts);assert.equal(reportStale(data,updated),true);
  actGrowth(data,'reportDrafts',r.id,'refresh',{note:'明确刷新来源'},options);const refreshed=data.reportDrafts[0];assert.equal(refreshed.facts.training.minutes,30);assert.equal(refreshed.facts.training.knownMeters,0);assert.equal(reportStale(data,refreshed),false);
  actGrowth(data,'reportDrafts',r.id,'confirm',{confirmedBy:'协议家长',note:'人工核对'},options);assert.equal(data.reportDrafts[0].status,'已确认');assert.throws(()=>saveGrowth(data,'reportDrafts',{parentSummary:'篡改'},options));
  assert.throws(()=>actGrowth(data,'reportDrafts',r.id,'refresh',{note:'覆盖已确认'},options));
  data.trainings[0].durationMinutes=31;assert.equal(reportStale(data,data.reportDrafts[0]),true);assert.equal(data.reportDrafts[0].facts.training.minutes,30);
});
test('报告隔离泳姿、池长、距离；未核验不参与PB，叙事转义且不嵌入私有素材',()=>{
  const data=emptyState();data.swim=[{id:'s0',date:'1999-12-01',stroke:'自由泳',distance:'50m',poolLength:'25m',timeMs:61000,validityStatus:'有效'}, {id:'s1',date:'2000-01-01',stroke:'自由泳',distance:'50m',poolLength:'25m',timeMs:60000,validityStatus:'有效'}, {id:'s2',date:'2000-01-02',stroke:'自由泳',distance:'50m',poolLength:'50m',timeMs:50000,validityStatus:'未核验'}];
  data.media=[{id:'m',date:'2000-01-01',title:'协议私有素材',url:'/uploads/private.mp4'}];
  const r=saveGrowth(data,'reportDrafts',{...draft,parentSummary:'<script>attack</script>',selectedMediaIds:['m']},options);assert.equal(r.facts.pbEvents.length,1);assert.equal(r.facts.scores.length,2);assert.ok(r.sourceRefs.some(ref=>ref.id==='s0'));
  const html=growthReportHTML(r,false);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('/uploads/'));assert.ok(html.includes('s0'));assert.ok(html.includes('生成'));
  data.profile.name='unrelated';assert.equal(reportStale(data,r),false);data.swim[0].timeMs=59000;assert.equal(reportStale(data,r),true);
});
