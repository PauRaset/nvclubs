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
      <div className="nv-views">
        <div className="nv-card" style={{ textAlign: 'center' }}>
          <h1 className="nv-h2">Procesando pago…</h1>
          <p className="nv-lead" style={{ marginTop: 8 }}>Confirmando tu compra.</p>
        </div>
      </div>
    );
  }

  if (state.err) {
    return (
      <div className="nv-views">
        <div className="nv-empty">
          <div className="nv-empty-icon is-error" aria-hidden="true">!</div>
          <h1 className="nv-empty-title">Pago recibido, pero hubo un problema</h1>
          <p className="nv-empty-text">
            {state.err}
            <br />
            Si pagaste con éxito, revisa tu correo: te hemos enviado las entradas.
          </p>
        </div>
      </div>
    );
  }

  if (state.order) {
    return (
      <div className="nv-views">
        <div className="nv-empty">
          <div className="nv-empty-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="nv-empty-title">Pago efectuado</h1>
          <p className="nv-empty-text">Te hemos enviado tus entradas por email.</p>
        </div>
      </div>
    );
  }

  return null;
}
