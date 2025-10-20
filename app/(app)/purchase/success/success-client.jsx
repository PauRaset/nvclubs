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

