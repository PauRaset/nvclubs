// lib/userApi.js
import { api, getToken } from '@/lib/apiClient';
const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// Posibles rutas de perfil (ajusta si tienes la definitiva):
const EP_PRIMARY  = { me: '/api/users/me', avatar: '/api/users/me/avatar' };
const EP_FALLBACK = { me: '/api/auth/me',  avatar: '/api/users/me/avatar'  }; // avatar suele estar en /users

export async function getMe() {
  let r = await api(EP_PRIMARY.me, { method: 'GET' });
  if (!r.ok && (r.status === 404 || r.status === 400 || r.status === 422)) {
    r = await api(EP_FALLBACK.me, { method: 'GET' });
  }
  return r;
}

export async function updateMe(payload) {
  // intenta PUT, cae a PATCH
  let r = await api(EP_PRIMARY.me, { method: 'PUT', body: JSON.stringify(payload) });
  if (!r.ok && (r.status === 404 || r.status === 405)) {
    r = await api(EP_PRIMARY.me, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  if (!r.ok && (r.status === 404 || r.status === 400 || r.status === 422)) {
    r = await api(EP_FALLBACK.me, { method: 'PUT', body: JSON.stringify(payload) });
    if (!r.ok && (r.status === 404 || r.status === 405)) {
      r = await api(EP_FALLBACK.me, { method: 'PATCH', body: JSON.stringify(payload) });
    }
  }
  return r;
}

export async function uploadAvatar(file, fieldName = 'image') {
  const token = getToken();
  const form = new FormData();
  form.append(fieldName, file);

  // Intenta endpoint principal, si 404 prueba fallback
  let res = await fetch(`${BASE}${EP_PRIMARY.avatar}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include',
  });
  if (res.status === 404) {
    res = await fetch(`${BASE}${EP_FALLBACK.avatar}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      credentials: 'include',
    });
  }
  const text = await res.text();
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data };
}
