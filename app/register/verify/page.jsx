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

  return (
    <main className="nv-page">
      <div className="nv-shell" style={{ placeItems: 'center' }}>
        <div className="nv-card" style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
          {loading && (
            <>
              <h1 className="nv-h2">Verificando…</h1>
              <p className="nv-lead" style={{ marginTop: 8 }}>
                Un momento, estamos validando tu enlace.
              </p>
            </>
          )}

          {!loading && ok && (
            <>
              <h1 className="nv-h2">¡Correo verificado!</h1>
              <p className="nv-notice nv-notice-success" style={{ marginTop: 14 }}>
                Tu solicitud ha sido verificada. Cuando aprobemos tu cuenta, podrás
                iniciar sesión en el panel.
              </p>
              <a href="/login" className="nv-btn nv-btn-primary" style={{ marginTop: 16 }}>
                Ir a iniciar sesión
              </a>
            </>
          )}

          {!loading && !ok && (
            <>
              <h1 className="nv-h2">No se pudo verificar</h1>
              <p className="nv-notice nv-notice-error" style={{ marginTop: 14 }}>{err}</p>
              <a href="/login" className="nv-btn nv-btn-secondary" style={{ marginTop: 16 }}>
                Volver al inicio de sesión
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="nv-page">
          <div className="nv-shell" style={{ placeItems: 'center' }}>
            <p className="nv-lead">Cargando…</p>
          </div>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
