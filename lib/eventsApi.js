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

// -------- Normalización de lectura (para que la UI no reviente) ----------
function toISOOrNull(v) {
  if (!v) return null;
  // admite Date, número (epoch), o string
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || raw._id || raw.eventId || raw.slug || null;

  // fecha/hora: tomar el primer campo que exista
  const iso = toISOOrNull(
    raw.date ?? raw.startDate ?? raw.startsAt ?? raw.datetime ?? raw.when
  );

  // ubicación
  const address =
    raw.address ??
    raw.location?.address ??
    raw.venue?.address ??
    '';
  const city =
    raw.city ??
    raw.location?.city ??
    raw.venue?.city ??
    '';

  const out = {
    id,
    title: raw.title ?? raw.name ?? '',
    description: raw.description ?? raw.desc ?? '',
    dateISO: iso, // SIEMPRE ISO para pintar
    price: raw.price ?? raw.priceEUR ?? raw.price_eur ?? null,
    address,
    city,
    dressCode: raw.dressCode ?? raw.dress_code ?? '',
    minAge: raw.minAge ?? raw.min_age ?? raw.age ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres
          : Array.isArray(raw.tags)   ? raw.tags
          : Array.isArray(raw.music)  ? raw.music
          : [],
    // conserva el objeto original por si hace falta
    _raw: raw,
  };
  return out;
}

// -------- Mapeo de escritura (lo que enviamos al backend) -----------------
// Ajusta si tu backend usa otros nombres definitivos.
function mapEventForSave(uiEvent) {
  const clean = sanitizeForSave(uiEvent);

  // Intentamos mandar un set "estándar":
  // title, description, date (ISO), price, address, city, dressCode, minAge, genres
  const iso = clean.dateISO || clean.date || clean.startDate || null;

  const payload = {
    title: clean.title ?? '',
    description: clean.description ?? '',
    // Muchas APIs esperan 'date' o 'startDate'; enviamos ambos si existen
    date: iso || null,
    startDate: iso || null,
    price: clean.price ?? null,
    address: clean.address ?? '',
    city: clean.city ?? '',
    dressCode: clean.dressCode ?? '',
    minAge: clean.minAge ?? null,
    genres: clean.genres ?? [],
  };

  // Además, si tu backend usa claves alternativas, las rellenamos también
  // para maximizar compatibilidad (no hace daño si el backend ignora extras):
  payload.datetime = payload.date;
  payload.startsAt = payload.date;

  return payload;
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

  const list = Array.isArray(res.data) ? res.data : [];
  const normalized = list.map(normalizeEvent).filter(Boolean);

  if (!res.ok) {
    return { ok: false, status: res.status, data: normalized };
  }

  // 3) Doble cierre: filtro en cliente por propietario (si tenemos user.id)
  const user = getUser();
  const my = user?.id
    ? normalized.filter((ev) => eventOwnedByUser(ev?._raw, user.id))
    : normalized;

  return { ok: true, status: 200, data: my };
}

// Detalle
export async function fetchEvent(id) {
  const r = await api(ENDPOINTS.byId(id), { method: 'GET' });
  if (!r.ok) return r;
  return { ok: true, status: 200, data: normalizeEvent(r.data) };
}

/* ------------------------------ Create/Update ---------------------------- */

export async function createEvent(payload) {
  // payload viene de la UI (EventForm) — lo mapeamos
  const body = JSON.stringify(mapEventForSave(payload));
  // probar POST /api/events
  let r = await api(ENDPOINTS.create, { method: 'POST', body });
  // fallback: POST /api/event (singular)
  if (!r.ok && (r.status === 404 || r.status === 405)) {
    r = await api('/api/event', { method: 'POST', body });
  }
  if (!r.ok) return r;

  // normalizamos el evento devuelto si lo hay
  return {
    ok: true,
    status: r.status,
    data: normalizeEvent(r.data) ?? r.data,
  };
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
  const body = JSON.stringify(mapEventForSave(payload));

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
      if (r.ok) {
        return {
          ok: true,
          status: r.status,
          data: normalizeEvent(r.data) ?? r.data,
        };
      }
      if (![404,405,400,422].includes(r.status)) {
        return r; // error “no previsto”: devolvemos ya
      }
    }
  }
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
