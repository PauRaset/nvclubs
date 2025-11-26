// app/pay/[eventId]/page.jsx
import { redirect } from 'next/navigation';

export default function PayEventPage({ params }) {
  const { eventId } = params;

  // Usa la misma base que usas ya para el backend
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nightvibe.life';

  const target = `${apiBase}/api/payments/direct/${eventId}`;

  // Redirección server-side directa a Stripe Checkout (vía backend)
  redirect(target);
}