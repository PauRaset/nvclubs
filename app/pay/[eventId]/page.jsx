// app/pay/[eventId]/page.jsx
import { redirect } from "next/navigation";
import PayCheckoutClient from "./PayCheckoutClient";

export default function PayEventPage({ params, searchParams }) {
  const { eventId } = params;

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.nightvibe.life";

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
