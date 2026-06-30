'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { setSession, getToken } from '@/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const BACKEND =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
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
  const [rname, setRName] = useState('');
  const [rloading, setRLoading] = useState(false);
  const [rmsg, setRMsg] = useState(null);
  const [rerr, setRErr] = useState(null);

  // Si ya hay token, fuera de /login
  useEffect(() => {
    const t = getToken?.();
    if (t) router.replace('/dashboard');
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setLMsg(null); setLErr(null); setLLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: lemail.trim().toLowerCase(), password: lpass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token || !data?.user) {
        throw new Error(data?.message || 'Credenciales inválidas');
      }

      // guardar sesión
      setSession(data.token, data.user);

      // redirigir al dashboard
      router.replace('/dashboard');
    } catch (err) {
      setLErr(err?.message || 'No se pudo iniciar sesión');
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
          email: remail.trim().toLowerCase(),
          name: rname.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo iniciar el registro');
      }
      setRMsg('¡Hemos enviado un correo de verificación! Revisa tu bandeja.');
    } catch (err) {
      setRErr(err?.message || 'No se pudo iniciar el registro');
    } finally {
      setRLoading(false);
    }
  }

  return (
    <main className="nv-page nv-auth">
      <div className="nv-auth-grid">
        {/* Panel de marca (oculto en móvil) */}
        <section className="nv-auth-brand">
          <div className="nv-badge">Panel de clubs</div>
          <h1 className="nv-h1" style={{ marginTop: 16 }}>
            Gestiona tu club en <span className="nv-accent-text">NightVibe</span>
          </h1>
          <p className="nv-lead" style={{ marginTop: 14, maxWidth: 440 }}>
            Eventos, entradas, cobros con Stripe, check-in con QR, promociones y
            estadísticas. Todo el control de tu club, en un solo panel.
          </p>

          <ul className="nv-auth-features">
            <li>Crea y publica eventos en minutos</li>
            <li>Cobra entradas con Stripe Connect</li>
            <li>Valida accesos con el escáner QR</li>
            <li>Mide ventas, asistencia y difusión</li>
          </ul>
        </section>

        {/* Tarjeta de formulario */}
        <section className="nv-auth-card">
          <div className="nv-auth-logo">
            <Image src="/logo.png" alt="NightVibe" width={120} height={34} priority style={{ height: 30, width: 'auto' }} />
          </div>

          <div className="nv-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => setTab('login')}
              className={`nv-tab ${tab === 'login' ? 'is-active' : ''}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => setTab('register')}
              className={`nv-tab ${tab === 'register' ? 'is-active' : ''}`}
            >
              Crear cuenta
            </button>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
              <div className="nv-field">
                <label className="nv-label">Email</label>
                <input className="nv-input" type="email" value={lemail} onChange={e => setLEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" required />
              </div>
              <div className="nv-field">
                <label className="nv-label">Contraseña</label>
                <input className="nv-input" type="password" value={lpass} onChange={e => setLPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </div>
              {lerr && <p className="nv-notice nv-notice-error">{lerr}</p>}
              {lmsg && <p className="nv-notice nv-notice-success">{lmsg}</p>}
              <button disabled={lloading} className="nv-btn nv-btn-primary nv-btn-block">
                {lloading ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="nv-small nv-muted">
                ¿No tienes cuenta?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setTab('register'); }} className="nv-link-accent">
                  Crea una aquí
                </a>
              </p>
              <p className="nv-small nv-muted" style={{ marginTop: -8 }}>
                ¿Olvidaste tu contraseña?{' '}
                <a href="/login/reset" className="nv-link-accent">Restablécela</a>
              </p>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: 14 }}>
              <div className="nv-field">
                <label className="nv-label">Nombre del club</label>
                <input className="nv-input" type="text" value={rname} onChange={e => setRName(e.target.value)} placeholder="Tu nombre o el del club" required />
              </div>
              <div className="nv-field">
                <label className="nv-label">Email</label>
                <input className="nv-input" type="email" value={remail} onChange={e => setREmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" required />
              </div>
              {rerr && <p className="nv-notice nv-notice-error">{rerr}</p>}
              {rmsg && <p className="nv-notice nv-notice-success">{rmsg}</p>}
              <button disabled={rloading} className="nv-btn nv-btn-primary nv-btn-block">
                {rloading ? 'Enviando…' : 'Crear cuenta'}
              </button>
              <p className="nv-small nv-muted">
                Al crear tu cuenta te enviaremos un correo para verificarla. Tras verificar, podrás iniciar sesión.
              </p>
              <p className="nv-small nv-muted">
                ¿Ya tienes cuenta?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setTab('login'); }} className="nv-link-accent">
                  Inicia sesión
                </a>
              </p>
            </form>
          )}
        </section>
      </div>

      <style jsx>{`
        .nv-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }
        .nv-auth-grid {
          width: 100%;
          max-width: 1040px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          align-items: center;
        }
        .nv-auth-brand { padding: 8px 8px 8px 4px; }
        .nv-accent-text {
          background: var(--nv-grad-accent);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nv-auth-features {
          list-style: none;
          padding: 0;
          margin: 22px 0 0;
          display: grid;
          gap: 12px;
        }
        .nv-auth-features li {
          position: relative;
          padding-left: 28px;
          color: var(--nv-text-soft);
          font-size: 14px;
        }
        .nv-auth-features li::before {
          content: "";
          position: absolute;
          left: 0; top: 3px;
          width: 16px; height: 16px;
          border-radius: 999px;
          background: var(--nv-accent-soft);
          border: 1px solid var(--nv-accent-border);
        }
        .nv-auth-features li::after {
          content: "";
          position: absolute;
          left: 5px; top: 7px;
          width: 6px; height: 6px;
          border-radius: 999px;
          background: var(--nv-accent);
        }
        .nv-auth-card {
          width: 100%;
          max-width: 460px;
          justify-self: end;
          background: rgba(15, 22, 41, 0.82);
          backdrop-filter: blur(10px);
          border: 1px solid var(--nv-border-strong);
          border-radius: var(--nv-r-lg);
          box-shadow: var(--nv-shadow);
          padding: 24px;
        }
        .nv-auth-logo { display: flex; justify-content: center; margin-bottom: 18px; }
        .nv-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 18px;
          background: rgba(255, 255, 255, 0.03);
          padding: 6px;
          border-radius: var(--nv-r-sm);
          border: 1px solid var(--nv-border);
        }
        .nv-tab {
          padding: 10px 12px;
          border-radius: 10px;
          border: 0;
          background: transparent;
          color: var(--nv-muted);
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: background .14s ease, color .14s ease;
        }
        .nv-tab.is-active {
          background: var(--nv-grad-accent);
          color: var(--nv-accent-ink);
        }
        @media (max-width: 860px) {
          .nv-auth-grid { grid-template-columns: 1fr; max-width: 480px; gap: 18px; }
          .nv-auth-brand { display: none; }
          .nv-auth-card { justify-self: stretch; max-width: none; }
        }
      `}</style>
    </main>
  );
}
