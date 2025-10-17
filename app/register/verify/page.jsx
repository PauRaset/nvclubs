// app/register/verify/page.jsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyInner() {
  const BACKEND =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'https://api.nightvibe.life';

  const sp = useSearchParams();
  const token = sp.get('token');

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) {
      setErr('Token no válido.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/registration/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              'No se pudo verificar el correo (token inválido o expirado).'
          );
        }
        setOk(true);
      } catch (e) {
        setErr(e?.message || 'No se pudo verificar el correo.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, BACKEND]);

  const card = {
    width: '100%',
    maxWidth: 520,
    margin: '0 auto',
    background: 'rgba(11,15,25,.75)',
    border: '1px solid #1f2937',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
  };

  const title = { fontSize: 20, fontWeight: 800, color: '#e5e7eb', marginBottom: 8 };
  const p = { color: '#93a4b8', margin: '8px 0' };
  const btn = {
    display: 'inline-block',
    marginTop: 14,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)',
    color: '#001018',
    fontWeight: 800,
    textDecoration: 'none',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background:
          'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      }}
    >
      <div style={card}>
        {loading && (
          <>
            <h1 style={title}>Verificando…</h1>
            <p style={p}>Un momento, estamos validando tu enlace.</p>
          </>
        )}

        {!loading && ok && (
          <>
            <h1 style={title}>¡Correo verificado! 🎉</h1>
            <p style={p}>
              Tu solicitud ha sido verificada. Cuando aprobemos tu cuenta, podrás iniciar
              sesión en el panel.
            </p>
            <a href="/login" style={btn}>Ir a iniciar sesión</a>
          </>
        )}

        {!loading && !ok && (
          <>
            <h1 style={{ ...title, color: '#fecaca' }}>No se pudo verificar</h1>
            <p style={{ ...p, color: '#fca5a5' }}>{err}</p>
            <a href="/login" style={btn}>Volver al inicio de sesión</a>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            color: '#e5e7eb',
            background:
              'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
          }}
        >
          Cargando…
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
