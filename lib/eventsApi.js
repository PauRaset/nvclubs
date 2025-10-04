// lib/eventsApi.js
import { api, getToken, getUser } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// Endpoints base (ajusta si tu API usa otros paths)
export const ENDPOINTS = {
  list:   '/api/events',                       // base sin filtros
  create: '/api/events',
  byId:   (id) => `/api/events/${id}`,
  image:  (id) => `/api/events/${id}/image`,   // subir imagen (multipart)
};

/* -------------------------------- Helpers -------------------------------- */

// Devuelve true si el evento pertenece al usuario indicado
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

// El backend suele rechazar campos inmutables en UPDATE
function sanitizeForSave(payload) {
  const blacklist = [
    'id', '_id', 'ownerId', 'createdBy', 'userId', 'clubId', 'venueId',
    'createdAt', 'updatedAt', '__v',
  ];
  const clean = { ...payload };
  for (const k of blacklist) delete clean[k];
  return clean;
}

/* --------------------------------- Read ---------------------------------- */

// Lectura (solo mis eventos)
export async function fetchEvents() {
  // 1) Intento con owner=me (si tu backend lo soporta)
  let res = await api(`${ENDPOINTS.list}?owner=me`, { method: 'GET' });

  // 2) Si el backend no entiende owner=me (404/400/422), cargo todo y filtro en cliente
  if (!res.ok && (res.status === 404 || res.status === 400 || res.status === 422)) {
    res = await api(ENDPOINTS.list, { method: 'GET' });
  }

  // Normaliza a array
  const raw = Array.isArray(res.data) ? res.data : [];
  if (!res.ok) {
    // devolvemos error pero con data normalizada a []
    return { ok: false, status: res.status, data: raw };
  }

  // 3) Doble cierre: filtro en cliente por propietario
  const user = getUser();
  const my = user?.id ? raw.filter((ev) => eventOwnedByUser(ev, user.id)) : raw;

  return { ok: true, status: 200, data: my };
}

// Detalle
export async function fetchEvent(id) {
  return api(ENDPOINTS.byId(id), { method: 'GET' });
}

/* ------------------------------ Create/Update ---------------------------- */

export async function createEvent(payload) {
  const body = JSON.stringify(sanitizeForSave(payload));
  return api(ENDPOINTS.create, { method: 'POST', body });
}

/**
 * Update con búsqueda agresiva de endpoint:
 * - Métodos: PUT → PATCH → POST
 * - Rutas: /api/events/:id, /api/event/:id (singular),
 *          /api/events/update/:id, /api/events/:id/update,
 *          /api/events/edit/:id, /api/events/:id/edit,
 *          /api/event/update/:id, /api/event/:id/update
 */
export async function updateEvent(id, payload) {
  const body = JSON.stringify(sanitizeForSave(payload));

  const candidates = [
    // plural normal
    { path: ENDPOINTS.byId(id),               methods: ['PUT','PATCH','POST'] },
    // singular normal
    { path: `/api/event/${id}`,               methods: ['PUT','PATCH','POST'] },
    // variantes "update"
    { path: `/api/events/update/${id}`,       methods: ['PUT','PATCH','POST'] },
    { path: `/api/events/${id}/update`,       methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/update/${id}`,        methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/${id}/update`,        methods: ['PUT','PATCH','POST'] },
    // variantes "edit"
    { path: `/api/events/edit/${id}`,         methods: ['PUT','PATCH','POST'] },
    { path: `/api/events/${id}/edit`,         methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/edit/${id}`,          methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/${id}/edit`,          methods: ['PUT','PATCH','POST'] },
  ];

  let last = null;
  for (const c of candidates) {
    for (const m of c.methods) {
      const r = await api(c.path, { method: m, body });
      last = r;
      if (r.ok) return r;
      // Si el backend devuelve 4xx/5xx seguimos probando el siguiente candidato
      if (![404,405,400,422].includes(r.status)) {
        // Si no es uno de los “esperables”, devolvemos ese error ya
        return r;
      }
    }
  }
  // Si ninguno funcionó, devolvemos el último intento
  return last || { ok:false, status:404, data:{ message:'No update route matched' } };
}

export async function deleteEvent(id) {
  // intentamos plural y singular por si acaso
  let r = await api(ENDPOINTS.byId(id), { method: 'DELETE' });
  if (r.ok) return r;
  if (r.status === 404 || r.status === 405) {
    r = await api(`/api/event/${id}`, { method: 'DELETE' });
  }
  return r;
}

/* --------------------------------- Image --------------------------------- */

// Si tu backend espera el archivo en otro campo (p. ej. "heroImage"),
// cambia el nombre en el append o pásalo vía parámetro.
export async function uploadEventImage(id, file, fieldName = 'image') {
  const token = getToken();
  const form = new FormData();
  form.append(fieldName, file);

  // intentamos plural y, si 404, probamos singular
  let res = await fetch(`${BASE}${ENDPOINTS.image(id)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    credentials: 'include',
  });

  if (res.status === 404) {
    res = await fetch(`${BASE}/api/event/${id}/image`, {
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
