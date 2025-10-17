// lib/clubsApi.js
const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.nightvibe.life').replace(/\/+$/, '');

async function json(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getStripeStatus(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/stripe/status`, { credentials: 'include' });
  return json(res);
}

export async function startOnboarding(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/stripe/onboarding`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return json(res); // { url, accountId }
}

export async function getOrders(clubId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/clubs/${clubId}/orders${qs ? `?${qs}` : ''}`, { credentials: 'include' });
  return json(res); // {count,totalCents,totalTickets,orders}
}

export function downloadOrdersCsv(clubId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/clubs/${clubId}/orders.csv${qs ? `?${qs}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function regenerateScannerKey(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/scanner-key/regenerate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return json(res); // { ok, scannerApiKey }
}
