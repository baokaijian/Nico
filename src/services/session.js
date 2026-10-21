// 仅在当前标签页保留有效会话，不保存密码、角色或业务数据。
export function createSessionPersistence(base, { storage, now = Date.now } = {}) {
  try { storage ??= globalThis.sessionStorage; } catch { /* 浏览器禁用存储时仍可在内存中登录。 */ }
  const key = `nico.session.v1:${base.replace(/\/$/, '')}`;
  const read = name => { try { return storage?.getItem(name); } catch { return null; } };
  const write = (name, value) => { try { if (value == null) storage?.removeItem(name); else storage?.setItem(name, value); } catch { /* 不阻断账号操作。 */ } };
  const valid = value => value?.version === 1 && /^[a-f0-9]{64}$/.test(value.accessToken) && Number.isFinite(value.expiresAt) && value.expiresAt > now();
  return {
    load() {
      if (!base) return null;
      try { const value = JSON.parse(read(key)); if (valid(value)) return value; } catch { /* 清除损坏或过期的缓存。 */ }
      write(key, null); return null;
    },
    save(accessToken, expiresAt) { const value = { version: 1, accessToken, expiresAt }; if (base && valid(value)) write(key, JSON.stringify(value)); else write(key, null); },
    clear() { write(key, null); },
    loadMode: () => read(`${key}:mode`) === 'view' ? 'view' : 'manage',
    saveMode: mode => write(`${key}:mode`, mode === 'view' ? 'view' : 'manage'),
  };
}
