'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function SuccessClient() {
  const sp = useSearchParams();
  const sid = sp.get('sid') || '';
  const [state, setState] = useState({ loading: true, err: '', order: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sid) { setState({ loading:false, err:'Falta el parámetro sid', order:null }); return; }
      try {
        const res = await fetch(`${API}/api/orders/by-session/${encodeURIComponent(sid)}`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.order) {
          setState({ loading:false, err: data?.error || `No encontramos la compra (sid=${sid})`, order:null });
          return;
        }
        setState({ loading:false, err:'', order: data.order });
      } catch {
        if (!cancelled) setState({ loading:false, err: 'Error de red consultando la compra', order:null });
      }
    })();
    return () => { cancelled = true; };
  }, [sid]);

  // ===== UI =====
  if (state.loading) {
    return (
      <div style={sx.page}>
        <div style={sx.card}>
          <div style={sx.spinner} aria-hidden />
          <h1 style={sx.h1}>Procesando pago…</h1>
          <p style={sx.p}>Confirmando tu compra y generando tus entradas.</p>
        </div>
      </div>
    );
  }

  // Si no pudimos cargar el resumen, sigue siendo una “gracias”
  if (state.err) {
    return (
      <div style={sx.page}>
        <div style={sx.card}>
          <CheckIcon ok />
          <h1 style={sx.h1}>¡Pago recibido!</h1>
          <p style={sx.p}>No pudimos cargar el detalle: <em>{state.err}</em></p>
          <p style={sx.p}>Revisa tu correo: te enviamos las entradas.</p>
          <Link href="/events" style={sx.btn}>Volver a la app</Link>
        </div>
      </div>
    );
  }

  const o = state.order;
  const totalCents = (o.items || []).reduce((acc, it) => acc + (it.unitAmount || 0) * (it.qty || 1), 0);
  const total = (totalCents / 100).toFixed(2);

  return (
    <div style={sx.page}>
      <div style={sx.card}>
        <CheckIcon ok />
        <h1 style={sx.h1}>¡Pago completado!</h1>
        <p style={sx.p}>
          Te hemos enviado tus entradas a <strong>{o.email || 'tu correo'}</strong>.
        </p>

        {/* resumen muy corto, sin menús ni chrome */}
        <div style={sx.summary}>
          <div style={sx.row}>
            <span>Importe</span>
            <strong>€{total}</strong>
          </div>
          <div style={sx.rowMuted}>
            <span>ID pedido</span>
            <code style={sx.code}>{o._id}</code>
          </div>
        </div>

        <div style={sx.actions}>
          <Link href={`/events/${encodeURIComponent(o.eventId)}`} style={sx.btn}>Volver al evento</Link>
        </div>

        <p style={sx.helper}>¿No te llegó el email? Revisa Spam o contáctanos con el ID de pedido.</p>
      </div>
    </div>
  );
}

/* ======= estilos inline minimal ======= */
const sx = {
  page: {
    minHeight: '100svh',
    background: '#0b0f19',
    color: '#e5e7eb',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    background: '#0e1422',
    border: '1px solid #1f2937',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,.35)',
  },
  h1: { margin: '12px 0 6px', fontSize: 24, fontWeight: 900 },
  p: { margin: '6px 0 0', opacity: .85 },
  summary: {
    margin: '18px 0 12px',
    padding: '12px',
    background: '#0b1220',
    border: '1px dashed #1f2937',
    borderRadius: 12,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0', fontSize: 16,
  },
  rowMuted: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 6, opacity: .8, fontSize: 13,
  },
  code: {
    background: '#09101c', border: '1px solid #1f2937', borderRadius: 6,
    padding: '2px 6px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  actions: { marginTop: 14, display: 'flex', justifyContent: 'center' },
  btn: {
    display: 'inline-block',
    background: '#00e5ff', color: '#0b0f19', textDecoration: 'none',
    padding: '10px 16px', borderRadius: 12, fontWeight: 900,
  },
  helper: { marginTop: 12, opacity: .6, fontSize: 12 },
  spinner: {
    width: 28, height: 28, margin: '0 auto 8px',
    border: '3px solid #1f2937', borderTopColor: '#00e5ff', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// pequeño check sin dependencias
function CheckIcon({ ok }: { ok?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        width: 72, height: 72, margin: '0 auto',
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#00e5ff,#66a6ff)',
        display: 'grid', placeItems: 'center',
        boxShadow: '0 10px 30px rgba(0,229,255,.25)',
      }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17l-5-5" stroke="#0b0f19" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}




/*'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function SuccessClient() {
  const sp = useSearchParams();
  const sid = sp.get('sid') || '';
  const [state, setState] = useState({ loading: true, err: '', order: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sid) { setState({ loading:false, err:'Falta el parámetro sid', order:null }); return; }
      try {
        const res = await fetch(`${API}/api/orders/by-session/${encodeURIComponent(sid)}`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.order) {
          setState({ loading:false, err: data?.error || `No encontramos la compra (sid=${sid})`, order:null });
          return;
        }
        setState({ loading:false, err:'', order: data.order });
      } catch {
        if (!cancelled) setState({ loading:false, err: 'Error de red consultando la compra', order:null });
      }
    })();
    return () => { cancelled = true; };
  }, [sid]);

  if (state.loading) {
    return <main style={styles.main}><h1>Procesando pago…</h1><p>Confirmando tu compra y generando entradas.</p></main>;
  }

  if (state.err) {
    return (
      <main style={styles.main}>
        <h1>¡Pago recibido!</h1>
        <p style={{opacity:.8}}>No pudimos cargar el resumen: {state.err}</p>
        <p>Si pagaste con éxito, revisa tu correo: te hemos enviado las entradas.</p>
        <Link href="/events" style={styles.cta}>Volver a eventos</Link>
      </main>
    );
  }

  const o = state.order;
  const totalCents = (o.items || []).reduce((acc, it) => acc + (it.unitAmount || 0) * (it.qty || 1), 0);
  const total = (totalCents / 100).toFixed(2);

  return (
    <main style={styles.main}>
      <h1>¡Compra confirmada! 🎉</h1>
      <p style={{opacity:.85}}>
        Te enviamos las entradas a <strong>{o.email || 'tu correo'}</strong>.
      </p>

      <section style={styles.card}>
        <h3>Resumen</h3>
        <ul style={{listStyle:'none', padding:0, margin:'8px 0'}}>
          {(o.items || []).map((it, i) => (
            <li key={i} style={styles.lineItem}>
              <span>{it.name}</span>
              <span>×{it.qty} — €{((it.unitAmount || 0)/100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div style={styles.totalRow}>
          <span>Total</span>
          <strong>€{total}</strong>
        </div>
        <div style={{marginTop:8, opacity:.75, fontSize:13}}>
          Pedido: {o._id} · Sesión: {o.stripeSessionId}
        </div>
      </section>

      <div style={{display:'flex', gap:12}}>
        <Link href={`/events/${encodeURIComponent(o.eventId)}`} style={styles.cta}>Volver al evento</Link>
        <Link href="/events" style={{...styles.cta, background:'#1f2937'}}>Explorar más eventos</Link>
      </div>

      <p style={{marginTop:16, opacity:.7, fontSize:13}}>
        ¿No te llegó el email? Revisa Spam o contacta soporte con el ID de pedido.
      </p>
    </main>
  );
}

const styles = {
  main: { minHeight:'100vh', background:'#0b0f19', color:'#e5e7eb', padding:'40px 24px', display:'flex', flexDirection:'column', gap:16 },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:16, maxWidth:720 },
  lineItem: { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px dashed #1f2937' },
  totalRow: { display:'flex', justifyContent:'space-between', marginTop:10, fontSize:18 },
  cta: { background:'#00e5ff', color:'#0b0f19', padding:'10px 14px', borderRadius:10, textDecoration:'none', fontWeight:800 }
};
*/
