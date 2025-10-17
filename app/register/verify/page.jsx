// app/register/verify/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { verifyRegistration } from '@/lib/registrationApi';
import { useSearchParams } from 'next/navigation';

export default function VerifyRegistrationPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  async function onVerify(e) {
    e?.preventDefault?.();
    if (!token) return;
    setStatus('loading'); setMsg('');
    try {
      const r = await verifyRegistration(token);
      setStatus('ok');
      setMsg(r?.message || 'Email verificado. Te avisaremos cuando activemos tu cuenta.');
    } catch (e) {
      setStatus('error');
      setMsg(e.message || 'No se pudo verificar el token');
    }
  }

  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: '#0b1220',
    color: '#e5e7eb',
  };

  return (
    <main style={{ padding: 24, color: '#e5e7eb', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 16 }}>Verificar registro</h1>
      <form onSubmit={onVerify} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Token de verificación</span>
          <input style={input} value={token} onChange={e=>setToken(e.target.value)} placeholder="pe. abcd1234..." />
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <button disabled={!token || status==='loading'} type="submit" style={{
            padding: '10px 14px', borderRadius: 10, border: '1px solid #0ea5e9',
            background: status==='loading' ? '#0b1220' : '#0ea5e9', color: status==='loading' ? '#64748b' : '#001018', fontWeight: 700
          }}>
            {status==='loading' ? 'Verificando…' : 'Verificar'}
          </button>
          <a href="/login" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', textDecoration: 'none', color: '#e5e7eb' }}>
            Ir a iniciar sesión
          </a>
        </div>
      </form>

      {msg && (
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 10,
          background: status==='ok' ? '#052e1a' : '#2a0a0a',
          border: `1px solid ${status==='ok' ? '#14532d' : '#7f1d1d'}`,
          color: status==='ok' ? '#86efac' : '#fecaca'
        }}>
          {msg}
        </div>
      )}
    </main>
  );
}