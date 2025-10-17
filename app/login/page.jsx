'use client';

import { useState } from 'react';

export default function LoginPage() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // --------- Login state ----------
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lloading, setLLoading] = useState(false);
  const [lmsg, setLMsg] = useState<string | null>(null);
  const [lerr, setLErr] = useState<string | null>(null);

  // --------- Register state -------
  const [remail, setREmail] = useState('');
  const [rname, setRName] = useState('');
  const [rloading, setRLoading] = useState(false);
  const [rmsg, setRMsg] = useState<string | null>(null);
  const [rerr, setRErr] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLMsg(null); setLErr(null); setLLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // si tu backend setea cookie de sesión
        body: JSON.stringify({ email: lemail.trim(), password: lpass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Login inválido');
      // Éxito: redirige al dashboard
      window.location.href = '/dashboard';
    } catch (err:any) {
      setLErr(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRMsg(null); setRErr(null); setRLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/registration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: remail.trim(),
          name: rname.trim(),
          // puedes enviar más campos si tu endpoint los acepta (p.ej. clubName)
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo iniciar el registro');
      }
      setRMsg('¡Hemos enviado un correo de verificación! Revisa tu bandeja.');
    } catch (err:any) {
      setRErr(err.message || 'No se pudo iniciar el registro');
    } finally {
      setRLoading(false);
    }
  }

  const tabBtn = (active: boolean) => ({
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
  } as const;

  const primaryBtn = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)',
    color: '#001018',
    fontWeight: 800,
    cursor: 'pointer'
  } as const;

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
}


/*'use client';
import { useState } from 'react';
import { api, setSession } from '@/lib/apiClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Conectando...');
    try {
      // Ajusta el path si tu login es otro
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(()=> ({}));

      if (!res.ok) {
        setMsg(data?.message || `Error (HTTP ${res.status})`);
        return;
      }

      // Esperado habitual: { token, user }
      const token = data?.token;
      const user  = data?.user || data;

      if (!token) {
        setMsg('Login OK pero no llegó token. Revisa el payload del login en la consola.');
        console.log('LOGIN RESPONSE:', data);
        return;
      }

      setSession(token, user);
      window.location.href = '/dashboard';
    } catch (err) {
      setMsg(String(err));
    }
  }

  return (
    <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'#0b0f19', color:'#e5e7eb' }}>
      <form onSubmit={onSubmit} style={{ width:320, display:'grid', gap:12 }}>
        <h1>Acceso discoteca</h1>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required
               style={{ padding:10, borderRadius:8 }} />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" required
               style={{ padding:10, borderRadius:8 }} />
        <button type="submit" style={{ padding:10, borderRadius:8, background:'#00e5ff', color:'#001018' }}>Entrar</button>
        <div style={{ minHeight:20 }}>{msg}</div>
      </form>
    </main>
  );
}*/
