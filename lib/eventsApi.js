// lib/eventsApi.js
import { api, getToken, getUser } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// Endpoints base (ajusta si tu API usa otros paths)
export const ENDPOINTS = {
  list:   '/api/events',                 // base sin filtros
  create: '/api/events',
  byId:   (id) => `/api/events/${id}`,
  image:  (id) => `/api/events/${id}/image`, // subir imagen (multipart)
};

// ---------- Helpers internos ----------
function eventOwnedByUser(ev, userId) {
  const owner =
    ev?.ownerId ??
    ev?.createdBy ??
    ev?.userId ??
    ev?.clubId ??
    ev?.venueId;

  if (!owner || !userId) return false;

  // Puede venir como string o como objeto {_id} / {id}
  if (typeof owner === 'string') return owner === userId;
  return owner?._id === userId || owner?.id === userId;
}

// ---------- Lectura (solo mis eventos) ----------
export async function fetchEvents() {
  // 1) Intento con owner=me (si tu backend lo soporta)
  let res = await api(`${ENDPOINTS.list}?owner=me`, { method: 'GET' });

  // 2) Si el backend no entiende owner=me (404/400/etc), cargo todo y filtro en cliente
  if (!res.ok && (res.status === 404 || res.status === 400 || res.status === 422)) {
    res = await api(ENDPOINTS.list, { method: 'GET' });
  }

  // Normalizo respuesta a array
  const raw = Array.isArray(res.data) ? res.data : [];
  if (!res.ok) {
    // Devolvemos tal cual el error, pero con data normalizada a []
    return { ok: false, status: res.status, data: raw };
  }

  // 3) Filtro por propietario en cliente como “doble cierre”
  const user = getUser();
  const my = user?.id ? raw.filter((ev) => eventOwnedByUser(ev, user.id)) : raw;

  return { ok: true, status: 200, data: my };
}

// ---------- Detalle ----------
export async function fetchEvent(id) {
  return api(ENDPOINTS.byId(id), { method: 'GET' });
}

// ---------- Crear / Actualizar / Eliminar ----------
export async function createEvent(payload) {
  return api(ENDPOINTS.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(id, payload) {
  return api(ENDPOINTS.byId(id), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(id) {
  return api(ENDPOINTS.byId(id), { method: 'DELETE' });
}

// ---------- Imagen (multipart) ----------
// Si tu backend espera el archivo en otro campo (p. ej. "heroImage"),
// cambia el nombre en el append o añade un parámetro.
export async function uploadEventImage(id, file, fieldName = 'image') {
  const token = getToken();
  const form = new FormData();
  form.append(fieldName, file);

  const res = await fetch(`${BASE}${ENDPOINTS.image(id)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include',
  });

  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
