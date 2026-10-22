import test from 'node:test';
import assert from 'node:assert/strict';
import { validTrainingDraft } from '../src/services/useRecordDraft.js';
import { createDraftStore } from '../src/services/drafts.js';
const memoryStorage = () => { const map = new Map(); return { get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; };
const scope = account => ({ backend: 'https://protocol.invalid', athlete: 'nico', account });
const payload = { kind: 'trainings', values: { date: '2000-01-01', totalMeters: 0, notes: 'protocol-only' }, editing: null, baseRevision: 3, clientRequestId: 'protocol-request' };

test('登录甲保存训练/成绩草稿，退出后乙和其他档案/接口均不可恢复，甲重新登录可恢复', () => {
  const storage = memoryStorage(); let current = scope('account-a');
  const a = createDraftStore({ storage, scope: current, isCurrent: value => value === current });
  a.write('training', payload); a.write('swim', { values: { time: '56.171' }, editing: null, baseRevision: 3 });
  current = null; assert.equal(a.read('training').status, 'inactive');
  current = scope('account-b'); const b = createDraftStore({ storage, scope: current });
  assert.equal(b.read('training').status, 'none'); assert.equal(b.read('swim').status, 'none');
  for (const other of [{ ...scope('account-a'), athlete: 'other' }, { ...scope('account-a'), backend: 'https://other.invalid' }]) assert.equal(createDraftStore({ storage, scope: other }).read('training').status, 'none');
  const restored = createDraftStore({ storage, scope: scope('account-a') });
  assert.equal(restored.read('training').payload.values.totalMeters, 0); assert.equal(restored.read('swim').payload.values.time, '56.171');
});

test('七天未编辑的草稿只标记过期，不自动恢复或删除；明确续期后恢复原输入与请求版本', () => {
  const storage = memoryStorage(); let now = 1000;
  const store = createDraftStore({ storage, scope: scope('a'), now: () => now });
  store.write('training', payload);
  const saved = JSON.parse(storage.getItem(storage.key(0))); saved.status = 'ready'; storage.setItem(storage.key(0), JSON.stringify(saved));
  now += 7 * 86400000;
  const expired = store.read('training'); assert.equal(expired.status, 'expired'); assert.equal(storage.length, 1);
  assert.equal(store.restore('training').status, 'expired');
  const restored = store.restore('training', { renewExpired: true });
  assert.equal(restored.status, 'ready'); assert.deepEqual(restored.payload, payload); assert.equal(store.read('training').status, 'ready');
});

test('未归属旧草稿不认领，确认导入仅创建当前身份副本，保留原件；清理仅影响本身份', () => {
  const storage = memoryStorage(); storage.setItem('nico_training_draft_v1', JSON.stringify(payload));
  const store = createDraftStore({ storage, scope: scope('a') });
  assert.equal(store.read('training').status, 'none');
  assert.equal(store.importLegacy('training').status, 'confirmation-required');
  assert.equal(store.importLegacy('training', { confirmOwnership: true }).status, 'ready');
  assert.ok(storage.getItem('nico_training_draft_v1'));
  createDraftStore({ storage, scope: scope('b') }).write('training', { ...payload, values: { date: '2000-01-02' } });
  assert.equal(store.clear().status, 'cleared'); assert.equal(store.read('training').status, 'none');
  assert.equal(createDraftStore({ storage, scope: scope('b') }).read('training').status, 'ready');
  assert.ok(storage.getItem('nico_training_draft_v1'));
});

test('退出后滞留的自动保存不能重新写草稿；损坏及不可用存储不崩溃也不冒充已保存', () => {
  const storage = memoryStorage(), owner = scope('a'); let active = true;
  const store = createDraftStore({ storage, scope: owner, isCurrent: () => active });
  store.write('training', payload); store.remove('training'); active = false;
  assert.equal(store.write('training', payload).status, 'inactive'); assert.equal(storage.length, 0);
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  const unavailable = createDraftStore({ storage: blocked, scope: owner });
  assert.equal(unavailable.write('swim', { values: {} }).status, 'unavailable'); assert.equal(unavailable.read('swim').status, 'unavailable');
  const live = createDraftStore({ storage, scope: owner }); live.write('training', payload);
  storage.setItem(storage.key(0), 'broken-json'); assert.equal(live.read('training').status, 'corrupt'); assert.equal(storage.length, 1);
});

test('损坏的既有草稿不能被后台自动保存覆盖，需明确删除后重新填写', () => {
  const storage = memoryStorage(), store = createDraftStore({ storage, scope: scope('a') });
  store.write('training', payload); const key = storage.key(0); storage.setItem(key, 'broken-original');
  assert.equal(store.write('training', payload).status, 'corrupt'); assert.equal(storage.getItem(key), 'broken-original');
  store.remove('training'); assert.equal(store.write('training', payload).status, 'ready');
});


test('训练草稿损坏的组项和影像列表不得恢复到表单', () => {
  const storage = memoryStorage(), store = createDraftStore({ storage, scope: scope('a'), validate: validTrainingDraft });
  assert.equal(store.write('training', { ...payload, values: { ...payload.values, sets: [null], mediaIds: [] } }).status, 'corrupt');
  assert.equal(store.write('training', { ...payload, values: { ...payload.values, sets: [], mediaIds: [null] } }).status, 'corrupt');
  assert.equal(storage.length, 0);
});
