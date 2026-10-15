// lib/clubsApi.js
import { API_BASE } from '@/lib/apiBase';
import { getToken } from '@/lib/apiClient';
const BASE = API_BASE;

// Las rutas /api/clubs/* exigen el token del club; las cookies solas no bastan.
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function json(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getStripeStatus(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/stripe/status`, {
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  return json(res);
}

export async function startOnboarding(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/stripe/onboarding`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  return json(res); // { url, accountId }
}

export async function getOrders(clubId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/clubs/${clubId}/orders${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  return json(res); // {count,totalCents,totalTickets,orders}
}

// Descarga autenticada: window.open no puede enviar la cabecera Authorization.
export async function downloadOrdersCsv(clubId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/clubs/${clubId}/orders.csv${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : `pedidos-${clubId}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Margen para que el navegador empiece la descarga antes de liberar el blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function regenerateScannerKey(clubId) {
  const res = await fetch(`${BASE}/api/clubs/${clubId}/scanner-key/regenerate`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  return json(res); // { ok, scannerApiKey }
}
