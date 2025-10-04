export function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('nv_token') || null;
  }
  
  export function setSession(token, user) {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem('nv_token', token);
    if (user) localStorage.setItem('nv_user', JSON.stringify(user));
  }
  
  export function clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('nv_token');
    localStorage.removeItem('nv_user');
  }
  
  export async function api(path, options = {}) {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${base}${path}`, { ...options, headers, credentials: 'include' });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  }
export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('nv_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
