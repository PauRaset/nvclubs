'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

function DashboardInner() {
  const sp = useSearchParams();
  const clubIdFromQuery = useMemo(() => sp.get('club') || '', [sp]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  function getToken() {
    try {
      return localStorage.getItem('nv_token') || '';
    } catch {
      return '';
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      setLoading(true);

      try {
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/mine`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`${res.status} ${res.statusText} ${t || ''}`.trim());
        }

        const data = await res.json();
        if (!cancelled) setClubs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError('No se pudo cargar tu club.');
        console.error('[dashboard] /clubs/mine error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveClubId = clubIdFromQuery || clubs[0]?._id || '';
  const activeClub = useMemo(() => {
    return clubs.find((club) => club?._id === effectiveClubId) || clubs[0] || null;
  }, [clubs, effectiveClubId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!effectiveClubId) return;

      try {
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data || null);
      } catch (_) {}
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [effectiveClubId]);

  async function openStripeDashboard() {
    if (!effectiveClubId) return;

    setBusy(true);
    setError('');

    try {
      const token = getToken();
      const resp = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/login-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      const ob = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (ob.ok) {
        const data = await ob.json();
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      throw new Error('No se pudo abrir Stripe.');
    } catch (e) {
      console.error('[dashboard] abrir Stripe error:', e);
      setError('No se pudo abrir el panel de Stripe.');
    } finally {
      setBusy(false);
    }
  }

  const clubName =
    activeClub?.entityName ||
    activeClub?.clubName ||
    activeClub?.name ||
    activeClub?.username ||
    'Tu club';

  const kpis = [
    {
      label: 'Eventos activos',
      value: loading ? '...' : '0',
      helper: 'Próximamente conectaremos este dato',
    },
    {
      label: 'Entradas vendidas',
      value: loading ? '...' : '0',
      helper: 'Ventas totales de tus eventos',
    },
    {
      label: 'Ingresos',
      value: loading ? '...' : '€0',
      helper: 'Resumen económico del club',
    },
    {
      label: 'Check-ins',
      value: loading ? '...' : '0',
      helper: 'Entradas escaneadas en puerta',
    },
    {
      label: 'Usuarios alcanzados',
      value: loading ? '...' : '0',
      helper: 'Visualizaciones y tráfico',
    },
    {
      label: 'Clicks compartidos',
      value: loading ? '...' : '0',
      helper: 'Clicks en links compartidos',
    },
  ];

  const quickActions = [
    {
      title: 'Crear evento',
      description: 'Publica un nuevo evento para tu club.',
      href: '/events/new',
    },
    {
      title: 'Gestionar eventos',
      description: 'Edita, revisa y organiza tus eventos.',
      href: '/events',
    },
    {
      title: 'Abrir Stripe',
      description: 'Consulta cobros, pagos y transferencias.',
      action: openStripeDashboard,
    },
    {
      title: 'Escáner',
      description: 'Valida entradas y registra accesos.',
      href: '/scanner',
    },
  ];

  const upcomingEvents = [
    {
      title: 'Sin eventos cargados todavía',
      meta: 'Aquí verás tus próximos eventos cuando conectemos esta sección.',
      status: 'Próximamente',
    },
    {
      title: 'Estadísticas por evento',
      meta: 'Ventas, asistentes, fotos y rendimiento individual.',
      status: 'En preparación',
    },
    {
      title: 'Duplicar y promocionar',
      meta: 'Accesos rápidos para lanzar eventos más rápido.',
      status: 'Siguiente fase',
    },
  ];

  const recentActivity = [
    'Nuevas compras y check-ins aparecerán aquí.',
    'También podrás ver fotos subidas por usuarios.',
    'La actividad reciente del club quedará resumida en tiempo real.',
  ];

  const referralInsights = [
    'Clicks en links compartidos por usuario.',
    'Usuarios únicos atraídos a cada evento.',
    'Top embajadores y conversión a asistencia o compra.',
  ];

  const container = {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, rgba(0,229,255,0.12), transparent 0 28%), #0b0f19',
    color: '#e5e7eb',
    padding: '32px 24px 48px',
  };

  const shell = {
    width: '100%',
    maxWidth: 1280,
    margin: '0 auto',
    display: 'grid',
    gap: 24,
  };

  const hero = {
    background: 'linear-gradient(135deg, rgba(0,229,255,0.14), rgba(15,22,41,0.96))',
    border: '1px solid rgba(0,229,255,0.18)',
    borderRadius: 24,
    padding: 28,
    boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)',
    gap: 20,
  };

  const heroTitle = {
    margin: 0,
    fontSize: 'clamp(30px, 4vw, 42px)',
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: '-0.03em',
  };

  const heroText = {
    margin: '10px 0 0',
    color: '#cbd5e1',
    maxWidth: 640,
    fontSize: 15,
    lineHeight: 1.6,
  };

  const heroPanel = {
    background: 'rgba(11,15,25,0.72)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
    display: 'grid',
    gap: 12,
    alignContent: 'space-between',
  };

  const badge = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    padding: '8px 12px',
    border: '1px solid rgba(0,229,255,0.25)',
    background: 'rgba(0,229,255,0.08)',
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: 700,
    width: 'fit-content',
  };

  const primaryBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    padding: '0 16px',
    fontWeight: 800,
    border: '1px solid #00c2ff',
    background: '#00e5ff',
    color: '#0b0f19',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  const secondaryBtn = {
    ...primaryBtn,
    background: 'transparent',
    color: '#e5e7eb',
    border: '1px solid rgba(255,255,255,0.12)',
  };

  const buttonRow = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  };

  const kpiGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
  };

  const kpiCard = {
    background: 'rgba(15,22,41,0.94)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
  };

  const sectionGrid = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
    gap: 24,
    alignItems: 'start',
  };

  const sectionCard = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 22,
    boxShadow: '0 14px 40px rgba(0,0,0,0.22)',
  };

  const sectionTitle = {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  };

  const sectionSubtitle = {
    margin: '8px 0 0',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1.6,
  };

  const infoBox = {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    background: 'rgba(0,229,255,0.06)',
    border: '1px solid rgba(0,229,255,0.12)',
    color: '#cbd5e1',
    fontSize: 14,
  };

  const warningBox = {
    padding: 14,
    border: '1px solid #3b2f14',
    background: '#1a1408',
    borderRadius: 14,
    color: '#fbbf24',
    fontSize: 14,
  };

  const errorBox = {
    padding: 14,
    border: '1px solid rgba(248,113,113,0.28)',
    background: 'rgba(127,29,29,0.24)',
    borderRadius: 14,
    color: '#fca5a5',
    fontSize: 14,
  };

  const list = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: 12,
  };

  const listItem = {
    display: 'grid',
    gap: 6,
    padding: 14,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  };

  const actionGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  };

  return (
    <main style={container}>
      <div style={shell}>
        <section style={hero}>
          <div>
            <div style={badge}>Dashboard del club</div>
            <h1 style={heroTitle}>Bienvenido, {clubName}</h1>
            <p style={heroText}>
              Desde aquí podrás controlar el rendimiento de tus eventos, ventas,
              actividad del club, promociones y difusión. Hemos preparado una base
              visual más potente para convertir este panel en un centro de control real.
            </p>

            <div style={buttonRow}>
              <a href="/events/new" style={primaryBtn}>
                + Crear evento
              </a>
              <button
                onClick={openStripeDashboard}
                style={secondaryBtn}
                disabled={!effectiveClubId || busy}
              >
                {busy ? 'Abriendo…' : 'Abrir Stripe'}
              </button>
            </div>
          </div>

          <div style={heroPanel}>
            <div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Estado de la cuenta</div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>{clubName}</div>
              <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 14 }}>
                {effectiveClubId
                  ? `Club detectado y listo para conectar más métricas.`
                  : 'No se ha detectado ningún club asociado a esta cuenta.'}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={infoBox}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Stripe</div>
                <div>
                  {status?.connected
                    ? 'Cuenta conectada correctamente.'
                    : 'Cuenta todavía no conectada o pendiente de onboarding.'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, color: '#cbd5e1', fontSize: 14 }}>
                <div>• Payouts enabled: {status?.payouts_enabled ? 'Sí' : 'No'}</div>
                <div>• Datos enviados: {status?.details_submitted ? 'Sí' : 'No'}</div>
              </div>
            </div>
          </div>
        </section>

        {loading && <div style={warningBox}>Cargando tu club…</div>}
        {error && <div style={errorBox}>{error}</div>}
        {!loading && !effectiveClubId && (
          <div style={warningBox}>No se encontró ningún club asociado a tu cuenta.</div>
        )}

        <section style={kpiGrid}>
          {kpis.map((item) => (
            <article key={item.label} style={kpiCard}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{item.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{item.value}</div>
              <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>{item.helper}</div>
            </article>
          ))}
        </section>

        <section style={sectionGrid}>
          <article style={sectionCard}>
            <h2 style={sectionTitle}>Accesos rápidos</h2>
            <p style={sectionSubtitle}>
              Acciones principales del club para gestionar el día a día desde el panel.
            </p>

            <div style={{ height: 18 }} />

            <div style={actionGrid}>
              {quickActions.map((item) => {
                const content = (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{item.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
                      {item.description}
                    </div>
                  </>
                );

                if (item.action) {
                  return (
                    <button
                      key={item.title}
                      onClick={item.action}
                      style={{
                        ...listItem,
                        cursor: !effectiveClubId || busy ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        color: '#e5e7eb',
                      }}
                      disabled={!effectiveClubId || busy}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <a
                    key={item.title}
                    href={item.href}
                    style={{
                      ...listItem,
                      textDecoration: 'none',
                      color: '#e5e7eb',
                    }}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </article>

          <article style={sectionCard}>
            <h2 style={sectionTitle}>Stripe y cobros</h2>
            <p style={sectionSubtitle}>
              Consulta el estado de tu cuenta y accede al panel de pagos cuando lo necesites.
            </p>

            <div style={{ height: 18 }} />

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={infoBox}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {status?.connected ? 'Cuenta conectada' : 'Onboarding pendiente'}
                </div>
                <div>
                  {status?.connected
                    ? 'Ya puedes consultar ventas, pagos y transferencias desde Stripe.'
                    : 'Completa la configuración para empezar a cobrar correctamente tus eventos.'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, color: '#cbd5e1', fontSize: 14 }}>
                <div>• Conectada: {status?.connected ? 'Sí' : 'No'}</div>
                <div>• Payouts: {status?.payouts_enabled ? 'Activos' : 'Pendientes'}</div>
                <div>• Datos enviados: {status?.details_submitted ? 'Sí' : 'No'}</div>
              </div>

              <button onClick={openStripeDashboard} style={primaryBtn} disabled={!effectiveClubId || busy}>
                {busy ? 'Abriendo…' : 'Abrir panel de Stripe'}
              </button>

              {status && !status.connected && (
                <button onClick={openStripeDashboard} style={secondaryBtn} disabled={!effectiveClubId || busy}>
                  {busy ? 'Abriendo…' : 'Completar onboarding'}
                </button>
              )}
            </div>
          </article>
        </section>

        <section style={sectionGrid}>
          <article style={sectionCard}>
            <h2 style={sectionTitle}>Próximos eventos y rendimiento</h2>
            <p style={sectionSubtitle}>
              Aquí mostraremos los eventos del club con sus métricas y accesos directos.
            </p>

            <div style={{ height: 18 }} />

            <ul style={list}>
              {upcomingEvents.map((item) => (
                <li key={item.title} style={listItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 800,
                        background: 'rgba(0,229,255,0.08)',
                        color: '#67e8f9',
                        border: '1px solid rgba(0,229,255,0.14)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.meta}</div>
                </li>
              ))}
            </ul>
          </article>

          <article style={sectionCard}>
            <h2 style={sectionTitle}>Actividad reciente</h2>
            <p style={sectionSubtitle}>
              Compras, check-ins, fotos verificadas y movimiento general del club.
            </p>

            <div style={{ height: 18 }} />

            <ul style={list}>
              {recentActivity.map((item) => (
                <li key={item} style={listItem}>
                  <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{item}</div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section style={sectionGrid}>
          <article style={sectionCard}>
            <h2 style={sectionTitle}>Difusión y compartidos</h2>
            <p style={sectionSubtitle}>
              Preparado para medir tráfico, usuarios atraídos y rendimiento de links compartidos.
            </p>

            <div style={{ height: 18 }} />

            <ul style={list}>
              {referralInsights.map((item) => (
                <li key={item} style={listItem}>
                  <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{item}</div>
                </li>
              ))}
            </ul>
          </article>

          <article style={sectionCard}>
            <h2 style={sectionTitle}>Estado del dashboard</h2>
            <p style={sectionSubtitle}>
              Esta primera versión ya transforma la pantalla de cobros en un dashboard visual real.
            </p>

            <div style={{ height: 18 }} />

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={infoBox}>
                La base visual ya está lista para conectar estadísticas reales, eventos del club,
                promociones, verificación de fotos y analítica de difusión.
              </div>

              <div style={listItem}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Siguiente paso recomendado</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Conectar eventos reales del club en esta pantalla y después continuar con la mejora
                  del listado de eventos y promociones.
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: '#e5e7eb' }}>Cargando…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
