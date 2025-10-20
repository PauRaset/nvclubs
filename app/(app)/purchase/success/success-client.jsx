'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  '';

export default function SuccessClient() {
  const sp = useSearchParams();
  const sid = sp.get('sid') || '';
  const [state, setState] = useState({ loading: true, err: '', order: null });

  // Evita refetch si la URL cambia por un segundo render
  const requestUrl = useMemo(() => {
    if (!sid) return null;
    return `${API}/api/orders/by-session/${encodeURIComponent(sid)}`;
  }, [sid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sid) {
        setState({ loading: false, err: 'Falta el parámetro sid', order: null });
        return;
      }
      try {
        const res = await fetch(requestUrl, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.order) {
          setState({
            loading: false,
            err: data?.error || `No encontramos la compra (sid=${sid})`,
            order: null,
          });
          return;
        }
        setState({ loading: false, err: '', order: data.order });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            err: 'Error de red consultando la compra',
            order: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sid, requestUrl]);

  // UI: Loading
  if (state.loading) {
    return (
      <main style={styles.shell}>
        <Decor />
        <Card>
          <Spinner />
          <h1 style={styles.title}>Procesando pago…</h1>
          <p style={styles.muted}>Confirmando tu compra y generando entradas.</p>
        </Card>
        <HideChrome />
      </main>
    );
  }

  // UI: Error (pero mostrando que el pago pudo recibirse)
  if (state.err) {
    return (
      <main style={styles.shell}>
        <Decor />
        <Card>
          <BigCheck ok />
          <h1 style={styles.title}>¡Pago recibido!</h1>
          <p style={styles.muted}>
            No pudimos cargar el resumen: {state.err}.
          </p>
          <p style={styles.muted}>
            Si el pago fue exitoso, revisa tu correo — te hemos enviado las
            entradas.
          </p>
          <div style={styles.row}>
            <Link href="/events" style={styles.primaryCta}>
              Volver a eventos
            </Link>
          </div>
        </Card>
        <HideChrome />
      </main>
    );
  }

  // UI: Éxito + resumen
  const o = state.order;
  const totalCents = (o.items || []).reduce(
    (acc, it) => acc + (it.unitAmount || 0) * (it.qty || 1),
    0
  );
  const total = (totalCents / 100).toFixed(2);
  const eventHref = `/events/${encodeURIComponent(String(o.eventId || ''))}`;

  return (
    <main style={styles.shell}>
      <Decor />
      <Card>
        <BigCheck ok />
        <h1 style={styles.title}>¡Compra confirmada! 🎉</h1>
        <p style={styles.muted}>
          Te enviamos las entradas a{' '}
          <strong>{o.email || 'tu correo'}</strong>.
        </p>

        <section style={styles.summary}>
          <div style={styles.summaryHeader}>
            <span>Resumen</span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>
              Pedido: {o._id}
            </span>
          </div>

          <ul style={styles.itemsList}>
            {(o.items || []).map((it, i) => (
              <li key={i} style={styles.itemRow}>
                <span style={styles.itemName}>{it.name}</span>
                <span style={styles.itemPrice}>
                  ×{it.qty} — €{((it.unitAmount || 0) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div style={styles.totalRow}>
            <span>Total</span>
            <strong>€{total}</strong>
          </div>

          <div style={styles.metaRow}>
            Sesión: {o.stripeSessionId}
          </div>
        </section>

        <div style={styles.row}>
          <Link href={eventHref} style={styles.primaryCta}>
            Volver al evento
          </Link>
          <Link href="/events" style={styles.secondaryCta}>
            Explorar más eventos
          </Link>
        </div>

        <p style={styles.helpText}>
          ¿No te llegó el email? Revisa Spam o contacta soporte con el ID de
          pedido.
        </p>
      </Card>
      <HideChrome />
    </main>
  );
}

/* ======================= UI pieces ======================= */

function Card({ children }) {
  return <section style={styles.card}>{children}</section>;
}

function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
    </div>
  );
}

function BigCheck({ ok = true }) {
  return (
    <div style={styles.checkWrap} aria-hidden>
      <div style={{ ...styles.checkHalo, opacity: ok ? 1 : 0.6 }} />
      <svg
        viewBox="0 0 24 24"
        width="56"
        height="56"
        style={styles.checkIcon}
      >
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 12.5l3.2 3.2L17.5 8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Decor() {
  return (
    <>
      <div style={styles.bg} />
      <div style={{ ...styles.softSpot, ...styles.softSpotA }} />
      <div style={{ ...styles.softSpot, ...styles.softSpotB }} />
    </>
  );
}

/**
 * Oculta header/nav/aside/footer que puedan venir del layout global,
 * solo mientras esta página esté montada.
 */
function HideChrome() {
  useEffect(() => {
    const prev = document.body.getAttribute('data-hide-chrome');
    document.body.setAttribute('data-hide-chrome', '1');
    return () => {
      if (prev == null) document.body.removeAttribute('data-hide-chrome');
      else document.body.setAttribute('data-hide-chrome', prev);
    };
  }, []);

  return (
    <style jsx global>{`
      body[data-hide-chrome='1'] header,
      body[data-hide-chrome='1'] nav,
      body[data-hide-chrome='1'] aside,
      body[data-hide-chrome='1'] footer {
        display: none !important;
      }
    `}</style>
  );
}

/* ======================= Styles ======================= */

const styles = {
  shell: {
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#e5e7eb',
    padding: '32px 16px',
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  bg: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(1200px 600px at 10% 0%, rgba(0,229,255,.15), transparent 60%), radial-gradient(1200px 600px at 100% 100%, rgba(99,125,255,.12), transparent 60%)',
    pointerEvents: 'none',
  },

  softSpot: {
    position: 'absolute',
    borderRadius: '9999px',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  softSpotA: {
    width: 360,
    height: 360,
    left: -80,
    top: -60,
    background: 'rgba(0,229,255,.12)',
  },
  softSpotB: {
    width: 460,
    height: 460,
    right: -120,
    bottom: -80,
    background: 'rgba(99,125,255,.12)',
  },

  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 640,
    background:
      'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 25px rgba(0,0,0,.35)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },

  checkWrap: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    margin: '4px auto 8px',
    position: 'relative',
    color: '#00e5ff',
  },
  checkHalo: {
    position: 'absolute',
    inset: -10,
    borderRadius: '50%',
    background:
      'radial-gradient(closest-side, rgba(0,229,255,.35), rgba(0,229,255,0))',
    animation: 'pulse 2.4s ease-in-out infinite',
  },
  checkIcon: {
    display: 'block',
    margin: '0 auto',
    color: '#00e5ff',
    filter: 'drop-shadow(0 2px 8px rgba(0,229,255,.35))',
  },

  title: {
    margin: '8px 0 4px',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  muted: {
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 8,
  },

  summary: {
    marginTop: 14,
    background: '#101522',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: 14,
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    marginBottom: 6,
  },
  itemsList: { listStyle: 'none', padding: 0, margin: '8px 0' },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px dashed #1f2937',
  },
  itemName: { maxWidth: '70%', paddingRight: 8 },
  itemPrice: { opacity: 0.9 },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 10,
    fontSize: 18,
  },
  metaRow: { marginTop: 8, opacity: 0.7, fontSize: 12 },

  row: {
    display: 'flex',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryCta: {
    background:
      'linear-gradient(90deg, #00e5ff, #7aa5ff 80%, #00e5ff)',
    color: '#0b0f19',
    padding: '10px 14px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 900,
    boxShadow: '0 6px 18px rgba(0,229,255,.24)',
    transition: 'transform .12s ease',
  },
  secondaryCta: {
    background: '#1f2937',
    color: '#e5e7eb',
    padding: '10px 14px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 800,
    border: '1px solid rgba(255,255,255,.08)',
  },

  helpText: { marginTop: 12, opacity: 0.7, fontSize: 13, textAlign: 'center' },

  spinnerWrap: { display: 'grid', placeItems: 'center', marginTop: 6, marginBottom: 10 },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,.2)',
    borderTopColor: '#00e5ff',
    animation: 'spin 0.9s linear infinite',
  },
};

/* Animaciones clave (incrustadas globalmente) */
if (typeof window !== 'undefined') {
  const id = '__success_keyframes__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse {
        0%, 100% { transform: scale(0.96); opacity: .85; }
        50%      { transform: scale(1.04); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
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
