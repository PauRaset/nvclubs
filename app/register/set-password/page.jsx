'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SetPasswordInner() {
  const API = process.env.NEXT_PUBLIC_API_BASE
    || process.env.NEXT_PUBLIC_BACKEND_URL
    || 'https://api.nightvibe.life';

  const sp = useSearchParams();
  const token = sp.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!token) return setErr('Token inválido');
    if (password.length < 6) return setErr('Mínimo 6 caracteres');
    if (password !== confirm) return setErr('No coinciden');

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/registration/set-password`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Error');
      setMsg('¡Contraseña creada! Ya puedes iniciar sesión.');
    } catch (e) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const card = { maxWidth:520, margin:'0 auto', background:'rgba(11,15,25,.75)', border:'1px solid #1f2937', borderRadius:14, padding:20, color:'#e5e7eb' };
  const input = { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #1f2937', background:'#0b1220', color:'#e5e7eb' };
  const btn = { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #1f2937', background:'linear-gradient(90deg,#0ea5e9,#22d3ee)', color:'#001018', fontWeight:800 };

  return (
    <main style={{ minHeight:'100vh', background:'#0b0f19', padding:16 }}>
      <div style={card}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Crea tu contraseña</h1>
        <form onSubmit={submit} style={{ display:'grid', gap:12 }}>
          <div><input type="password" style={input} placeholder="Nueva contraseña" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <div><input type="password" style={input} placeholder="Confirmar contraseña" value={confirm} onChange={e=>setConfirm(e.target.value)} /></div>
          {err && <p style={{ color:'#f43f5e' }}>{err}</p>}
          {msg && <p style={{ color:'#22c55e' }}>{msg}</p>}
          <button disabled={loading || !token} style={btn}>{loading ? 'Guardando…' : 'Guardar'}</button>
          <p style={{ color:'#93a4b8', fontSize:13 }}>¿Listo? <a href="/login" style={{ color:'#0ea5e9', fontWeight:700 }}>Inicia sesión</a></p>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={<div style={{ padding:16, color:'#e5e7eb' }}>Cargando…</div>}><SetPasswordInner/></Suspense>;
}