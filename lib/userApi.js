// lib/userApi.js
import { api, getToken } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// Rutas definitivas del backend actual
const EP_PRIMARY  = { me: '/api/users/me', avatar: '/api/users/me/avatar' };

// Por si existe algún legacy en tu proyecto (no estorba)
const EP_FALLBACK = { me: '/api/auth/me',  avatar: '/api/users/me/avatar' };

/* ------------------------ Lectura de perfil ------------------------ */
export async function getMe() {
  // Intento principal
  let r = await api(EP_PRIMARY.me, { method: 'GET' });
  // Fallback si hay algún montaje legacy
  if (!r.ok && (r.status === 404 || r.status === 400 || r.status === 422)) {
    r = await api(EP_FALLBACK.me, { method: 'GET' });
  }
  return r;
}

/* -------------------- Actualización de perfil ---------------------- */
export async function updateMe(payload) {
  // Tu backend acepta PATCH/PUT en /api/users/me
  let r = await api(EP_PRIMARY.me, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!r.ok && (r.status === 404 || r.status === 405)) {
    r = await api(EP_PRIMARY.me, { method: 'PUT', body: JSON.stringify(payload) });
  }

  // Fallbacks por si el primary no existe en algún entorno
  if (!r.ok && (r.status === 404 || r.status === 400 || r.status === 422)) {
    r = await api(EP_FALLBACK.me, { method: 'PATCH', body: JSON.stringify(payload) });
    if (!r.ok && (r.status === 404 || r.status === 405)) {
      r = await api(EP_FALLBACK.me, { method: 'PUT', body: JSON.stringify(payload) });
    }
  }
  return r;
}

/* ---------------------- Subida de avatar --------------------------- */
// ¡OJO! El backend espera el campo **avatar** (no "image")
export async function uploadAvatar(file, fieldName = 'avatar') {
  const token = getToken();
  const form = new FormData();
  form.append(fieldName, file);

  // Intento en ruta principal
  let res = await fetch(`${BASE}${EP_PRIMARY.avatar}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include',
  });

  // Fallback (mantengo por compatibilidad aunque avatar ya está en /users)
  if (res.status === 404) {
    res = await fetch(`${BASE}${EP_FALLBACK.avatar}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      credentials: 'include',
    });
  }

  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

/*// lib/userApi.js
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
}*/
