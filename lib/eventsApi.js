// lib/eventsApi.js
import { api, getToken } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// 🔁 Ajusta estos paths si en tu backend son distintos
export const ENDPOINTS = {
  list:   '/api/events?owner=me',          // o '/api/events/venue/:venueId'
  create: '/api/events',
  byId:   (id) => `/api/events/${id}`,
  image:  (id) => `/api/events/${id}/image`, // subir imagen (multipart)
  photos: (id) => `/api/events/${id}/photos`,
  photo:  (id, photoId) => `/api/events/${id}/photos/${photoId}`,
};

// --- CRUD ---

export async function fetchEvents() {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.list}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export async function fetchEvent(id) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.byId(id)}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export async function createEvent(payload) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.create}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export async function updateEvent(id, payload) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.byId(id)}`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export async function deleteEvent(id) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.byId(id)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// --- Imagen (multipart) ---
// Si tu backend espera el archivo en otro campo que no sea "image", cámbialo aquí.

export async function fetchEventPhotos(id) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.photos(id)}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

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

export async function deleteEventPhoto(id, photoId) {
  const token = getToken();
  const res = await fetch(`${BASE}${ENDPOINTS.photo(id, photoId)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
