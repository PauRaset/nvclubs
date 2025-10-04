import { api, getToken } from '@/lib/apiClient';
const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

const EP = {
  me: '/api/users/me',
  avatar: '/api/users/me/avatar',
};

export async function getMe() {
  return api(EP.me, { method: 'GET' });
}

export async function updateMe(payload) {
  return api(EP.me, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function uploadAvatar(file, fieldName = 'image') {
  const token = getToken();
  const form = new FormData();
  form.append(fieldName, file);
  const res = await fetch(`${BASE}${EP.avatar}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}