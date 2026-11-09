import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { scopeStateForAthlete } from '../shared/athletes-coaches.mjs';
import { comparePeriods } from '../shared/period-comparison.mjs';
import { passwordHash } from '../shared/password.mjs';
import { runMultiAthleteMigration } from '../scripts/multi-athlete-migrate.mjs';
import { createCloudHandler } from '../server/cloud-api.mjs';

async function createSetup() {
  const initial = emptyState();
  initial.profile = { name: 'Nico', sex: '女', birthDate: '2018-05-10' };
  let current = { data: normalizeState(initial), revision: 1 };
  let time = Date.now();
  let account = {
    username: 'admin',
    salt: 'test-salt',
    password_hash: await passwordHash('OwnerPassword123!', 'test-salt'),
    must_change_password: false,
  };
  const sessions = new Map();
  const attempts = new Map();
  const backups = [];
  const backend = {
    read: async () => structuredClone(current),
    account: async name => (name === account.username ? structuredClone(account) : null),
    session: async hash => sessions.get(hash),
    createSession: async value => sessions.set(value.token_hash, value),
    deleteSession: async hash => sessions.delete(hash),
    loginAttempt: async key => {
      const n = (attempts.get(key) || 0) + 1;
      attempts.set(key, n);
      return n;
    },
    changePassword: async (_name, previous, salt, hash) => {
      if (previous !== account.password_hash) return false;
      account = { ...account, salt, password_hash: hash, must_change_password: false };
      sessions.clear();
      return true;
    },
    save: async (expected, data) => {
      if (current.revision !== expected) throw Object.assign(new Error('冲突'), { status: 409 });
      backups.push(structuredClone(current));
      current = { data, revision: expected + 1 };
      return current.revision;
    },
    download: async () => new Response('isolated-bytes', { headers: { 'Content-Type': 'video/mp4' } }),
  };
  const handler = createCloudHandler({ backend, origins: ['https://baokaijian.github.io'], now: () => time });
  const call = async (endpoint, { method = 'GET', body, token = '', athleteId = '', revision = current.revision } = {}) => {
    const res = await handler(
      new Request('https://test.invalid/nico-api' + endpoint, {
        method,
        headers: {
          Origin: 'https://baokaijian.github.io',
          'Content-Type': 'application/json',
          'If-Match': String(revision),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(athleteId ? { 'X-Nico-Athlete-Id': athleteId } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  };
  const loginRes = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'OwnerPassword123!' },
  });
  const ownerToken = loginRes.body.accessToken;
  return { getCurrent: () => current, call, ownerToken };
}

test('M0: multi-athlete migration is idempotent and preserves revision and timeMs', async () => {
  const legacy = emptyState();
  legacy.profile = { name: 'Nico', sex: '女', birthDate: '2018-05-10' };
  legacy.trainings.push({
    id: 'tr-legacy-1',
    date: '2026-03-01',
    trainingType: '耐力游',
    durationMinutes: 60,
    totalMeters: 1500,
    completionStatus: '已完成',
    entryMode: '快速',
    sets: [],
    mediaIds: [],
  });
  legacy.swim.push({
    id: 'sw-legacy-1',
    date: '2026-03-02',
    distance: '50m',
    stroke: '自由泳',
    poolLength: '50m',
    time: '00:42:53',
    seconds: 42.53,
    timeMs: 42530,
    timeInput: '42.53',
    startType: '跳台',
    timingMethod: '自动计时',
    recordType: '比赛',
    validityStatus: '有效',
  });

  const res1 = runMultiAthleteMigration(legacy);
  assert.equal(res1.migrated, true);
  assert.equal(res1.data.athletes.length, 1);
  assert.equal(res1.data.athletes[0].id, 'nico');
  assert.equal(res1.data.trainings[0].athleteId, 'nico');
  assert.equal(res1.data.swim[0].athleteId, 'nico');
  assert.equal(res1.data.swim[0].timeMs, 42530);

  const res2 = runMultiAthleteMigration(res1.data);
  assert.equal(res2.migrated, false);
  assert.deepEqual(res2.data, res1.data);
});

test('M0 & M1: multi-athlete CRUD, validation (INV-01), strict isolation, soft-delete and restore', async () => {
  const { call, ownerToken } = await createSetup();

  // INV-01: heightCm / weightKg cannot be 0
  const badZero = await call('/api/athletes', {
    method: 'POST',
    token: ownerToken,
    body: { displayName: 'Leo', heightCm: 0 },
  });
  assert.equal(badZero.status, 400);
  assert.match(badZero.body.error, /不能填0/);

  // Create second athlete Leo
  const created = await call('/api/athletes', {
    method: 'POST',
    token: ownerToken,
    body: {
      displayName: 'Leo',
      sex: '男',
      birthDate: '2019-08-20',
      primaryStroke: '蛙泳',
      homePoolLength: '25m',
      heightCm: 125.5,
      weightKg: null,
    },
  });
  assert.equal(created.status, 201);
  const leoId = created.body.id;
  assert.ok(leoId && leoId !== 'nico');
  assert.equal(created.body.heightCm, 125.5);
  assert.equal(created.body.weightKg, null);

  // Add training for Nico
  const nicoTrain = await call('/api/trainings', {
    method: 'POST',
    token: ownerToken,
    athleteId: 'nico',
    body: {
      date: '2026-04-01',
      trainingType: '自由泳专项',
      durationMinutes: 60,
      totalMeters: 1600,
      completionStatus: '已完成',
      entryMode: '快速',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(nicoTrain.status, 201);
  assert.equal(nicoTrain.body.athleteId, 'nico');

  // Add training for Leo
  const leoTrain = await call('/api/trainings', {
    method: 'POST',
    token: ownerToken,
    athleteId: leoId,
    body: {
      date: '2026-04-02',
      trainingType: '蛙泳打腿',
      durationMinutes: 45,
      totalMeters: 1000,
      completionStatus: '已完成',
      entryMode: '快速',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(leoTrain.status, 201);
  assert.equal(leoTrain.body.athleteId, leoId);

  // Cross-athlete foreign key reference (Leo score referencing Nico training) must fail with 400
  const crossRef = await call('/api/swim', {
    method: 'POST',
    token: ownerToken,
    athleteId: leoId,
    body: {
      date: '2026-04-02',
      distance: '50m',
      stroke: '蛙泳',
      poolLength: '25m',
      time: '00:52:10',
      startType: '跳台',
      timingMethod: '手动计时',
      recordType: '测试',
      validityStatus: '有效',
      trainingId: nicoTrain.body.id,
    },
  });
  assert.equal(crossRef.status, 400);
  assert.match(crossRef.body.error, /不存在|其他儿童/);

  // Scoped state for Nico only sees Nico records; Scoped state for Leo only sees Leo records
  const snap = await call('/api/snapshot', {
    token: ownerToken,
    athleteId: leoId,
  });
  assert.equal(snap.status, 200);
  const scopedNico = scopeStateForAthlete(snap.body.data, 'nico');
  const scopedLeo = scopeStateForAthlete(snap.body.data, leoId);
  assert.equal(scopedNico.trainings.length, 1);
  assert.equal(scopedNico.trainings[0].id, nicoTrain.body.id);
  assert.equal(scopedLeo.trainings.length, 1);
  assert.equal(scopedLeo.trainings[0].id, leoTrain.body.id);
  assert.equal(scopedLeo.profile.name, 'Leo');

  // Soft-delete Leo -> moves Leo's records to trash
  const delLeo = await call(`/api/athletes/${leoId}`, {
    method: 'DELETE',
    token: ownerToken,
  });
  assert.equal(delLeo.status, 200);

  // Attempting to delete the last remaining active athlete (Nico) is blocked
  const delLast = await call('/api/athletes/nico', {
    method: 'DELETE',
    token: ownerToken,
  });
  assert.equal(delLast.status, 400);
  assert.match(delLast.body.error, /至少需保留一名/);

  // Restore Leo -> brings back Leo and Leo's training record
  const restLeo = await call(`/api/athletes/${leoId}/restore`, {
    method: 'POST',
    token: ownerToken,
  });
  assert.equal(restLeo.status, 200);
  const afterRestore = await call('/api/snapshot', { token: ownerToken });
  const scopedLeoAfter = scopeStateForAthlete(afterRestore.body.data, leoId);
  assert.equal(scopedLeoAfter.trainings.length, 1);
  assert.equal(scopedLeoAfter.trainings[0].id, leoTrain.body.id);
});

test('M2: coach 24h one-time invite, registration, confirmation, feedback immutability, and 6 privilege escalation cases', async () => {
  const { getCurrent, call, ownerToken } = await createSetup();

  // Create second athlete Leo (ungranted to coach)
  const createdLeo = await call('/api/athletes', {
    method: 'POST',
    token: ownerToken,
    body: { displayName: 'Leo', sex: '男' },
  });
  const leoId = createdLeo.body.id;

  // 1. Owner generates 24h invite for Nico with training:write, performance:write, feedback:write, media:read
  const inviteRes = await call('/api/coach-grants/invite', {
    method: 'POST',
    token: ownerToken,
    body: {
      athleteId: 'nico',
      scopes: ['training:write', 'performance:write', 'feedback:write', 'media:read'],
    },
  });
  assert.equal(inviteRes.status, 201);
  const inviteToken = inviteRes.body.inviteToken;
  const grantId = inviteRes.body.grant.id;
  assert.ok(inviteToken && inviteToken.length >= 24);
  // Stored state must only contain inviteTokenHash, never plaintext inviteToken
  const rawGrant = getCurrent().data.coachGrants.find(g => g.id === grantId);
  assert.ok(rawGrant.inviteTokenHash);
  assert.equal(rawGrant.inviteToken, undefined);

  // 2. Coach registers with the one-time invite token
  const regRes = await call('/api/auth/coach-register', {
    method: 'POST',
    body: {
      inviteToken,
      username: 'coach_zhang',
      password: 'CoachPassword123!',
    },
  });
  assert.equal(regRes.status, 201);
  assert.equal(regRes.body.grant.status, '待确认');

  // Reusing the same one-time invite token is rejected
  const reuseRes = await call('/api/auth/coach-register', {
    method: 'POST',
    body: {
      inviteToken,
      username: 'coach_other',
      password: 'CoachPassword123!',
    },
  });
  assert.equal(reuseRes.status, 409);

  // Coach cannot login before parent confirms the grant
  const prematureLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'coach_zhang', password: 'CoachPassword123!' },
  });
  assert.equal(prematureLogin.status, 403);

  // 3. Owner confirms the coach grant
  const confirmRes = await call(`/api/coach-grants/${grantId}/confirm`, {
    method: 'POST',
    token: ownerToken,
    body: {
      athleteId: 'nico',
      scopes: ['training:write', 'performance:write', 'feedback:write', 'media:read'],
    },
  });
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.status, '生效');

  // Coach logs in and receives coach token
  const coachLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'coach_zhang', password: 'CoachPassword123!' },
  });
  assert.equal(coachLogin.status, 200);
  assert.equal(coachLogin.body.role, 'coach');
  const coachToken = coachLogin.body.accessToken;

  // 4. Coach creates a training record for Nico (stamps feedbackBy when coachNotes is provided)
  const coachTrain = await call('/api/trainings', {
    method: 'POST',
    token: coachToken,
    athleteId: 'nico',
    body: {
      date: '2026-04-05',
      trainingType: '50自冲刺训练',
      durationMinutes: 60,
      totalMeters: 1800,
      completionStatus: '已完成',
      entryMode: '快速',
      coachNotes: '转身推离水墙有力，后程划频需保持。',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(coachTrain.status, 201);
  assert.equal(coachTrain.body.feedbackBy, 'coach_zhang');
  assert.equal(coachTrain.body.createdBy, 'coach_zhang');

  // Parent attempting to tamper with coach-authored coachNotes is blocked with 403
  const parentTamper = await call(`/api/trainings/${coachTrain.body.id}`, {
    method: 'PUT',
    token: ownerToken,
    athleteId: 'nico',
    body: {
      date: '2026-04-05',
      trainingType: '50自冲刺训练',
      durationMinutes: 60,
      totalMeters: 1800,
      completionStatus: '已完成',
      entryMode: '快速',
      coachNotes: '家长擅自修改教练原话',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(parentTamper.status, 403);
  assert.match(parentTamper.body.error, /教练原话不可篡改/);

  // Parent appending notes while preserving coachNotes succeeds
  const parentAppendNotes = await call(`/api/trainings/${coachTrain.body.id}`, {
    method: 'PUT',
    token: ownerToken,
    athleteId: 'nico',
    body: {
      date: '2026-04-05',
      trainingType: '50自冲刺训练',
      durationMinutes: 60,
      totalMeters: 1800,
      completionStatus: '已完成',
      entryMode: '快速',
      coachNotes: '转身推离水墙有力，后程划频需保持。',
      notes: '回家后孩子反馈肩部放松良好。',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(parentAppendNotes.status, 200);
  assert.equal(parentAppendNotes.body.coachNotes, '转身推离水墙有力，后程划频需保持。');
  assert.equal(parentAppendNotes.body.notes, '回家后孩子反馈肩部放松良好。');

  // === 6 Privilege Escalation Cases (all must return 403) ===
  // Case 1: Coach attempts to modify profile / athletes
  const esc1 = await call('/api/profile', {
    method: 'PUT',
    token: coachToken,
    body: { name: 'Hacked', sex: '女', birthDate: '2018-05-10' },
  });
  assert.equal(esc1.status, 403);

  // Case 2: Coach attempts to modify publishing
  const esc2 = await call('/api/publishing', {
    method: 'PUT',
    token: coachToken,
    body: { swimIds: [], mediaIds: [], story: '', confirmedBy: 'coach', confirmedAt: '2026-04-05' },
  });
  assert.equal(esc2.status, 403);

  // Case 3: Coach attempts to delete a training record
  const esc3 = await call(`/api/trainings/${coachTrain.body.id}`, {
    method: 'DELETE',
    token: coachToken,
    athleteId: 'nico',
  });
  assert.equal(esc3.status, 403);

  // Case 4: Coach attempts to read/write ungranted athlete Leo
  const esc4 = await call('/api/snapshot', {
    method: 'GET',
    token: coachToken,
    athleteId: leoId,
  });
  assert.equal(esc4.status, 403);

  // Case 5: Coach attempts to write an ungranted collection (goals)
  const esc5 = await call('/api/goals', {
    method: 'POST',
    token: coachToken,
    athleteId: 'nico',
    body: { title: '越权目标', metric: '50自', targetValue: '39.99', deadline: '2026-12-31', status: '进行中' },
  });
  assert.equal(esc5.status, 403);

  // Case 6: Owner revokes grant -> coach immediately loses write permission
  const revokeRes = await call(`/api/coach-grants/${grantId}/revoke`, {
    method: 'POST',
    token: ownerToken,
    body: {},
  });
  assert.equal(revokeRes.status, 200);
  const esc6 = await call('/api/trainings', {
    method: 'POST',
    token: coachToken,
    athleteId: 'nico',
    body: {
      date: '2026-04-06',
      trainingType: '撤销后尝试写入',
      durationMinutes: 45,
      totalMeters: 1200,
      completionStatus: '已完成',
      entryMode: '快速',
      sets: [],
      mediaIds: [],
    },
  });
  assert.equal(esc6.status, 403);
});

test('M3: cross-period comparison projection computes valid deltas and flags 样本不足 when samples are missing', () => {
  const state = emptyState();
  state.trainings.push(
    {
      id: 't-a1',
      athleteId: 'nico',
      date: '2026-03-05',
      trainingType: '有氧耐力',
      durationMinutes: 60,
      totalMeters: 1500,
      completionStatus: '已完成',
      entryMode: '快速',
      sets: [],
      mediaIds: [],
    },
    {
      id: 't-b1',
      athleteId: 'nico',
      date: '2026-04-05',
      trainingType: '冲刺间歇',
      durationMinutes: 75,
      totalMeters: 2000,
      completionStatus: '已完成',
      entryMode: '快速',
      sets: [],
      mediaIds: [],
    },
  );
  state.swim.push(
    {
      id: 's-a1',
      athleteId: 'nico',
      date: '2026-03-10',
      distance: '50m',
      stroke: '自由泳',
      poolLength: '50m',
      time: '0:42.50',
      timeMs: 42500,
      validityStatus: '有效',
    },
    {
      id: 's-b1',
      athleteId: 'nico',
      date: '2026-04-10',
      distance: '50m',
      stroke: '自由泳',
      poolLength: '50m',
      time: '0:41.20',
      timeMs: 41200,
      validityStatus: '有效',
    },
  );

  const report = comparePeriods(
    state,
    { startDate: '2026-03-01', endDate: '2026-03-31' },
    { startDate: '2026-04-01', endDate: '2026-04-30' },
    { athleteId: 'nico' },
  );
  assert.equal(report.trainingVolume.status, '可对比');
  assert.equal(report.trainingVolume.delta.knownMeters, 500);
  assert.equal(report.performance.status, '可对比');
  assert.equal(report.performance.windowB.pbRefreshCount, 1);
  assert.equal(report.performance.events[0].improved, true);
  assert.equal(report.skills.status, '样本不足');
  assert.equal(report.goals.status, '样本不足');

  // Empty Window A -> trainingVolume and performance must also report 样本不足
  const insufficient = comparePeriods(
    state,
    { startDate: '2026-01-01', endDate: '2026-01-31' },
    { startDate: '2026-04-01', endDate: '2026-04-30' },
    { athleteId: 'nico' },
  );
  assert.equal(insufficient.trainingVolume.status, '样本不足');
  assert.equal(insufficient.trainingVolume.delta, null);
  assert.equal(insufficient.performance.status, '样本不足');
});
