'use client';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SetPasswordInner() {
  const API =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.nightvibe.life';

  const sp = useSearchParams();
  const token = sp.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);

  // Si no hay token en la URL, avisamos
  useEffect(() => {
    if (!token) setErr('Token inválido o ausente. Revisa el enlace del correo.');
  }, [token]);

  async function resetViaAuth() {
    // Nuevo flujo recomendado
    return fetch(`${API}/api/auth/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
  }

  async function resetViaRegistrationLegacy() {
    // Back-compat con el endpoint anterior
    return fetch(`${API}/api/registration/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setErr('');

    if (!token) return setErr('Token inválido o ausente.');
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setErr('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      // Intento 1: endpoint nuevo
      let res = await resetViaAuth();

      // Si el backend aún no tiene /api/auth/reset o responde 404, probamos el legacy
      if (res.status === 404) {
        res = await resetViaRegistrationLegacy();
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        // Mensaje más útil si el backend lo envía
        const backendMsg = data?.message || data?.error;
        throw new Error(backendMsg || 'No se pudo establecer la contraseña.');
      }

      setMsg('¡Contraseña creada! Ya puedes iniciar sesión.');
      // Limpia el token de la URL para evitar reutilizarlo o compartirlo sin querer
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      } catch {}

    } catch (e) {
      setErr(e.message || 'Error desconocido al guardar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  // --- Estilos inline simples (coinciden con tu estética actual) ---
  const card  = {
    maxWidth: 520, margin: '0 auto',
    background: 'rgba(11,15,25,.75)',
    border: '1px solid #1f2937', borderRadius: 14,
    padding: 20, color: '#e5e7eb'
  };
  const input = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb'
  };
  const btn   = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #1f2937',
    background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)',
    color: '#001018', fontWeight: 800, cursor: 'pointer',
    opacity: loading || !token ? 0.8 : 1
  };
  const hint  = { color: '#93a4b8', fontSize: 13 };

  // Sugerencia: pequeña barra de “fuerza” (muy ligera)
  const strength = password.length >= 10 ? 'fuerte' : password.length >= 8 ? 'media' : password ? 'débil' : '';
  const strengthColor = strength === 'fuerte' ? '#22c55e' : strength === 'media' ? '#eab308' : '#f43f5e';

  return (
    <main style={{
      minHeight:'100vh',
      background:'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      padding:16, display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={card}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>
          Crea tu contraseña
        </h1>

        <form onSubmit={submit} style={{ display:'grid', gap:12 }}>
          <div>
            <input
              type="password"
              style={input}
              placeholder="Nueva contraseña"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength && (
              <p style={{ ...hint, marginTop:6 }}>
                Fuerza: <span style={{ color: strengthColor, fontWeight: 700 }}>{strength}</span>
              </p>
            )}
          </div>

          <div>
            <input
              type="password"
              style={input}
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {err && <p style={{ color:'#f43f5e' }}>{err}</p>}
          {msg && <p style={{ color:'#22c55e' }}>{msg}</p>}

          <button disabled={loading || !token} style={btn}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>

          <p style={hint}>
            ¿Listo?{' '}
            <a href="/login" style={{ color:'#0ea5e9', fontWeight:700 }}>
              Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding:16, color:'#e5e7eb' }}>Cargando…</div>}>
      <SetPasswordInner />
    </Suspense>
  );
}
