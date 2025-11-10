// lib/registrationApi.js
const BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ''
).replace(/\/+$/, '');

if (typeof window !== 'undefined' && !BASE) {
  // eslint-disable-next-line no-console
  console.error('[registrationApi] NEXT_PUBLIC_API_URL no está definido. Configura la URL del backend en Vercel.');
}

async function jsonFetch(path, opts = {}) {
  if (!BASE) throw new Error('Config error: falta NEXT_PUBLIC_API_URL en el entorno');
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    ...(opts.method ? { method: opts.method } : {}),
    cache: 'no-store',
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function sendRegistrationRequest(payload) {
  // payload: { name, email, website, city, instagram, notes }
  return jsonFetch('/api/registration/request', {
    method: 'POST',
    body: payload
  });
}

export function verifyRegistration(token) {
  return jsonFetch(`/api/registration/verify?token=${encodeURIComponent(token)}`, {
    method: 'POST'
  });
}
