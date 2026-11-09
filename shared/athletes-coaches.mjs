import { COLLECTIONS, validDate } from './domain.mjs';
import { digestHex, passwordHash, randomHex, constantEqual as safeEqualHex } from './password.mjs';

export const DEFAULT_ATHLETE_ID = 'nico';
export const ATHLETE_SEXES = ['女', '男', '其他'];
export const ATHLETE_STROKES = ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳'];
export const ATHLETE_POOLS = ['25m', '50m', '其他'];
export const COACH_SCOPES = ['training:write', 'performance:write', 'feedback:write', 'media:read'];
export const COACH_SCOPE_LABELS = {
  'training:write': '训练记录写入',
  'performance:write': '游泳成绩写入',
  'feedback:write': '教练点评写入',
  'media:read': '关联影像查看',
};
export const COACH_GRANT_STATUSES = ['待确认', '生效', '已撤销'];
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const fail = (status, message) => Object.assign(new Error(message), { status });
const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const idPattern = /^[A-Za-z0-9_-]{1,100}$/;

export function recordAthleteId(record) {
  return typeof record?.athleteId === 'string' && record.athleteId ? record.athleteId : DEFAULT_ATHLETE_ID;
}

export function defaultNicoAthlete(profile = {}) {
  const name = typeof profile?.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 20) : 'Nico';
  return {
    id: DEFAULT_ATHLETE_ID,
    displayName: name,
    birthDate: validDate(profile?.birthDate) ? profile.birthDate : '',
    sex: ATHLETE_SEXES.includes(profile?.sex) ? profile.sex : '',
    primaryStroke: ATHLETE_STROKES.includes(profile?.primaryStroke) ? profile.primaryStroke : '',
    homePoolLength: ATHLETE_POOLS.includes(profile?.homePoolLength) ? profile.homePoolLength : '',
    heightCm: typeof profile?.heightCm === 'number' && Number.isFinite(profile.heightCm) ? profile.heightCm : null,
    weightKg: typeof profile?.weightKg === 'number' && Number.isFinite(profile.weightKg) ? profile.weightKg : null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

export function athletesList(state, { includeDeleted = false } = {}) {
  const raw = Array.isArray(state?.athletes) && state.athletes.length
    ? state.athletes
    : [defaultNicoAthlete(state?.profile)];
  const hasNico = raw.some(a => a.id === DEFAULT_ATHLETE_ID);
  const list = hasNico ? raw : [defaultNicoAthlete(state?.profile), ...raw];
  return includeDeleted ? list : list.filter(a => !a.deletedAt);
}

export function findAthlete(state, athleteId = DEFAULT_ATHLETE_ID, { includeDeleted = false } = {}) {
  return athletesList(state, { includeDeleted }).find(a => a.id === (athleteId || DEFAULT_ATHLETE_ID)) || null;
}

export function activeAthleteProfile(state, athleteId = DEFAULT_ATHLETE_ID) {
  const athlete = findAthlete(state, athleteId, { includeDeleted: true }) || defaultNicoAthlete(state?.profile);
  return {
    athleteId: athlete.id,
    name: athlete.displayName,
    displayName: athlete.displayName,
    sex: athlete.sex || '',
    birthDate: athlete.birthDate || '',
    primaryStroke: athlete.primaryStroke || '',
    homePoolLength: athlete.homePoolLength || '',
    heightCm: athlete.heightCm ?? null,
    weightKg: athlete.weightKg ?? null,
  };
}

function optionalMetric(value, label, min, max) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') throw fail(400, `${label}格式无效`);
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (num === 0) throw fail(400, `${label}不能填0代替未填写，未知请留空`);
  if (!Number.isFinite(num) || num < min || num > max) throw fail(400, `${label}须在${min}–${max}之间，留空表示未填写`);
  if (Math.abs(num * 10 - Math.round(num * 10)) > 1e-8) throw fail(400, `${label}最多保留一位小数`);
  return Math.round(num * 10) / 10;
}

export function validateAthleteInput(raw, previous = null) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail(400, '运动员档案格式无效');
  const merged = { ...(previous || {}), ...raw };
  const displayName = typeof merged.displayName === 'string' ? merged.displayName.trim() : typeof merged.name === 'string' ? merged.name.trim() : '';
  if (!displayName || displayName.length > 20) throw fail(400, '儿童姓名/昵称必填，且需为1–20个字符');
  const birthDate = merged.birthDate == null || merged.birthDate === '' ? '' : String(merged.birthDate).trim();
  if (birthDate && !validDate(birthDate)) throw fail(400, '生日日期无效，请填写YYYY-MM-DD或留空');
  const sex = merged.sex == null || merged.sex === '' ? '' : String(merged.sex);
  if (sex && !ATHLETE_SEXES.includes(sex)) throw fail(400, '性别选项无效');
  const primaryStroke = merged.primaryStroke == null || merged.primaryStroke === '' ? '' : String(merged.primaryStroke);
  if (primaryStroke && !ATHLETE_STROKES.includes(primaryStroke)) throw fail(400, '主项泳姿选项无效');
  const homePoolLength = merged.homePoolLength == null || merged.homePoolLength === '' ? '' : String(merged.homePoolLength);
  if (homePoolLength && !ATHLETE_POOLS.includes(homePoolLength)) throw fail(400, '常用池长选项无效');
  const heightCm = optionalMetric(merged.heightCm, '身高(cm)', 40, 230);
  const weightKg = optionalMetric(merged.weightKg, '体重(kg)', 5, 180);
  return { displayName, birthDate, sex, primaryStroke, homePoolLength, heightCm, weightKg };
}

export function validateStoredAthletes(state) {
  if (state.athletes === undefined) return;
  if (!Array.isArray(state.athletes) || !state.athletes.length) throw new Error('运动员列表格式无效');
  const ids = new Set();
  for (const item of state.athletes) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !idPattern.test(item.id)) throw new Error('运动员ID无效');
    if (ids.has(item.id)) throw new Error('运动员ID重复');
    ids.add(item.id);
    validateAthleteInput(item);
    if (!iso(item.createdAt) || !iso(item.updatedAt)) throw new Error('运动员时间戳无效');
    if (item.deletedAt !== null && item.deletedAt !== undefined && !iso(item.deletedAt)) throw new Error('运动员删除时间无效');
  }
}

export function validateStoredCoachGrants(state) {
  if (state.coachGrants === undefined) return;
  if (!Array.isArray(state.coachGrants)) throw new Error('教练授权列表格式无效');
  const ids = new Set();
  for (const grant of state.coachGrants) {
    if (!grant || typeof grant !== 'object' || typeof grant.id !== 'string' || !idPattern.test(grant.id)) throw new Error('教练授权ID无效');
    if (ids.has(grant.id)) throw new Error('教练授权ID重复');
    ids.add(grant.id);
    if (typeof grant.athleteId !== 'string' || !idPattern.test(grant.athleteId)) throw new Error('教练授权关联运动员无效');
    if (!Array.isArray(grant.scopes) || !grant.scopes.length || grant.scopes.some(s => !COACH_SCOPES.includes(s))) throw new Error('教练授权权限范围无效');
    if (!COACH_GRANT_STATUSES.includes(grant.status)) throw new Error('教练授权状态无效');
    if (typeof grant.inviteTokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(grant.inviteTokenHash)) throw new Error('教练邀请哈希无效');
    if (!iso(grant.inviteExpiresAt) || !iso(grant.grantedAt)) throw new Error('教练授权时间无效');
  }
}

export function validateStoredAuditLog(state) {
  if (state.auditLog === undefined) return;
  if (!Array.isArray(state.auditLog)) throw new Error('审计日志格式无效');
  for (const entry of state.auditLog) {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.action !== 'string' || !iso(entry.at)) throw new Error('审计日志条目无效');
  }
}

export function appendAuditLog(state, { id, action, actor, role = 'owner', athleteId = DEFAULT_ATHLETE_ID, targetId = '', detail = '', at = new Date().toISOString() }) {
  state.auditLog ||= [];
  const entry = {
    id: id || `audit-${Date.now()}-${state.auditLog.length + 1}`,
    action,
    actor: String(actor || 'system'),
    role,
    athleteId: athleteId || DEFAULT_ATHLETE_ID,
    targetId: String(targetId || ''),
    detail: String(detail || '').slice(0, 500),
    at,
  };
  state.auditLog.push(entry);
  return entry;
}

export function ensureAthletesInitialized(state, now = new Date().toISOString()) {
  if (!Array.isArray(state.athletes) || !state.athletes.length) {
    state.athletes = [{ ...defaultNicoAthlete(state.profile), createdAt: now, updatedAt: now }];
  } else if (!state.athletes.some(a => a.id === DEFAULT_ATHLETE_ID)) {
    state.athletes.unshift({ ...defaultNicoAthlete(state.profile), createdAt: now, updatedAt: now });
  }
  return state.athletes;
}

export function saveAthlete(state, input, { id, isUpdate = false, actor = 'owner', now = new Date().toISOString() } = {}) {
  ensureAthletesInitialized(state, now);
  const existingIndex = id ? state.athletes.findIndex(a => a.id === id) : -1;
  const previous = existingIndex >= 0 ? state.athletes[existingIndex] : null;
  if (isUpdate && !previous) throw fail(404, '未找到该儿童档案');
  if (previous?.deletedAt) throw fail(409, '该儿童档案已在回收站，请先恢复后再编辑');
  const validated = validateAthleteInput(input, previous);
  const athleteId = previous ? previous.id : (id || `athlete-${Date.now()}`);
  const record = {
    id: athleteId,
    ...validated,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
  };
  if (existingIndex >= 0) state.athletes[existingIndex] = record;
  else state.athletes.push(record);
  if (athleteId === DEFAULT_ATHLETE_ID) {
    state.profile = {
      ...(state.profile || {}),
      name: record.displayName,
      sex: record.sex,
      birthDate: record.birthDate,
    };
  }
  appendAuditLog(state, { action: previous ? 'athlete.update' : 'athlete.create', actor, athleteId, targetId: athleteId, detail: `保存儿童档案：${record.displayName}`, at: now });
  return record;
}

export function softDeleteAthlete(state, athleteId, { actor = 'owner', now = new Date().toISOString(), makeTrashId } = {}) {
  ensureAthletesInitialized(state, now);
  const target = state.athletes.find(a => a.id === athleteId);
  if (!target) throw fail(404, '未找到该儿童档案');
  if (target.deletedAt) throw fail(409, '该儿童档案已移入回收站');
  const activeCount = state.athletes.filter(a => !a.deletedAt).length;
  if (activeCount <= 1) throw fail(400, '至少需保留一名在训儿童档案，不能删除最后一名儿童');
  target.deletedAt = now;
  target.deletedBy = actor;
  target.updatedAt = now;
  state.trash ||= [];
  let movedCount = 0;
  for (const key of COLLECTIONS) {
    if (key === 'skillDefinitions' || key === 'trainingTemplates') continue;
    const remaining = [];
    for (const record of state[key] || []) {
      if (recordAthleteId(record) === athleteId) {
        movedCount++;
        state.trash.push({
          id: makeTrashId ? makeTrashId('trash') : `trash-${athleteId}-${key}-${record.id}`,
          collection: key,
          record,
          deletedAt: now,
          deletedBy: actor,
          deletedWithAthleteId: athleteId,
        });
      } else {
        remaining.push(record);
      }
    }
    state[key] = remaining;
  }
  for (const grant of state.coachGrants || []) {
    if (grant.athleteId === athleteId && grant.status !== '已撤销') {
      grant.status = '已撤销';
      grant.revokedAt = now;
      grant.revokedBy = actor;
    }
  }
  appendAuditLog(state, { action: 'athlete.delete', actor, athleteId, targetId: athleteId, detail: `逻辑删除儿童档案并移入回收站（子记录${movedCount}条）`, at: now });
  return { athlete: target, movedCount };
}

export function restoreAthlete(state, athleteId, { actor = 'owner', now = new Date().toISOString() } = {}) {
  ensureAthletesInitialized(state, now);
  const target = state.athletes.find(a => a.id === athleteId);
  if (!target) throw fail(404, '未找到该儿童档案');
  if (!target.deletedAt) throw fail(409, '该儿童档案当前未处于删除状态');
  target.deletedAt = null;
  delete target.deletedBy;
  target.updatedAt = now;
  const remainingTrash = [];
  let restoredCount = 0;
  for (const item of state.trash || []) {
    if (item.deletedWithAthleteId === athleteId && Array.isArray(state[item.collection]) && !state[item.collection].some(r => r.id === item.record.id)) {
      state[item.collection].push(item.record);
      restoredCount++;
    } else {
      remainingTrash.push(item);
    }
  }
  state.trash = remainingTrash;
  appendAuditLog(state, { action: 'athlete.restore', actor, athleteId, targetId: athleteId, detail: `恢复儿童档案及子记录${restoredCount}条`, at: now });
  return { athlete: target, restoredCount };
}

export function migrateMultiAthleteState(raw, { now = '2026-01-01T00:00:00.000Z' } = {}) {
  const state = structuredClone(raw);
  let migrated = false;
  let recordsStamped = 0;
  if (!Array.isArray(state.athletes) || !state.athletes.length) {
    state.athletes = [{ ...defaultNicoAthlete(state.profile), createdAt: now, updatedAt: now }];
    migrated = true;
  }
  if (!Array.isArray(state.coachGrants)) { state.coachGrants = []; migrated = true; }
  if (!Array.isArray(state.auditLog)) { state.auditLog = []; migrated = true; }
  for (const key of COLLECTIONS) {
    for (const record of state[key] || []) {
      if (!record.athleteId) {
        record.athleteId = DEFAULT_ATHLETE_ID;
        recordsStamped++;
        migrated = true;
      }
    }
  }
  for (const item of state.trash || []) {
    if (item?.record && !item.record.athleteId) {
      item.record.athleteId = DEFAULT_ATHLETE_ID;
      recordsStamped++;
      migrated = true;
    }
  }
  return { data: state, migrated, recordsStamped };
}

export function scopeStateForAthlete(state, athleteId = DEFAULT_ATHLETE_ID) {
  if (!state || typeof state !== 'object') return state;
  const targetId = athleteId || DEFAULT_ATHLETE_ID;
  const profile = activeAthleteProfile(state, targetId);
  const scoped = {
    ...state,
    activeAthleteId: targetId,
    athletes: athletesList(state),
    allAthletes: athletesList(state, { includeDeleted: true }),
    coachGrants: state.coachGrants || [],
    auditLog: state.auditLog || [],
    profile: { ...(state.profile || {}), ...profile },
  };
  for (const key of COLLECTIONS) {
    const list = state[key] || [];
    if (key === 'skillDefinitions' || key === 'trainingTemplates') {
      scoped[key] = list.filter(r => !r.athleteId || r.athleteId === DEFAULT_ATHLETE_ID || r.athleteId === targetId);
    } else {
      scoped[key] = list.filter(r => recordAthleteId(r) === targetId);
    }
  }
  if (Array.isArray(state.trash)) {
    scoped.trash = state.trash.filter(item => recordAthleteId(item?.record) === targetId);
  }
  return scoped;
}

export async function createCoachInvite(state, input = {}, { id, actor = 'owner', now = new Date().toISOString() } = {}) {
  ensureAthletesInitialized(state, now);
  const athleteId = input.athleteId || DEFAULT_ATHLETE_ID;
  const athlete = findAthlete(state, athleteId);
  if (!athlete) throw fail(400, '授权关联的儿童档案不存在或已删除');
  const scopes = Array.isArray(input.scopes) && input.scopes.length
    ? [...new Set(input.scopes.map(String))]
    : [...COACH_SCOPES];
  if (scopes.some(s => !COACH_SCOPES.includes(s))) throw fail(400, '教练权限范围包含无效项');
  const coachDisplayName = typeof input.coachDisplayName === 'string' ? input.coachDisplayName.trim().slice(0, 50) : '';
  const inviteToken = `inv_${randomHex(24)}`;
  const inviteTokenHash = await digestHex(inviteToken);
  const inviteExpiresAt = new Date(Date.parse(now) + INVITE_TTL_MS).toISOString();
  state.coachGrants ||= [];
  const grant = {
    id: id || `grant-${Date.now()}-${state.coachGrants.length + 1}`,
    athleteId,
    coachAccountId: '',
    coachDisplayName,
    scopes,
    status: '待确认',
    inviteTokenHash,
    inviteExpiresAt,
    inviteUsedAt: null,
    grantedBy: actor,
    grantedAt: now,
    confirmedAt: null,
    confirmedBy: null,
    revokedAt: null,
    revokedBy: null,
  };
  state.coachGrants.push(grant);
  appendAuditLog(state, { action: 'coach.invite.create', actor, athleteId, targetId: grant.id, detail: `生成教练24h一次性邀请码（${athlete.displayName}）`, at: now });
  return { grant, inviteToken, inviteExpiresAt };
}

export async function acceptCoachInvite(state, input = {}, { now = new Date().toISOString() } = {}) {
  if (!input || typeof input !== 'object') throw fail(400, '邀请注册参数无效');
  const inviteToken = typeof input.inviteToken === 'string' ? input.inviteToken.trim() : '';
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 50) : username;
  if (!inviteToken) throw fail(400, '请填写24小时一次性邀请码');
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) throw fail(400, '教练账号需为3–32位字母、数字、下划线或短横线');
  if (password.length < 12 || password.length > 128 || !password.trim()) throw fail(400, '密码需为12–128位，不能全部为空白');
  const tokenHash = await digestHex(inviteToken);
  const grant = (state.coachGrants || []).find(g => safeEqualHex(g.inviteTokenHash, tokenHash));
  if (!grant) throw fail(400, '邀请码无效或不存在');
  if (grant.status === '已撤销') throw fail(403, '该教练授权已被撤销');
  if (grant.inviteUsedAt || grant.coachAccountId) throw fail(409, '该一次性邀请码已被使用，请让家长重新生成');
  if (Date.parse(grant.inviteExpiresAt) <= Date.parse(now)) throw fail(400, '邀请码已过期（有效期24小时），请让家长重新生成');
  state.coachAccounts ||= [];
  const existingAccount = state.coachAccounts.find(a => a.username === username);
  const salt = existingAccount?.salt || randomHex(16);
  const hash = await passwordHash(password, salt);
  if (existingAccount) {
    if (!safeEqualHex(existingAccount.passwordHash, hash)) throw fail(409, '该教练用户名已存在且密码不一致');
    existingAccount.updatedAt = now;
  } else {
    state.coachAccounts.push({
      username,
      displayName: displayName || username,
      role: 'coach',
      salt,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    });
  }
  grant.coachAccountId = username;
  if (displayName) grant.coachDisplayName = displayName;
  grant.inviteUsedAt = now;
  appendAuditLog(state, { action: 'coach.invite.accept', actor: username, role: 'coach', athleteId: grant.athleteId, targetId: grant.id, detail: `教练 ${username} 绑定邀请码，等待家长确认`, at: now });
  return { grant, coachAccount: { username, displayName: grant.coachDisplayName || username, role: 'coach' } };
}

export function confirmCoachGrant(state, grantId, input = {}, { actor = 'owner', now = new Date().toISOString() } = {}) {
  const grant = (state.coachGrants || []).find(g => g.id === grantId);
  if (!grant) throw fail(404, '未找到该教练授权记录');
  if (grant.status === '已撤销') throw fail(409, '已撤销的授权不能直接恢复，请重新生成邀请码');
  if (!grant.coachAccountId && !input.coachAccountId) throw fail(400, '教练尚未通过邀请码完成账号注册绑定');
  if (input.coachAccountId && !grant.coachAccountId) grant.coachAccountId = String(input.coachAccountId).trim();
  if (input.athleteId) {
    if (!findAthlete(state, input.athleteId)) throw fail(400, '所选儿童档案不存在或已删除');
    grant.athleteId = input.athleteId;
  }
  if (Array.isArray(input.scopes)) {
    if (!input.scopes.length || input.scopes.some(s => !COACH_SCOPES.includes(s))) throw fail(400, '请勾选有效的教练权限范围');
    grant.scopes = [...new Set(input.scopes.map(String))];
  }
  grant.status = '生效';
  grant.confirmedAt = now;
  grant.confirmedBy = actor;
  appendAuditLog(state, { action: 'coach.grant.confirm', actor, athleteId: grant.athleteId, targetId: grant.id, detail: `确认教练 ${grant.coachAccountId} 授权（范围：${grant.scopes.join(',')}）`, at: now });
  return grant;
}

export function revokeCoachGrant(state, grantId, { actor = 'owner', now = new Date().toISOString() } = {}) {
  const grant = (state.coachGrants || []).find(g => g.id === grantId);
  if (!grant) throw fail(404, '未找到该教练授权记录');
  grant.status = '已撤销';
  grant.revokedAt = now;
  grant.revokedBy = actor;
  appendAuditLog(state, { action: 'coach.grant.revoke', actor, athleteId: grant.athleteId, targetId: grant.id, detail: `撤销教练 ${grant.coachAccountId || '未绑定'} 授权`, at: now });
  return grant;
}

export async function verifyCoachLogin(state, username, password) {
  const account = (state?.coachAccounts || []).find(a => a.username === username);
  if (!account) return null;
  const derived = await passwordHash(password, account.salt);
  if (!safeEqualHex(derived, account.passwordHash)) return null;
  return account;
}

export function coachGrantsForAccount(state, coachAccountId) {
  return (state?.coachGrants || []).filter(g => g.coachAccountId === coachAccountId);
}

export function activeCoachGrants(state, coachAccountId) {
  return coachGrantsForAccount(state, coachAccountId).filter(g => g.status === '生效');
}

export function requiredScopeForCollection(collection, isFeedbackOnly = false) {
  if (isFeedbackOnly) return 'feedback:write';
  if (collection === 'trainings') return 'training:write';
  if (collection === 'swim') return 'performance:write';
  if (['plans', 'annotations', 'weakpoints', 'checkins'].includes(collection)) return 'training:write';
  return null;
}

export function authorizeCoachRequest({ state, username, athleteId, collection = null, method = 'GET', isFeedbackOnly = false, isMediaRead = false }) {
  const grants = coachGrantsForAccount(state, username);
  const legacyBearerCoach = username === 'coach' && grants.length === 0;
  if (method === 'DELETE') throw fail(403, '教练账号无权删除记录，仅家长可移入回收站');
  const targetAthleteId = athleteId || (grants.find(g => g.status === '生效')?.athleteId) || DEFAULT_ATHLETE_ID;
  if (legacyBearerCoach) {
    if (targetAthleteId !== DEFAULT_ATHLETE_ID) throw fail(403, '没有该运动员的协作权限');
    if (['POST', 'PUT'].includes(method) && collection) {
      const scope = requiredScopeForCollection(collection, isFeedbackOnly);
      if (!scope) throw fail(403, '没有此记录的修改权限');
    }
    return { athleteId: DEFAULT_ATHLETE_ID, scopes: COACH_SCOPES, legacy: true };
  }
  const athleteGrants = grants.filter(g => g.athleteId === targetAthleteId);
  if (!athleteGrants.length) throw fail(403, '没有该运动员的协作权限');
  const active = athleteGrants.find(g => g.status === '生效');
  if (!active) {
    if (athleteGrants.some(g => g.status === '已撤销')) throw fail(403, '该教练授权已被撤销');
    throw fail(403, '该教练授权尚待家长确认');
  }
  if (isMediaRead && !active.scopes.includes('media:read')) {
    throw fail(403, '没有该运动员影像的查看权限');
  }
  if (['POST', 'PUT'].includes(method) && collection) {
    const needed = requiredScopeForCollection(collection, isFeedbackOnly);
    if (!needed) throw fail(403, '没有此记录的修改权限');
    if (!active.scopes.includes(needed) && !(collection === 'trainings' && isFeedbackOnly && active.scopes.includes('training:write'))) {
      throw fail(403, `缺少所需的教练权限（${COACH_SCOPE_LABELS[needed] || needed}）`);
    }
  }
  return { athleteId: active.athleteId, scopes: active.scopes, grantId: active.id };
}

export function enforceCoachFeedbackIntegrity(record, previous, { role, username, now }) {
  if (previous?.feedbackBy && role !== 'coach') {
    if (record.coachNotes !== previous.coachNotes) {
      throw fail(403, '教练原话不可篡改，家长只可追加训练备注');
    }
    record.feedbackBy = previous.feedbackBy;
    if (previous.feedbackAt) record.feedbackAt = previous.feedbackAt;
  } else if (role === 'coach' && record.coachNotes && record.coachNotes !== (previous?.coachNotes || '')) {
    record.feedbackBy = username;
    record.feedbackAt = now;
  } else if (previous?.feedbackBy) {
    record.feedbackBy = previous.feedbackBy;
    if (previous.feedbackAt) record.feedbackAt = previous.feedbackAt;
  }
  return record;
}
