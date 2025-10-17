'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// (Opcional) si prefieres evitar prerender:
// export const dynamic = 'force-dynamic';

function VerifyInner() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const email = sp.get('email') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/registration/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((res) => {
        if (res?.ok) {
          setStatus('ok');
          setMessage('Verificado correctamente. Ya puedes iniciar sesión.');
        } else {
          setStatus('error');
          setMessage(res?.message || 'No se pudo verificar el token.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error de red verificando el token.');
      });
  }, [token, email]);

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Verificación de registro</h1>
      {!token && <p>Falta el token en la URL.</p>}
      {token && (
        <>
          {status === 'loading' && <p>Verificando…</p>}
          {status === 'ok' && <p style={{ color: '#22c55e' }}>{message}</p>}
          {status === 'error' && <p style={{ color: '#ef4444' }}>{message}</p>}
          <p style={{ marginTop: 16 }}>
            <a href="/login">Ir a iniciar sesión</a>
          </p>
        </>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 16 }}><p>Cargando…</p></main>}>
      <VerifyInner />
    </Suspense>
  );
}
