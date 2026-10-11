// app/pay/[eventId]/page.jsx
import { redirect } from "next/navigation";
import PayCheckoutClient from "./PayCheckoutClient";
import { API_BASE } from '@/lib/apiBase';

export default function PayEventPage({ params, searchParams }) {
  const { eventId } = params;

  const apiBase = API_BASE;

  // Si ya viene qty por URL (ej: /pay/ID?qty=3), redirigimos directo (como antes)
  const qty = searchParams?.qty ? String(searchParams.qty).trim() : "";
  if (qty) {
    const target = `${apiBase}/api/payments/direct/${eventId}?qty=${encodeURIComponent(
      qty
    )}`;
    redirect(target);
  }

  // Si NO viene qty, mostramos selector en ESTA misma página
  return (
    <PayCheckoutClient
      eventId={eventId}
      apiBase={apiBase}
      maxQty={10} // ajusta si quieres
      defaultQty={1}
    />
  );
}
