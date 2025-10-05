// lib/eventsApi.js
import { api, getToken, getUser } from '@/lib/apiClient';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';

// Endpoints base (ajusta si tu API usa otros paths)
export const ENDPOINTS = {
  list:   '/api/events',
  create: '/api/events',
  byId:   (id) => `/api/events/${id}`,
  image:  (id) => `/api/events/${id}/image`,
};

/* -------------------------------- Helpers -------------------------------- */

function eventOwnedByUser(ev, userId) {
  if (!ev || !userId) return false;

  // Nuestro backend devuelve createdBy como ObjectId o como objeto poblado
  const owner =
    ev.createdBy ??
    ev.ownerId ??
    ev.userId ??
    ev.clubId ??
    ev.venueId;

  if (!owner) return false;
  if (typeof owner === 'string') return owner === userId;
  return owner?._id === userId || owner?.id === userId || owner?.toString?.() === userId;
}

function sanitizeForSave(payload) {
  const blacklist = [
    'id', '_id', 'ownerId', 'createdBy', 'userId', 'clubId', 'venueId',
    'createdAt', 'updatedAt', '__v', 'photos', 'attendees',
  ];
  const clean = { ...payload };
  for (const k of blacklist) delete clean[k];
  return clean;
}

// parse helpers
function toISOOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function ensureArrayStrings(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    // admite JSON string o CSV
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return v.split(',').map(s => s.trim()).filter(Boolean).map(String);
    }
  }
  return [];
}

function toNumOrKeep(v) {
  if (v === undefined || v === null || v === '') return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

/* -------- Normalización de lectura (para que la UI no reviente) ---------- */

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id =
    raw.id || raw._id || raw.eventId || raw.slug || null;

  // fechas: preferimos startAt/endAt; compat con "date"
  const startISO = toISOOrNull(raw.startAt ?? raw.date ?? raw.startDate ?? raw.startsAt ?? raw.datetime ?? raw.when);
  const endISO   = toISOOrNull(raw.endAt   ?? raw.endDate   ?? raw.endsAt   ?? raw.finishAt);

  // ubicación
  const street     = raw.street ?? raw.location?.street ?? raw.venue?.street ?? '';
  const city       = raw.city ?? raw.location?.city ?? raw.venue?.city ?? '';
  const postalCode = raw.postalCode ?? raw.zip ?? raw.postal_code ?? raw.location?.postalCode ?? '';

  // categorías
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map(String)
    : ensureArrayStrings(raw.categories);

  // image principal (también devolvemos imageUrl si el backend lo puso)
  const image = raw.image ?? null;
  const imageUrl = raw.imageUrl ?? raw.image_url ?? null;

  return {
    id,
    title: raw.title ?? raw.name ?? '',
    description: raw.description ?? raw.desc ?? '',
    startAtISO: startISO,
    endAtISO: endISO,
    // compat con código que aún mire "dateISO"
    dateISO: startISO,

    // ubicación
    street,
    city,
    postalCode,

    // extras
    categories,
    dressCode: raw.dressCode ?? raw.dress_code ?? '',
    age: raw.age ?? raw.minAge ?? raw.min_age ?? null,
    price: raw.price ?? raw.priceEUR ?? raw.price_eur ?? null,

    image,
    imageUrl,

    // conserva el objeto original por si hace falta
    _raw: raw,
  };
}

/* -------- Mapeo de escritura (lo que enviamos al backend) ----------------- */
// El backend acepta JSON normal; si hay imagen usamos uploadEventImage() aparte.
function mapEventForSave(uiEvent) {
  const clean = sanitizeForSave(uiEvent);

  // Fechas: priorizamos startAt/endAt (o dateISO legacy)
  const startISO =
    clean.startAtISO ||
    clean.startAt ||
    clean.dateISO ||
    clean.date ||
    null;

  const endISO =
    clean.endAtISO ||
    clean.endAt ||
    null;

  // Ubicación
  const street     = clean.street ?? clean.address ?? '';
  const city       = clean.city ?? '';
  const postalCode = clean.postalCode ?? clean.zip ?? '';

  // Extras
  const categories = ensureArrayStrings(clean.categories ?? clean.genres ?? clean.tags);
  const age  = toNumOrKeep(clean.age ?? clean.minAge);
  const price = toNumOrKeep(clean.price);

  const payload = {
    title: clean.title ?? '',
    description: clean.description ?? '',

    // Fechas nuevas
    startAt: startISO || null,
    endAt: endISO || null,

    // Compat: muchos sitios siguen leyendo "date" → enviamos también
    date: startISO || null,

    // Ubicación
    street,
    city,
    postalCode,

    // Extras
    categories,
    dressCode: clean.dressCode ?? '',
    age,
    price,
  };

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
  const body = JSON.stringify(mapEventForSave(payload));

  // POST /api/events
  let r = await api(ENDPOINTS.create, { method: 'POST', body });

  // Fallbacks por si existieran rutas antiguas
  if (!r.ok && (r.status === 404 || r.status === 405)) {
    const alts = ['/api/event', '/api/events/create', '/api/event/create'];
    for (const p of alts) {
      const rr = await api(p, { method: 'POST', body });
      if (rr.ok) { r = rr; break; }
      if (![404,405,400,422].includes(rr.status)) { r = rr; break; }
    }
  }

  if (!r.ok) return r;

  return {
    ok: true,
    status: r.status,
    data: normalizeEvent(r.data) ?? r.data,
  };
}

/**
 * Update con búsqueda agresiva de endpoint:
 * Primero probamos los reales del backend actual (PUT/PATCH /api/events/:id),
 * luego variantes legacy por si acaso.
 */
export async function updateEvent(id, payload) {
  const body = JSON.stringify(mapEventForSave(payload));

  const candidates = [
    // Backend actual
    { path: ENDPOINTS.byId(id),               methods: ['PUT','PATCH'] },

    // Variantes legacy (por si en algún entorno quedó algo antiguo)
    { path: `/api/event/${id}`,               methods: ['PUT','PATCH','POST'] },
    { path: `/api/events/update/${id}`,       methods: ['PUT','PATCH','POST'] },
    { path: `/api/events/${id}/update`,       methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/update/${id}`,        methods: ['PUT','PATCH','POST'] },
    { path: `/api/event/${id}/update`,        methods: ['PUT','PATCH','POST'] },
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
        return r; // error “no previsto”
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
