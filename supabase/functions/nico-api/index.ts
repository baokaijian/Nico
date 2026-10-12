import { createCloudHandler } from '../../../server/cloud-api.mjs';
import { applyDeletionFlags } from '../../../shared/deletion.mjs';
const base = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
if (!base || !secret) throw new Error('后台服务凭据未配置');
const bucket = 'nico-private';
const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
async function rest(resource: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}/rest/v1/${resource}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const text = await response.text();
    if (text.includes('NICO_CONFLICT')) throw Object.assign(new Error('记录已被更新，请刷新后核对'), { status: 409 });
    throw new Error('Database request failed');
  }
  return response.status === 204 ? null : response.json();
}
const backend = {
  account: async (username: string) => (await rest(`nico_accounts?username=eq.${encodeURIComponent(username)}&enabled=eq.true&is_deleted=eq.false&select=*`))[0] || null,
  session: async (hash: string) => (await rest(`nico_sessions?token_hash=eq.${hash}&select=*`))[0] || null,
  createSession: async (body: unknown) => {
    await rest(`nico_sessions?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, 'DELETE');
    return rest('nico_sessions', 'POST', body);
  },
  deleteSession: (hash: string) => rest(`nico_sessions?token_hash=eq.${hash}`, 'DELETE'),
  loginAttempt: (key: string) => rest('rpc/nico_login_attempt', 'POST', { p_key: key }),
  changePassword: (username: string, previous: string, salt: string, hash: string) => rest('rpc/nico_change_password', 'POST', { p_username: username, p_previous: previous, p_salt: salt, p_hash: hash }),
  read: async () => { const value = await rest('rpc/nico_read_state'); if (!value) throw new Error('Nico facts missing'); return { data: applyDeletionFlags(value.data, value.deleted_records), revision: value.revision }; },
  save: (expected: number, data: unknown, actor: string) => rest('rpc/nico_save_state', 'POST', { p_expected: expected, p_data: data, p_actor: actor }),
  ensureBucket: async () => {
    const found = await fetch(`${base}/storage/v1/bucket/${bucket}`, { headers }); if (found.ok) return;
    const response = await fetch(`${base}/storage/v1/bucket`, { method: 'POST', headers, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 52428800 }) });
    if (!response.ok) throw new Error('Private bucket creation failed');
  },
  upload: async (name: string, body: ArrayBuffer, type: string) => {
    const response = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, { method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': type, 'x-upsert': 'false' }, body });
    if (!response.ok) throw new Error('Private media upload failed');
  },
  download: (name: string, range: string | null, method: string) => fetch(`${base}/storage/v1/object/authenticated/${bucket}/${encodeURIComponent(name)}`, { method, headers: { apikey: secret, Authorization: `Bearer ${secret}`, ...(range ? { Range: range } : {}) } }),
  removeFile: async (name: string) => { const response = await fetch(`${base}/storage/v1/object/${bucket}`, { method: 'DELETE', headers, body: JSON.stringify({ prefixes: [name] }) }); if (!response.ok) throw new Error('Upload cleanup failed'); },
};
// Public summary/login are intentionally anonymous. Every other route validates a
// hashed, expiring, server-revocable administrator session before touching data.
Deno.serve(createCloudHandler({ backend, origins: ['https://baokaijian.github.io', 'http://127.0.0.1:5173', 'http://localhost:5173'] }));
