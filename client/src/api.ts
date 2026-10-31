export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const t = localStorage.getItem('token');
  const r = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
export const kes = (n: number) => 'KES ' + Number(n).toLocaleString();