'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function PayEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const eventId = params?.eventId;

  // Usa la misma base que usas ya para el backend
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nightvibe.life';

  const direct = searchParams?.get('direct') === '1';
  const refCode = searchParams?.get('ref') || '';
  const shareChannel = searchParams?.get('ch') || '';

  const [event, setEvent] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Escape hatch: mantiene el flujo antiguo
  useEffect(() => {
    if (!eventId || !direct) return;
    const target = `${apiBase}/api/payments/direct/${eventId}`;
    window.location.replace(target);
  }, [eventId, direct, apiBase]);

  // Carga datos del evento (título y precio)
  useEffect(() => {
    if (!eventId || direct) return;

    let cancelled = false;

    (async () => {
      try {
        setError('');
        const res = await fetch(`${apiBase}/api/events/${eventId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`No se pudo cargar el evento (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, direct, apiBase]);

  const unitEur = useMemo(() => {
    const v =
      event?.priceEUR ??
      event?.ticketPrice ??
      event?.price ??
      event?.ticket_price ??
      event?.price_eur;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [event]);

  const title = useMemo(() => {
    return (event?.title || event?.name || 'Entrada NightVibe').toString();
  }, [event]);

  async function startCheckout() {
    if (!eventId) return;

    setLoading(true);
    setError('');

    try {
      if (unitEur == null || unitEur <= 0) {
        throw new Error('El evento no tiene un precio válido.');
      }

      const qtySafe = Math.max(1, Math.min(20, Math.floor(Number(qty) || 1)));
      const unitAmount = Math.round(unitEur * 100); // cents

      // ✅ IMPORTANT: mandamos `items[]` para compat con tu /api/orders actual
      const payload = {
        eventId,
        items: [
          {
            name: title,
            currency: 'eur',
            qty: qtySafe,
            unitAmount,
          },
        ],
        // tracking opcional
        ...(refCode ? { refCode } : {}),
        ...(shareChannel ? { shareChannel } : {}),
      };

      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }

      const url = data?.url;
      if (!url) {
        throw new Error('No se recibió URL de Stripe.');
      }

      window.location.assign(url);
    } catch (e) {
      setError(e?.message || String(e));
      setLoading(false);
    }
  }

  if (direct) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 800 }}>Redirigiendo al checkout…</div>
          <div style={{ opacity: 0.7, marginTop: 8, fontSize: 12 }}>
            (modo direct=1)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Comprar entradas</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
              NightVibe · {eventId}
            </div>
          </div>
          <div style={{ color: '#00E5FF', fontWeight: 900 }}>NV</div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Precio por entrada: {unitEur != null ? `${unitEur.toFixed(2)} €` : '—'}
          </div>
          <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>
            * Los gastos de gestión se añaden en Stripe Checkout.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Cantidad</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
            <button
              disabled={loading}
              onClick={() => setQty((q) => Math.max(1, Number(q) - 1))}
              style={smallBtn}
            >
              −
            </button>
            <div style={qtyBox}>{qty}</div>
            <button
              disabled={loading}
              onClick={() => setQty((q) => Math.min(20, Number(q) + 1))}
              style={smallBtn}
            >
              +
            </button>
          </div>
        </div>

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        <button
          onClick={startCheckout}
          disabled={loading || !eventId || unitEur == null}
          style={primaryBtn(loading)}
        >
          {loading ? 'Creando checkout…' : 'Continuar a Stripe'}
        </button>

        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 11 }}>
          Si necesitas el flujo antiguo: añade <code>?direct=1</code> a la URL.
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0B0F19',
  color: '#E5E7EB',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

const cardStyle = {
  width: '100%',
  maxWidth: 520,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding: 18,
};

const smallBtn = {
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

const qtyBox = {
  flex: 1,
  textAlign: 'center',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.15)',
  fontWeight: 900,
};

const errorBox = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: 'rgba(255, 45, 214, 0.08)',
  border: '1px solid rgba(255, 45, 214, 0.20)',
  fontSize: 12,
};

const primaryBtn = (loading) => ({
  marginTop: 16,
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(0,229,255,0.35)',
  background: loading ? 'rgba(0,229,255,0.10)' : 'rgba(0,229,255,0.14)',
  color: '#00E5FF',
  fontWeight: 900,
  cursor: loading ? 'not-allowed' : 'pointer',
});


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
