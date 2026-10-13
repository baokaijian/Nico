import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, analysis, planContext } from '../shared/domain.mjs';
import { reportHTML } from '../shared/reports.mjs';

// Fixed protocol cases only; never imported by the app or written into its data.
const score = (id, date, time, extra = {}) => ({ id, date, time, distance: '50m', stroke: '自由泳', poolLength: '50m', ...extra });
const video = { id: 'test-video', date: '2000-03-01', title: '协议视频', type: 'video', duration: 10 };
const annotation = { id: 'test-note', mediaId: video.id, athleteIdentity: '协议运动员/泳道', startSecond: 1, endSecond: 3, observation: '协议观察', limitation: '仅此片段', status: '已审核', reviewedBy: '协议审核人' };
const plan = (id, extra = {}) => ({ id, title: '协议计划', focus: '协议重点', startDate: '2000-01-01', endDate: '2000-01-31', status: '已确认', reviewedBy: '协议教练', version: 1, sessions: [], ...extra });

test('空库生成证据缺口，不写入基础数据或实际课次', () => {
  const state = emptyState(), before = structuredClone(state), result = analysis(state);
  assert.equal(result.baseline.recordId, null);
  assert.equal(result.focusEvidence, null);
  assert.ok(result.stages.every(s => s.sourceIds.length === 0));
  assert.match(result.stages[1].action, /尚无实际训练记录/);
  assert.match(result.stages[2].action, /尚无视频/);
  reportHTML(state, '2000-01-01', '2000-01-31');
  assert.deepEqual(state, before);
});
test('训练原话与恢复实际值驱动建议，0保留且空白不是正常', () => {
  const state = emptyState();
  state.swim = [score('test-score', '2000-01-01', '60', { notes: '爆发力改善了' })];
  state.trainings = [{ id: 'test-training', date: '2000-02-01', focusSkills: '协议技术提示', coachNotes: '协议原话', durationMinutes: 0, totalMeters: 0 }];
  state.nutrition = [{ id: 'test-recovery', date: '2000-02-01', sleepHours: 0, fatigue: '', discomfort: '' }];
  const result = analysis(state);
  assert.equal(result.focusEvidence.text, '协议技术提示；协议原话');
  assert.deepEqual(result.focusEvidence.sourceIds, ['test-training']);
  assert.match(result.stages[1].action, /0分钟、泳程0m/);
  assert.match(result.facts.find(f => f.sourceIds.includes('test-recovery') && f.kind === '原始记录').text, /0小时.*不适：未填/);
  assert.match(result.stages[1].action, /不从留空项判断/);
  state.trainings.push({ id: 'test-no-feedback', date: '2000-02-02' });
  assert.equal(analysis(state).focusEvidence.text, '协议技术提示；协议原话');
  assert.match(analysis({ ...state, trainings: [] }).focus, /核对最新成绩备注/);
  assert.doesNotMatch(analysis({ ...state, trainings: [] }).focus, /爆发力不行|出发、蹬壁/);
});
test('仅完整审核录像纳入个体观察，缺身份、越界或失效关联不纳入', () => {
  const state = emptyState(); state.media = [video]; state.annotations = [annotation];
  const result = analysis(state);
  assert.equal(result.focusEvidence.text, annotation.observation);
  assert.deepEqual(result.focusEvidence.sourceIds, [annotation.id, video.id]);
  assert.match(result.stages[2].action, /当前有1条/);
  for (const invalid of [{ status: '草稿' }, { reviewedBy: '' }, { athleteIdentity: ' ' }, { endSecond: 11 }, { endSecond: 1 }, { startSecond: -1 }, { recordId: 'missing' }, { mediaId: 'missing' }]) {
    const r = analysis({ ...state, annotations: [{ ...annotation, ...invalid }] });
    assert.equal(r.focusEvidence, null);
    assert.ok(!r.facts.some(f => f.kind === '已审核观察'));
    assert.match(r.stages[2].action, /尚无符合条件的审核观察/);
  }
});
test('基线按实际条件分组，短池与未知条件不混入复测', () => {
  const state = emptyState(), conditions = { startType: '跳台', timingMethod: '自动计时', recordType: '测试', task: '无器材' };
  state.swim = [score('known-A', '2000-01-01', '65', conditions), score('unknown', '2000-01-02', '50'), score('known-B', '2000-02-01', '60', conditions), score('short', '2000-03-01', '25', { distance: '25m', poolLength: '25m' })];
  const result = analysis(state);
  assert.equal(result.baseline.recordId, 'known-B');
  assert.deepEqual(result.baseline.comparableIds, ['known-A', 'known-B']);
  assert.match(result.stages[3].action, /有2条与参考记录/);
  state.swim[2].timingMethod = '未知';
  assert.deepEqual(analysis(state).baseline.comparableIds, []);
  assert.deepEqual(analysis(state).baseline.missingConditions, ['计时方式']);
  assert.match(analysis(state).stages[3].action, /先补齐参考条件/);
});
test('证据版本跨jsonb键序及集合排序稳定，批注和素材变化会提醒复核', () => {
  const state = emptyState(); state.media = [video]; state.annotations = [annotation]; state.swim = [score('A', '2000-01-01', '60'), score('B', '2000-02-01', '55')];
  const reversedKeys = value => Array.isArray(value) ? value.map(reversedKeys) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reversedKeys(v)])) : value;
  const version = analysis(state).version;
  const reordered = reversedKeys(state); reordered.swim.reverse();
  assert.equal(analysis(reordered).version, version);
  assert.notEqual(analysis({ ...state, annotations: [{ ...annotation, observation: '另一个协议观察' }] }).version, version);
  assert.notEqual(analysis({ ...state, media: [{ ...video, duration: 2 }] }).version, version);
  assert.equal(analysis({ ...state, media: [{ ...video, playbackUrl: '/uploads/new.mp4', processingStatus: '已处理', sourceSha256: 'a'.repeat(64) }] }).version, version);
  state.plans = [plan('current', { sourceVersion: version })];
  assert.equal(analysis(state).version, version);
});
test('当前计划不能取未来、过期、未确认、待复核或重叠的计划', () => {
  const state = emptyState(), version = analysis(state).version;
  const current = plan('current', { sourceVersion: version });
  state.plans = [plan('expired', { endDate: '1999-12-31' }), current, plan('future', { startDate: '2000-02-01', endDate: '2000-02-28' }), plan('draft', { status: '草稿' })];
  assert.equal(planContext(state, '2000-01-15').current.id, 'current');
  const before = structuredClone(state);
  assert.equal(planContext(state, '2000-03-01').current, null);
  assert.deepEqual(state, before);
  state.plans[1] = { ...current, sourceVersion: 'old-version' };
  assert.equal(planContext(state, '2000-01-15').current, null);
  assert.match(planContext(state, '2000-01-15').message, /复核/);
  state.plans[1] = current; state.plans.push(plan('overlapping'));
  assert.equal(planContext(state, '2000-01-15').current, null);
  assert.match(planContext(state, '2000-01-15').message, /多份/);
  assert.throws(() => planContext(state, 'invalid'));
});
test('独立报告包含建议来源、参考条件、失效计划提示并安全处理未选日期', () => {
  const state = emptyState(); state.media = [{ ...video, title: '<script>test</script>' }]; state.annotations = [annotation]; state.plans = [plan('old', { sourceVersion: 'old-version' })];
  const html = reportHTML(state, '2000-01-01', '2000-01-31');
  assert.match(html, /参考成绩/); assert.match(html, /test-note、test-video/);
  assert.match(html, /依据记录已更新/); assert.match(html, /已纳入审核观察/);
  assert.ok(!html.includes('<script>'));
  assert.doesNotThrow(() => reportHTML(state, '', ''));
});
