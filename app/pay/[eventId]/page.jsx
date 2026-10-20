// app/pay/[eventId]/page.jsx
// La página de compra vive en el backend (GET /api/payments/direct/:eventId): cartel,
// tandas, cantidad y etiquetas Open Graph para la previsualización del enlace.
// Esta ruta solo redirige, para que los enlaces /pay/… ya compartidos sigan funcionando.
import { redirect } from 'next/navigation';
import { API_BASE } from '@/lib/apiBase';

// Parámetros que se pasan tal cual a la página de compra.
const FORWARDED_PARAMS = ['qty', 'tier', 'ref', 'ch'];

export default async function PayEventPage({ params, searchParams }) {
  const { eventId } = await params;
  const query = (await searchParams) || {};

  const forwarded = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const raw = Array.isArray(query[key]) ? query[key][0] : query[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) forwarded.set(key, value);
  }

  const qs = forwarded.toString();
  redirect(`${API_BASE}/api/payments/direct/${encodeURIComponent(eventId)}${qs ? `?${qs}` : ''}`);
}
