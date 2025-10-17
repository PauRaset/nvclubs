'use client';

import { useState } from 'react';
import { registrationApply } from '@/lib/apiClient';

export default function LoginPage() {
  // compat: si no hay NEXT_PUBLIC_BACKEND_URL, caemos a NEXT_PUBLIC_API_BASE
  const BACKEND =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'https://api.nightvibe.life';

  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // --------- Login state ----------
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lloading, setLLoading] = useState(false);
  const [lmsg, setLMsg] = useState(null);
  const [lerr, setLErr] = useState(null);

  // --------- Register state -------
  const [remail, setREmail] = useState('');
  const [rname, setRName] = useState(''); // lo usaremos como clubName y contactName
  const [rloading, setRLoading] = useState(false);
  const [rmsg, setRMsg] = useState(null);
  const [rerr, setRErr] = useState(null);

  // --------- Handlers ----------
  async function handleLogin(e) {
    e.preventDefault();
    setLMsg(null); setLErr(null); setLLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: lemail.trim(), password: lpass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Login inválido');
      window.location.href = '/dashboard';
    } catch (err) {
      setLErr(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRMsg(null); setRErr(null); setRLoading(true);
    try {
      // Enviamos la solicitud de alta del club (KYC paso 1: verificación email)
      const { ok, data } = await registrationApply({
        email: remail.trim(),
        clubName: rname.trim(),   // nombre del club (en este UI usamos "Nombre")
        contactName: rname.trim() // lo reaprovechamos como persona de contacto
        // phone/website/instagram los podemos pedir luego en un paso 2
      });

      if (!ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error : 'No se pudo iniciar el registro'
        );
      }

      setRMsg('¡Hemos enviado un correo de verificación! Revisa tu bandeja.');
    } catch (err) {
      setRErr(err.message || 'No se pudo iniciar el registro');
    } finally {
      setRLoading(false);
    }
  }

  // --------- UI styles ----------
  const tabBtn = (active) => ({
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: active ? 'linear-gradient(90deg,#0ea5e9,#6366f1)' : '#0b0f19',
    color: active ? '#001018' : '#e5e7eb',
    fontWeight: 700,
    cursor: 'pointer'
  });

  const input = {
    width: '100%',
    background: '#0b1220',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: '12px 14px',
    outline: 'none'
  };

  const primaryBtn = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)',
    color: '#001018',
    fontWeight: 800,
    cursor: 'pointer'
  };

  const secondary = { color: '#93a4b8', fontSize: 13 };

  // --------- Render ----------
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(11,15,25,.75)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #1f2937',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        padding: 20
      }}>
        <header style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button type="button" onClick={() => setTab('login')} style={tabBtn(tab === 'login')}>Iniciar sesión</button>
          <button type="button" onClick={() => setTab('register')} style={tabBtn(tab === 'register')}>Crear cuenta</button>
        </header>

        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={secondary}>Email</label>
              <input style={input} type="email" value={lemail} onChange={e => setLEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            <div>
              <label style={secondary}>Contraseña</label>
              <input style={input} type="password" value={lpass} onChange={e => setLPass(e.target.value)} placeholder="••••••••" required />
            </div>
            {lerr && <p style={{ color: '#f43f5e' }}>{lerr}</p>}
            {lmsg && <p style={{ color: '#22c55e' }}>{lmsg}</p>}
            <button disabled={lloading} style={primaryBtn}>
              {lloading ? 'Entrando…' : 'Entrar'}
            </button>
            <p style={secondary}>
              ¿No tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setTab('register'); }} style={{ color: '#0ea5e9', fontWeight: 700 }}>
                Crea una aquí
              </a>
            </p>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={secondary}>Nombre del club</label>
              <input style={input} type="text" value={rname} onChange={e => setRName(e.target.value)} placeholder="NightVibe Club" required />
            </div>
            <div>
              <label style={secondary}>Email</label>
              <input style={input} type="email" value={remail} onChange={e => setREmail(e.target.value)} placeholder="contacto@club.com" required />
            </div>
            {rerr && <p style={{ color: '#f43f5e' }}>{rerr}</p>}
            {rmsg && <p style={{ color: '#22c55e' }}>{rmsg}</p>}
            <button disabled={rloading} style={primaryBtn}>
              {rloading ? 'Enviando…' : 'Crear cuenta'}
            </button>
            <p style={secondary}>
              Al crear tu cuenta, te enviaremos un correo para verificarla.
              Tras verificar, podrás iniciar sesión.
            </p>
            <p style={secondary}>
              ¿Ya tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setTab('login'); }} style={{ color: '#0ea5e9', fontWeight: 700 }}>
                Inicia sesión
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

/*'use client';

import { useState } from 'react';

export default function LoginPage() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // --------- Login state ----------
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lloading, setLLoading] = useState(false);
  const [lmsg, setLMsg] = useState(null);
  const [lerr, setLErr] = useState(null);

  // --------- Register state -------
  const [remail, setREmail] = useState('');
  const [rname, setRName] = useState('');
  const [rloading, setRLoading] = useState(false);
  const [rmsg, setRMsg] = useState(null);
  const [rerr, setRErr] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLMsg(null); setLErr(null); setLLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: lemail.trim(), password: lpass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data && data.message ? data.message : 'Login inválido');
      window.location.href = '/dashboard';
    } catch (err) {
      setLErr(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRMsg(null); setRErr(null); setRLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/registration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: remail.trim(),
          name: rname.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error((data && data.message) || 'No se pudo iniciar el registro');
      }
      setRMsg('¡Hemos enviado un correo de verificación! Revisa tu bandeja.');
    } catch (err) {
      setRErr(err.message || 'No se pudo iniciar el registro');
    } finally {
      setRLoading(false);
    }
  }

  const tabBtn = (active) => ({
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: active ? 'linear-gradient(90deg,#0ea5e9,#6366f1)' : '#0b0f19',
    color: active ? '#001018' : '#e5e7eb',
    fontWeight: 700,
    cursor: 'pointer'
  });

  const input = {
    width: '100%',
    background: '#0b1220',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: '12px 14px',
    outline: 'none'
  };

  const primaryBtn = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)',
    color: '#001018',
    fontWeight: 800,
    cursor: 'pointer'
  };

  const secondary = { color: '#93a4b8', fontSize: 13 };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(11,15,25,.75)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #1f2937',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        padding: 20
      }}>
        <header style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button type="button" onClick={() => setTab('login')} style={tabBtn(tab === 'login')}>Iniciar sesión</button>
          <button type="button" onClick={() => setTab('register')} style={tabBtn(tab === 'register')}>Crear cuenta</button>
        </header>

        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={secondary}>Email</label>
              <input style={input} type="email" value={lemail} onChange={e => setLEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            <div>
              <label style={secondary}>Contraseña</label>
              <input style={input} type="password" value={lpass} onChange={e => setLPass(e.target.value)} placeholder="••••••••" required />
            </div>
            {lerr && <p style={{ color: '#f43f5e' }}>{lerr}</p>}
            {lmsg && <p style={{ color: '#22c55e' }}>{lmsg}</p>}
            <button disabled={lloading} style={primaryBtn}>
              {lloading ? 'Entrando…' : 'Entrar'}
            </button>
            <p style={secondary}>
              ¿No tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setTab('register'); }} style={{ color: '#0ea5e9', fontWeight: 700 }}>
                Crea una aquí
              </a>
            </p>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={secondary}>Nombre</label>
              <input style={input} type="text" value={rname} onChange={e => setRName(e.target.value)} placeholder="Tu nombre" required />
            </div>
            <div>
              <label style={secondary}>Email</label>
              <input style={input} type="email" value={remail} onChange={e => setREmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            {rerr && <p style={{ color: '#f43f5e' }}>{rerr}</p>}
            {rmsg && <p style={{ color: '#22c55e' }}>{rmsg}</p>}
            <button disabled={rloading} style={primaryBtn}>
              {rloading ? 'Enviando…' : 'Crear cuenta'}
            </button>
            <p style={secondary}>
              Al crear tu cuenta, te enviaremos un correo para verificarla.
              Tras verificar, podrás iniciar sesión.
            </p>
            <p style={secondary}>
              ¿Ya tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setTab('login'); }} style={{ color: '#0ea5e9', fontWeight: 700 }}>
                Inicia sesión
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}*/
