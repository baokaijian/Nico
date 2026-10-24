import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { createApp } from '../server/server.js';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { openStore } from '../server/store.mjs';
const levels = { L1: '协议一', L2: '协议二', L3: '协议三', L4: '协议四', L5: '协议五' };
const standard = { name: '协议自由泳', dimension: '自由泳', levels, status: '启用', reviewedBy: '协议审核' };
const assessment = { date: '2000-01-01', assessor: '协议评估', level: 'L2', status: '待确认', evidenceNote: '协议测评观察', evidenceRefs: [], improvementNote: '协议改进', previousAssessmentId: '', weakPointId: '', checkinIds: [] };
for (const runtime of ['local', 'cloud']) test(`${runtime}：技能评估→短板→打卡→复测；目标证据→人工确认→归档，历史与恢复`, async t => {
  const initial = emptyState(), token = 'e'.repeat(64); let read, send;
  const oldBackup = { format: 'nico-backup-v1', data: structuredClone(initial) };
  for (const key of ['skillDefinitions', 'skillAssessments', 'milestones']) delete oldBackup.data[key];
  if (runtime === 'local') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-growth-api-')); fs.writeFileSync(path.join(dir, 'seed.json'), JSON.stringify(initial));
    const store = openStore({ filename: path.join(dir, 'state.sqlite'), seedPath: path.join(dir, 'seed.json'), backupDir: path.join(dir, 'backups') });
    const server = createApp({ store, uploadsDir: path.join(dir, 'uploads'), tokens: { owner: token, coach: 'c'.repeat(64), viewer: 'd'.repeat(64) }, processUploads: false }).listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
    read = () => store.read();
    send = (route, method = 'GET', body, revision = read().revision, guest = false, credential = token) => fetch(`http://127.0.0.1:${server.address().port}${route}`, { method, headers: { ...(!guest ? { Authorization: `Bearer ${credential}` } : {}), 'Content-Type': 'application/json', 'If-Match': String(revision) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } else {
    let current = { data: initial, revision: 1 };
    const handler = createCloudHandler({ origins: [], backend: { read: async () => structuredClone(current), session: async () => ({ username: 'protocol-parent', expires_at: '2100-01-01T00:00:00Z' }), account: async () => ({ must_change_password: false }), save: async (revision, data) => { if (revision !== current.revision) throw Object.assign(Error('protocol conflict'), { status: 409 }); current = { data: structuredClone(data), revision: revision + 1 }; return current.revision; } } });
    read = () => structuredClone(current);
    send = (route, method = 'GET', body, revision = read().revision, guest = false) => handler(new Request(`https://protocol.invalid/nico-api${route}`, { method, headers: { ...(!guest ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', 'If-Match': String(revision) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  }
  const create = async (key, body, requestId) => { const res = await send(`/api/${key}`, 'POST', { ...body, ...(['skillDefinitions', 'skillAssessments', 'goals', 'milestones'].includes(key) ? { clientRequestId: requestId } : {}) }); const value = await res.json(); assert.equal(res.status, 201, value.error); return value; };
  for (const key of ['skillDefinitions', 'skillAssessments', 'milestones', 'goals']) { assert.equal((await send(`/api/${key}`, 'GET', undefined, undefined, true)).status, 401); assert.equal((await send(`/api/${key}`, 'POST', {}, undefined, true)).status, 401); }
  if (runtime === 'local') for (const credential of ['c'.repeat(64), 'd'.repeat(64)]) for (const key of ['skillDefinitions', 'skillAssessments', 'goals', 'milestones']) {
    assert.equal((await send(`/api/${key}`, 'POST', {}, undefined, false, credential)).status, 403, '非家长不可创建成长记录');
    assert.equal((await send(`/api/${key}/missing/confirm`, 'POST', {}, undefined, false, credential)).status, 403, '非家长不可人工确认');
  }
  const definition = await create('skillDefinitions', standard, 'request-standard'); assert.equal(definition.version, 1); assert.equal(definition.athleteId, 'nico');
  const first = await create('skillAssessments', { ...assessment, skillId: definition.id, definitionVersion: 1 }, 'request-assessment');
  const replay = await send('/api/skillAssessments', 'POST', { ...assessment, skillId: definition.id, definitionVersion: 1, clientRequestId: 'request-assessment' }, 1); assert.equal(replay.status, 200); assert.equal((await replay.json()).id, first.id);
  assert.equal((await send(`/api/skillAssessments/${first.id}`, 'PUT', { ...assessment, skillId: definition.id, definitionVersion: 1, confirmedBy: 'forged' })).status, 400);
  const confirmed = await send(`/api/skillAssessments/${first.id}/confirm`, 'POST', { confirmedBy: '协议家长', note: '测评观察已核对' }); assert.equal(confirmed.status, 200); assert.equal((await confirmed.json()).status, '已确认');
  const secondStandard = await send(`/api/skillDefinitions/${definition.id}`, 'PUT', { ...standard, levels: { ...levels, L2: '协议二（新版）' } }); assert.equal(secondStandard.status, 200);
  assert.equal(read().data.skillAssessments[0].standardSnapshot.levels.L2, '协议二');
  const invalids = [
    { ...assessment, skillId: 'missing-skill', definitionVersion: 1 },
    { ...assessment, skillId: definition.id, definitionVersion: 1 },
    { ...assessment, skillId: definition.id, definitionVersion: 2, status: '已确认' },
    { ...assessment, skillId: definition.id, definitionVersion: 2, evidenceRefs: [{ collection: 'trainings', id: 'missing-training' }] },
    { ...assessment, skillId: definition.id, definitionVersion: 2, checkinIds: ['missing-checkin'] },
  ];
  for (const body of invalids) { const before = read(); assert.ok([400, 409].includes((await send('/api/skillAssessments', 'POST', body)).status)); assert.deepEqual(read(), before); }
  const point = await create('weakpoints', { date: '2000-01-01', title: '协议动作短板', category: '技术动作', sourceType: '技能评估', sourceRef: first.id, evidence: '来自明确评估', status: '练习中' }, 'request-point');
  const checkin = await create('checkins', { date: '2000-01-02', weakPointId: point.id, times: 1, quality: '按要求完成' }, 'request-checkin');
  assert.equal(read().data.skillAssessments.length, 1, '打卡不能自动升级或生成评估');
  const retest = await create('skillAssessments', { ...assessment, date: '2000-01-03', level: 'L3', skillId: definition.id, definitionVersion: 2, previousAssessmentId: first.id, weakPointId: point.id, checkinIds: [checkin.id] }, 'request-retest');
  assert.equal((await send(`/api/skillAssessments/${retest.id}/confirm`, 'POST', { confirmedBy: '协议家长', note: '复测已核对' })).status, 200);
  const safety = await create('skillDefinitions', { ...standard, name: '协议水中安全', dimension: '水中安全' }, 'request-safety');
  const unconfirmed = await create('skillAssessments', { ...assessment, skillId: safety.id, definitionVersion: 1 }, 'request-safety-assessment');
  assert.equal((await send('/api/skillAssessments', 'POST', { ...assessment, date: '2000-01-03', skillId: safety.id, definitionVersion: 1, previousAssessmentId: first.id })).status, 400, '不同技能不能冒充复测');
  const query = await send(`/api/skillAssessments?skillId=${definition.id}`); assert.equal((await query.json()).length, 2);
  const goal = await create('goals', { modelVersion: 1, title: '协议成长目标', baselineText: '原测评L2', baselineRefs: [{ collection: 'skillAssessments', id: first.id }], targetResult: '复测达到内部L3', deadline: '2000-02-01', criteria: '独立复测由家长核对', relatedTrainingIds: [], relatedSkillIds: [definition.id], targetSkillLevel: 'L3', status: '进行中' }, 'request-goal');
  const candidates = await send(`/api/goals/${goal.id}/candidates`); assert.equal(candidates.status, 200); assert.ok((await candidates.json()).some(ref => ref.id === retest.id));
  assert.equal(read().data.goals[0].status, '进行中', '候选证据不能自动完成目标');
  assert.equal((await send(`/api/goals/${goal.id}/confirm`, 'POST', { confirmedBy: '协议家长', note: '已核对' })).status, 400, '没有证据引用不得确认完成');
  assert.equal((await send(`/api/goals/${goal.id}/confirm`, 'POST', { confirmedBy: '协议家长', note: '核对', evidenceRefs: [{ collection: 'skillAssessments', id: unconfirmed.id }] })).status, 400, '未确认测评不能作为达成证据');
  const proof = { confirmedBy: '协议家长', note: '已人工对照标准及复测', evidenceRefs: [{ collection: 'skillAssessments', id: retest.id }] };
  assert.equal((await send(`/api/goals/${goal.id}/confirm`, 'POST', proof)).status, 200);
  assert.equal(read().data.goals[0].status, '已达成'); assert.equal(read().data.milestones.length, 1); assert.equal(read().data.milestones[0].status, '待确认');
  assert.equal((await send(`/api/goals/${goal.id}/confirm`, 'POST', proof)).status, 200); assert.equal(read().data.milestones.length, 1, '确认重试不重复创建里程碑');
  assert.equal((await send(`/api/goals/${goal.id}/archive`, 'POST', {})).status, 200); assert.equal(read().data.goals[0].status, '已归档');
  const milestoneId = read().data.milestones[0].id;
  assert.equal((await send(`/api/milestones/${milestoneId}/confirm`, 'POST', { confirmedBy: '协议家长', note: '成长事件已确认' })).status, 200);
  const unchanged = read();
  const forged = { format: 'nico-backup-v1', data: structuredClone(unchanged.data) }; forged.data.skillDefinitions[0].name = '伪造的同版本内容';
  assert.equal((await send('/api/restore', 'POST', forged)).status, 400, '同版本活动记录不能与历史矛盾'); assert.deepEqual(read(), unchanged);
  const yr=await send('/api/reportDrafts','POST',{title:'协议年报',periodType:'year',period:'2000',selectedMediaIds:[],clientRequestId:'year-report'});assert.equal(yr.status,201);const y=await yr.json();
  assert.equal((await send(`/api/reportDrafts/${y.id}/confirm`,'POST',{confirmedBy:'协议家长',note:'年度事实已核对'})).status,200);
  const bookBody={title:'协议纪念册',year:'2000',reportId:y.id,theme:'慢慢成长',parentMessage:'原话',childMessage:'原话',selectedMediaIds:[],sectionOrder:['training','scores','skills','competitions','milestones','media','messages'],clientRequestId:'year-book'};
  const br=await send('/api/yearbooks','POST',bookBody);assert.equal(br.status,201);const b=await br.json();assert.equal((await send('/api/yearbooks','POST',bookBody,1)).status,200,'纪念册稳定请求重放');assert.equal((await send('/api/yearbooks','POST',{...bookBody,title:'冲突'},1)).status,409);
  assert.equal((await send(`/api/yearbooks/${b.id}/confirm`,'POST',{confirmedBy:'协议家长',note:'编排和来源核对'})).status,200);assert.equal(read().data.yearbooks[0].status,'已确认');
  const historyCount = read().data.growthHistory.length;
  assert.equal((await send('/api/restore', 'POST', oldBackup)).status, 200); assert.ok(read().data.growthHistory.length >= historyCount);
  for (const [key, id] of [['skillDefinitions', definition.id], ['skillAssessments', first.id], ['skillAssessments', retest.id], ['goals', goal.id], ['milestones', milestoneId]]) {
    const item = read().data.trash.find(row => row.collection === key && row.record.id === id); assert.ok(item);
    assert.equal((await send(`/api/trash/${item.id}/restore`, 'POST', {})).status, 200);
  }
  const restoredGoal = read().data.goals.find(row => row.id === goal.id); assert.equal(restoredGoal.status, '已归档'); assert.ok(restoredGoal.version > goal.version);
  assert.equal(read().data.milestones[0].sourceGoalSnapshot.status, '已达成');
  const beforeReopen = read();
  assert.equal((await send(`/api/goals/${goal.id}/reopen`, 'POST', { note: '重新核对', confirmedBy: 'forged' })).status, 400); assert.deepEqual(read(), beforeReopen);
  assert.equal((await send(`/api/goals/${goal.id}/reopen`, 'POST', { note: '新的阶段任务' })).status, 200);
  assert.equal(read().data.goals.find(row => row.id === goal.id).status, '进行中');
  assert.equal(read().data.goals.find(row => row.id === goal.id).confirmedAt, undefined);
  assert.equal(read().data.milestones[0].sourceGoalSnapshot.status, '已达成', '重新开启不改写原成长事件证据');
  assert.doesNotThrow(() => normalizeState(read().data));
});
