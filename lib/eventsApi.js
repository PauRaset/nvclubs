// lib/eventsApi.js
import { api, getToken } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// 🔁 Ajusta estos paths si en tu backend son distintos
export const ENDPOINTS = {
  list:   '/api/events?owner=me',          // o '/api/events/venue/:venueId'
  create: '/api/events',
  byId:   (id) => `/api/events/${id}`,
  image:  (id) => `/api/events/${id}/image` // subir imagen (multipart)
};

// --- CRUD ---

export async function fetchEvents() {
  return api(ENDPOINTS.list, { method: 'GET' });
}

export async function fetchEvent(id) {
  return api(ENDPOINTS.byId(id), { method: 'GET' });
}

export async function createEvent(payload) {
  return api(ENDPOINTS.create, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateEvent(id, payload) {
  return api(ENDPOINTS.byId(id), {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteEvent(id) {
  return api(ENDPOINTS.byId(id), { method: 'DELETE' });
}

// --- Imagen (multipart) ---
// Si tu backend espera el archivo en otro campo que no sea "image", cámbialo aquí.
export async function uploadEventImage(id, file) {
  const token = getToken();
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${BASE}${ENDPOINTS.image(id)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include'
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
