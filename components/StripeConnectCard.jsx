'use client';
import { useState, useEffect } from 'react';
import { getStripeStatus, startOnboarding } from '@/lib/clubsApi';

export default function StripeConnectCard({ clubId }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const s = await getStripeStatus(clubId);
      setStatus(s);
    } catch (e) {
      setError(e.message || 'Error cargando estado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (clubId) load(); }, [clubId]);

  async function handleOnboard() {
    try {
      setLoading(true);
      const { url } = await startOnboarding(clubId);
      window.location.href = url;
    } catch (e) {
      setError(e.message || 'No se pudo iniciar onboarding');
      setLoading(false);
    }
  }

  const connected = !!status?.connected;

  return (
    <div style={card}>
      <h3 style={title}>Stripe Connect</h3>
      {loading && <p>Cargando…</p>}
      {error && <p style={err}>{error}</p>}

      {status && (
        <>
          <p style={muted}>
            {connected ? 'Cuenta conectada ✅' : 'Cuenta no conectada ❌'}
          </p>
          {!connected && (
            <>
              {status.requirements?.currently_due?.length ? (
                <ul style={{ marginTop: 8 }}>
                  {status.requirements.currently_due.map((r) => (
                    <li key={r} style={{ fontSize: 13 }}>{r}</li>
                  ))}
                </ul>
              ) : null}
              <button onClick={handleOnboard} style={btnPrimary}>Conectar con Stripe</button>
            </>
          )}
          {connected && (
            <p style={{ fontSize: 13 }}>
              Payouts: {status.payouts_enabled ? 'habilitados ✅' : 'pendientes ⏳'}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const card = { background:'#0b0f19', border:'1px solid #1d263a', borderRadius:16, padding:16 };
const title = { margin:0, marginBottom:8 };
const muted = { color:'#9ca3af', fontSize:14 };
const err = { color:'#ef4444', fontSize:13 };
const btnPrimary = { marginTop:12, padding:'8px 12px', borderRadius:10, background:'#0ea5e9', color:'#001018', fontWeight:600, border:'none', cursor:'pointer' };
