'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import RequireClub from '@/components/RequireClub';
import StripeConnectCard from '@/components/StripeConnectCard';
import ScannerKeyCard from '@/components/ScannerKeyCard';
import { getToken, getUser, clearSession } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

function SettingsInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [club, setClub] = useState(null);
  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/mine`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : data;
        if (!cancelled) setClub(first || null);
      } catch (e) {
        if (!cancelled) setError('No se pudo cargar la configuración de tu club.');
        console.error('[settings] /clubs/mine error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const clubId = club?._id || club?.id || '';
  const clubName =
    club?.entityName || club?.clubName || club?.name || club?.username || 'Tu club';
  const clubEmail = club?.email || user?.email || '—';

  function logout() {
    if (!confirm('¿Cerrar sesión en este dispositivo?')) return;
    clearSession();
    window.location.href = '/login';
  }

  return (
    <main className="nv-page">
      <div className="nv-shell">
        <section className="nv-hero">
          <div className="nv-badge">Configuración</div>
          <h1 className="nv-h1" style={{ marginTop: 14 }}>Ajustes del club</h1>
          <p className="nv-lead" style={{ marginTop: 12, maxWidth: 720 }}>
            Gestiona los datos de tu club, la conexión con Stripe, la clave del
            escáner de accesos y tu sesión.
          </p>
        </section>

        {loading && (
          <section className="nv-grid-cards">
            {[0, 1, 2].map((i) => (
              <div key={i} className="nv-card" style={{ minHeight: 160 }}>
                <div className="nv-skeleton" style={{ height: 18, width: '40%' }} />
                <div className="nv-skeleton" style={{ height: 12, width: '80%', marginTop: 16 }} />
                <div className="nv-skeleton" style={{ height: 12, width: '60%', marginTop: 10 }} />
              </div>
            ))}
          </section>
        )}

        {!loading && error && <div className="nv-notice nv-notice-error">{error}</div>}

        {!loading && (
          <>
            <section className="nv-grid-cards">
              {/* Datos del club */}
              <article className="nv-card">
                <h2 className="nv-h3">Datos del club</h2>
                <p className="nv-lead nv-small" style={{ marginTop: 6 }}>
                  Información asociada a tu cuenta de club.
                </p>
                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                  <Field label="Nombre del club" value={clubName} />
                  <Field label="Email de contacto" value={clubEmail} />
                  <Field label="ID del club" value={clubId || 'No detectado'} mono />
                </div>
                <p className="nv-small nv-muted" style={{ marginTop: 14 }}>
                  Para editar el nombre público o el avatar, usa tu{' '}
                  <a href="/profile" className="nv-link-accent">perfil</a>.
                </p>
              </article>

              {/* Stripe */}
              <article className="nv-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 22, paddingBottom: 0 }}>
                  <h2 className="nv-h3">Cobros · Stripe</h2>
                  <p className="nv-lead nv-small" style={{ marginTop: 6 }}>
                    Conexión necesaria para cobrar las entradas de tus eventos.
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  {clubId ? (
                    <StripeConnectCard clubId={clubId} />
                  ) : (
                    <div className="nv-notice nv-notice-warn">
                      No se ha detectado un club para conectar Stripe.
                    </div>
                  )}
                </div>
              </article>

              {/* Escáner */}
              <article className="nv-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 22, paddingBottom: 0 }}>
                  <h2 className="nv-h3">Escáner de accesos</h2>
                  <p className="nv-lead nv-small" style={{ marginTop: 6 }}>
                    Clave para validar entradas con QR desde el escáner.
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  {clubId ? (
                    <ScannerKeyCard clubId={clubId} initialKey={club?.scannerApiKey || ''} />
                  ) : (
                    <div className="nv-notice nv-notice-warn">
                      No se ha detectado un club para gestionar la clave del escáner.
                    </div>
                  )}
                </div>
              </article>
            </section>

            {/* Sesión */}
            <section className="nv-card">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 className="nv-h3">Sesión</h2>
                  <p className="nv-lead nv-small" style={{ marginTop: 6 }}>
                    Cierra la sesión de este dispositivo de forma segura.
                  </p>
                </div>
                <button onClick={logout} className="nv-btn nv-btn-danger">
                  Cerrar sesión
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="nv-card-soft" style={{ padding: 14 }}>
      <div className="nv-kpi-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 700, wordBreak: 'break-all', fontFamily: mono ? 'var(--font-geist-mono), monospace' : 'inherit' }}>
        {value}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireClub>
      <Suspense fallback={<div className="nv-shell"><div className="nv-card">Cargando…</div></div>}>
        <SettingsInner />
      </Suspense>
    </RequireClub>
  );
}
