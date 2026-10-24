import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt as derive, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
const hash = value => createHash('sha256').update(value).digest('hex');
const failure = (status, message) => Object.assign(new Error(message), { status });
const same = (a, b) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export function validateAccount(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,32}$/.test(username)) throw failure(400, '账号需为3–32位字母、数字、下划线或短横线');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !password.trim()) throw failure(400, '密码需为12–128位，不能全部为空白');
}
export function createAccounts({ filename, setupCodePath, now = Date.now, sessionMs = 60 * 60 * 1000 }) {
  const sessions = new Map(), attempts = new Map();
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(filename) && !fs.existsSync(setupCodePath)) fs.writeFileSync(setupCodePath, randomBytes(24).toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
  const account = () => {
    if (!fs.existsSync(filename)) return null;
    const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (value.schema !== 1 || typeof value.username !== 'string' || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{128}$/.test(value.passwordHash)) throw new Error('管理员账号文件无效，已停止访问');
    return value;
  };
  account(); // Invalid credentials must fail closed, never reset an existing account.
  const issue = current => {
    for (const [key, session] of sessions) if (session.expiresAt <= now()) sessions.delete(key);
    while (sessions.size >= 10) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString('hex');
    const session = { username: current.username, role: 'owner', csrf: randomBytes(32).toString('hex'), expiresAt: now() + sessionMs, fingerprint: current.passwordHash };
    sessions.set(hash(token), session);
    return { token, session };
  };
  async function login(username, password, address) {
    for (const [key, value] of attempts) if (value.until <= now()) attempts.delete(key);
    const key = hash(address), previous = attempts.get(key);
    if (previous?.count >= 5) throw failure(429, '登录尝试过多，请15分钟后再试');
    if (attempts.size >= 1000 && !previous) throw failure(429, '登录繁忙，请稍后再试');
    attempts.set(key, { count: (previous?.count || 0) + 1, until: previous?.until || now() + 15 * 60 * 1000 });
    const current = account();
    // A fixed-length dummy derivation avoids a fast unknown-account path.
    const input = typeof password === 'string' && password.length <= 128 ? password : '';
    const derived = await scrypt(input, current?.salt || '00000000000000000000000000000000', 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    if (!current || typeof username !== 'string' || !same(username, current.username) || !same(derived.toString('hex'), current.passwordHash)) throw failure(401, '账号或密码不正确');
    attempts.delete(key);
    return issue(current);
  }
  async function setup({ username, password, code }) {
    if (account()) throw failure(409, '管理员账号已经设置，不能重复初始化');
    if (typeof code !== 'string' || !same(code.trim(), fs.readFileSync(setupCodePath, 'utf8').trim())) throw failure(403, '本机初始化码不正确');
    validateAccount(username, password);
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');
    const current = { schema: 1, username, salt, passwordHash };
    try { fs.writeFileSync(filename, JSON.stringify(current) + '\n', { mode: 0o600, flag: 'wx' }); }
    catch (error) { if (error.code === 'EEXIST') throw failure(409, '管理员账号已经设置'); throw error; }
    fs.rmSync(setupCodePath, { force: true });
    return issue(current);
  }
  const readSession = token => {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = hash(token), session = sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= now() || session.fingerprint !== account()?.passwordHash) { sessions.delete(key); return null; }
    if(session.role==='child'){const parent=sessions.get(session.parentHash);if(!parent||parent.role!=='owner'||parent.expiresAt<=now()||parent.username!==session.username){sessions.delete(key);return null;}}
    return session;
  };
  const issueChild=(parentToken,context)=>{const parent=readSession(parentToken);if(parent?.role!=='owner')throw failure(403,'只有家长可以开启儿童查看');const result=issue(account());Object.assign(result.session,{role:'child',parentHash:hash(parentToken),context:structuredClone(context),expiresAt:Math.min(parent.expiresAt,now()+900000)});return result;};
  return { configured: () => !!account(), login, setup, readSession, issueChild, logout: token => { if (token) sessions.delete(hash(token)); }, sessionMs };
}
