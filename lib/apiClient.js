// lib/apiClient.js
const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';
const TOKEN_KEY = 'nv_token';
const USER_KEY  = 'nv_user';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// Cliente genérico que siempre manda cookies y, si hay token, Authorization
export async function api(path, { method='GET', headers={}, body } = {}) {
  const token = getToken();
  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body,
    credentials: 'include', // importante para cookie-session
  });

  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {} } catch { data = text }

  // Normaliza algunos errores típicos
  if (res.status === 401) {
    return { ok:false, status:401, data: data || { message: 'No autorizado' } };
  }
  return { ok: res.ok, status: res.status, data };
}
