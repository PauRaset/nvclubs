'use client';
import { useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SetPasswordInner() {
  // Base de API (cualquiera de las dos variables que uses)
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.nightvibe.life';

  // ENDPOINT FIJO DEL FLUJO DE APROBACIÓN
  const ENDPOINT = useMemo(() => `${API_BASE}/api/registration/set-password`, [API_BASE]);

  const sp = useSearchParams();
  const token = sp.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // calculadora de "fuerza" muy simple para dar feedback visual
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score >= 4) return 'fuerte';
    if (score === 3) return 'media';
    return 'débil';
  }, [password]);

  const strengthBadge =
    strength === 'fuerte' ? 'nv-badge-success'
    : strength === 'media' ? 'nv-badge-warn'
    : 'nv-badge-danger';

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setErr('');

    if (!token) return setErr('Token inválido');
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setErr('Las contraseñas no coinciden');

    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // nombre opcional: si lo quieres enviar, añádelo al state y al body
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        // mensajes más claros
        if (data?.error === 'invalid_token') throw new Error('Token inválido');
        if (data?.error === 'token_expired') throw new Error('Token expirado');
        throw new Error(data?.error || 'No se pudo crear la contraseña');
      }

      setMsg('¡Contraseña creada! Ya puedes iniciar sesión.');
    } catch (e) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="nv-page">
      <div className="nv-shell" style={{ placeItems: 'center' }}>
        <div className="nv-card" style={{ width: '100%', maxWidth: 520 }}>
          <h1 className="nv-h2" style={{ marginBottom: 16 }}>Crea tu contraseña</h1>

          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div className="nv-field">
              <label className="nv-label">Nueva contraseña</label>
              <input
                type="password"
                className="nv-input"
                placeholder="Nueva contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="nv-row" style={{ gap: 8 }}>
              <span className="nv-small nv-muted">Fuerza:</span>
              <span className={`nv-badge ${strengthBadge}`}>{strength}</span>
            </div>

            <div className="nv-field">
              <label className="nv-label">Confirmar contraseña</label>
              <input
                type="password"
                className="nv-input"
                placeholder="Confirmar contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>

            {err && <p role="alert" aria-live="assertive" className="nv-notice nv-notice-error">{err}</p>}
            {msg && <p role="status" aria-live="polite" className="nv-notice nv-notice-success">{msg}</p>}

            <button disabled={loading || !token} className="nv-btn nv-btn-primary nv-btn-block">
              {loading ? 'Guardando…' : 'Guardar'}
            </button>

            <p className="nv-small nv-muted">
              ¿Listo?{' '}
              <a href="/login" className="nv-link-accent">Inicia sesión</a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
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
      <SetPasswordInner />
    </Suspense>
  );
}
