'use client';

import { useEffect, useState } from 'react';
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
    return (
      <main style={styles.main}>
        <div style={styles.centerBox}>
          <h1 style={styles.title}>Procesando pago…</h1>
          <p style={styles.subtitle}>Confirmando tu compra.</p>
        </div>
      </main>
    );
  }

  if (state.err) {
    return (
      <main style={styles.main}>
        <div style={styles.centerBox}>
          <div style={styles.iconCircleError}>!</div>
          <h1 style={styles.title}>Pago recibido, pero hubo un problema</h1>
          <p style={styles.subtitle}>
            {state.err}
            <br />
            Si pagaste con éxito, revisa tu correo: te hemos enviado las entradas.
          </p>
        </div>
      </main>
    );
  }

  if (state.order) {
    return (
      <main style={styles.main}>
        <div style={styles.centerBox}>
          <div style={styles.iconCircleOk}>✓</div>
          <h1 style={styles.title}>Pago efectuado</h1>
          <p style={styles.subtitle}>Te hemos enviado tus entradas por email.</p>
        </div>
      </main>
    );
  }

  return null;
}

const styles = {
  main: { minHeight:'100vh', background:'#020617', color:'#e5e7eb', padding:'32px 16px', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center' },
  centerBox: { maxWidth:420, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:16 },
  iconCircleOk: { width:80, height:80, borderRadius:'50%', background:'#00e5ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:42, fontWeight:900, color:'#0b0f19', boxShadow:'0 0 40px rgba(0,229,255,0.5)' },
  iconCircleError: { width:80, height:80, borderRadius:'50%', background:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:42, fontWeight:900, color:'#0b0f19', boxShadow:'0 0 40px rgba(239,68,68,0.5)' },
  title: { fontSize:24, fontWeight:800 },
  subtitle: { fontSize:15, opacity:.8 },
};
