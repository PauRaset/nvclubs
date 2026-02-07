// app/pay/[eventId]/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function PayEventPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const eventId = params?.eventId;

  // Backend base URL
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nightvibe.life';

  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [err, setErr] = useState('');

  const refCode = searchParams?.get('ref') || '';
  const shareChannel = searchParams?.get('ch') || '';

  const priceLabel = useMemo(() => {
    const unit = event?.price ?? event?.ticketPrice ?? event?.priceEUR;
    if (unit == null) return '';
    const n = Number(unit);
    if (!Number.isFinite(n)) return '';
    return `${n.toFixed(2)} €`;
  }, [event]);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    (async () => {
      try {
        setErr('');

        // Intentamos cargar el evento para mostrar título/precio (si el endpoint existe)
        const res = await fetch(`${apiBase}/api/events/${eventId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          // No bloqueamos el pago si este endpoint no existe
          return;
        }

        const data = await res.json();
        if (!cancelled) setEvent(data);
      } catch (_) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, apiBase]);

  async function startCheckout() {
    if (!eventId) return;

    setLoading(true);
    setErr('');

    try {
      // Creamos sesión de checkout vía /api/orders (soporta qty + comisión visible)
      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          quantity: qty,
          qty,
          // opcional: tracking
          refCode: refCode || undefined,
          shareChannel: shareChannel || undefined,
          source: 'clubs',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }

      const url = data?.url || data?.checkoutUrl || data?.sessionUrl;
      if (!url) {
        throw new Error('No se recibió URL de checkout');
      }

      // Redirige a Stripe
      window.location.assign(url);
    } catch (e) {
      setErr(e?.message || String(e));
      setLoading(false);
    }
  }

  // Si el usuario quiere forzar el flujo antiguo (direct), admite ?direct=1
  useEffect(() => {
    const direct = searchParams?.get('direct');
    if (direct === '1' && eventId) {
      const target = `${apiBase}/api/payments/direct/${eventId}`;
      window.location.replace(target);
    }
  }, [searchParams, eventId, apiBase]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0F19',
        color: '#E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Checkout</h1>
          <span style={{ opacity: 0.75, fontSize: 12 }}>NightVibe</span>
        </div>

        <div style={{ marginTop: 12, opacity: 0.9 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {event?.title || 'Entrada'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Event ID: {eventId}
          </div>
          {priceLabel && (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              Precio: {priceLabel} / entrada
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Cantidad</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={loading}
              style={btnStyle}
            >
              −
            </button>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(0,0,0,0.15)',
                fontWeight: 800,
              }}
            >
              {qty}
            </div>
            <button
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              disabled={loading}
              style={btnStyle}
            >
              +
            </button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            * Los gastos de gestión de NightVibe se añadirán en el Checkout.
          </div>
        </div>

        {err && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(255, 45, 214, 0.08)',
              border: '1px solid rgba(255, 45, 214, 0.20)',
              fontSize: 12,
            }}
          >
            {err}
          </div>
        )}

        <button
          onClick={startCheckout}
          disabled={loading}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid rgba(0,229,255,0.35)',
            background: loading ? 'rgba(0,229,255,0.10)' : 'rgba(0,229,255,0.14)',
            color: '#00E5FF',
            fontWeight: 900,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creando checkout…' : 'Continuar a Stripe'}
        </button>

        <button
          onClick={() => router.push('/')}
          disabled={loading}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Volver
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
  color: '#E5E7EB',
  fontWeight: 900,
  fontSize: 18,
  cursor: 'pointer',
};


/*// app/pay/[eventId]/page.jsx
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
}*/
