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
    <div className="nv-card-soft" style={{ display: 'grid', gap: 10 }}>
      {loading && <p className="nv-small nv-muted">Cargando…</p>}
      {error && <p className="nv-notice nv-notice-error nv-small">{error}</p>}

      {status && (
        <>
          <span className={`nv-badge ${connected ? 'nv-badge-success' : 'nv-badge-warn'}`}>
            {connected ? 'Cuenta conectada' : 'Cuenta no conectada'}
          </span>

          {!connected && (
            <>
              {status.requirements?.currently_due?.length ? (
                <ul className="nv-small nv-muted" style={{ margin: '4px 0', paddingLeft: 18 }}>
                  {status.requirements.currently_due.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
              <button onClick={handleOnboard} className="nv-btn nv-btn-primary" disabled={loading}>
                Conectar con Stripe
              </button>
            </>
          )}

          {connected && (
            <p className="nv-small nv-muted">
              Payouts: {status.payouts_enabled ? 'habilitados ✅' : 'pendientes ⏳'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
