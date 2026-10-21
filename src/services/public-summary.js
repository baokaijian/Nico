// A configured API is authoritative, including publication revocations.
// Never recover an API outage by displaying a stale static publication.
export async function loadPublicSummary(api, { live, base, signal, fetcher = fetch }) {
  if (live) return api.request('/api/public-summary', { signal });
  const response = await fetcher(`${base}public-summary.json`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('公开摘要加载失败，请重试');
  return response.json();
}
