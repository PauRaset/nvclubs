'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchEvents } from '@/lib/eventsApi';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

function formatEUR(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function resolveEventDate(event) {
  return event?.startAt || event?.date || event?.startsAt || null;
}

function isFutureEvent(event) {
  const raw = resolveEventDate(event);
  if (!raw) return false;
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now() - 60 * 60 * 1000;
}


function sortByDateAsc(a, b) {
  const da = new Date(resolveEventDate(a) || 0).getTime();
  const db = new Date(resolveEventDate(b) || 0).getTime();
  return da - db;
}

function pickEventClubId(event) {
  return String(
    event?.clubId || event?.club || event?.owner || event?.createdBy || event?.userId || ''
  );
}

function buildInferredClubFromEvents(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const first = items[0] || null;
  if (!first) return null;

  const inferredId = pickEventClubId(first);
  if (!inferredId) return null;

  return {
    _id: inferredId,
    entityName: first?.clubName || first?.entityName || first?.organizerName || '',
    clubName: first?.clubName || first?.entityName || first?.organizerName || '',
    name: first?.clubName || first?.entityName || first?.organizerName || '',
    username: first?.clubName || first?.entityName || first?.organizerName || 'Tu club',
  };
}

function normalizeEventsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function DashboardInner() {
  const sp = useSearchParams();
  const clubIdFromQuery = useMemo(() => sp.get('club') || '', [sp]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const [ordersSummary, setOrdersSummary] = useState(null);
  const [stripeSummary, setStripeSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [referralsSummary, setReferralsSummary] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [inferredClub, setInferredClub] = useState(null);

  function getToken() {
    try {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('nv_token') ||
        localStorage.getItem('authToken') ||
        ''
      );
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

  const fallbackClub = inferredClub || null;
  const effectiveClubId = clubIdFromQuery || clubs[0]?._id || fallbackClub?._id || '';
  const activeClub = useMemo(() => {
    return (
      clubs.find((club) => club?._id === effectiveClubId) ||
      clubs[0] ||
      fallbackClub ||
      null
    );
  }, [clubs, effectiveClubId, fallbackClub]);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setMetricsLoading(true);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let eventsData = await fetchEvents().catch(() => []);
        let safeEvents = normalizeEventsPayload(eventsData);

        if (!safeEvents.length) {
          const fallbackEventsRes = await fetch(`${API}/api/events/mine`, {
            headers,
            credentials: 'include',
            cache: 'no-store',
          }).catch(() => null);

          if (fallbackEventsRes?.ok) {
            const fallbackEventsData = await fallbackEventsRes.json().catch(() => []);
            safeEvents = normalizeEventsPayload(fallbackEventsData);
          }
        }

        if (cancelled) return;

        const inferred = buildInferredClubFromEvents(safeEvents);
        const resolvedClubId = effectiveClubId || inferred?._id || '';

        setEvents(safeEvents);
        setInferredClub(inferred || null);

        if (!resolvedClubId) {
          console.warn('[dashboard] No club could be resolved from clubs/mine or events/mine');
          setOrdersSummary(null);
          setStripeSummary(null);
          setReferralsSummary(null);
          return;
        }

        const [ordersRes, stripeSummaryRes, referralsRes] = await Promise.all([
          fetch(`${API}/api/clubs/${resolvedClubId}/orders`, {
            headers,
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${API}/api/clubs/${resolvedClubId}/stripe/summary?days=30`, {
            headers,
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${API}/api/referrals/club/${resolvedClubId}/summary`, {
            headers,
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        const [ordersData, stripeSummaryData, referralsData] = await Promise.all([
          ordersRes.ok ? ordersRes.json() : null,
          stripeSummaryRes.ok ? stripeSummaryRes.json() : null,
          referralsRes.ok ? referralsRes.json() : null,
        ]);

        if (cancelled) return;

        setOrdersSummary(ordersData || null);
        setStripeSummary(stripeSummaryData || null);
        setReferralsSummary(referralsData || null);
      } catch (e) {
        if (!cancelled) {
          console.error('[dashboard] metrics load error:', e);
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [effectiveClubId]);


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

  const upcomingEventsData = useMemo(() => {
    return [...events].filter(isFutureEvent).sort(sortByDateAsc).slice(0, 4);
  }, [events]);

  const totalAttendees = useMemo(() => {
    return events.reduce((acc, event) => acc + (Array.isArray(event?.attendees) ? event.attendees.length : 0), 0);
  }, [events]);

  const totalEvents = events.length;
  const totalUpcomingEvents = upcomingEventsData.length;
  const totalTickets = Number(ordersSummary?.totalTickets || 0);
  const totalOrders = Number(ordersSummary?.count || 0);
  const totalRevenueCents = Number(ordersSummary?.totalCents || 0);
  const totalRevenueEUR = totalRevenueCents / 100;
  const stripeNet = Number(stripeSummary?.net || 0);
  const referralClicks = Number(referralsSummary?.totalClicks || 0);
  const referralUniqueClicks = Number(referralsSummary?.totalUniqueClicks || 0);
  const topReferralEvent = referralsSummary?.topEvents?.[0] || null;
  const topReferralUser = referralsSummary?.topUsers?.[0] || null;

  const kpis = [
    {
      label: 'Eventos activos',
      value: metricsLoading ? '...' : String(totalUpcomingEvents),
      helper: `${totalEvents} eventos totales del club`,
    },
    {
      label: 'Entradas vendidas',
      value: metricsLoading ? '...' : String(totalTickets),
      helper: `${totalOrders} pedidos registrados`,
    },
    {
      label: 'Ingresos',
      value: metricsLoading ? '...' : formatEUR(totalRevenueEUR),
      helper: 'Volumen bruto de pedidos',
    },
    {
      label: 'Asistencias',
      value: metricsLoading ? '...' : String(totalAttendees),
      helper: 'Usuarios marcados como asistentes',
    },
    {
      label: 'Usuarios alcanzados',
      value: metricsLoading ? '...' : String(referralUniqueClicks),
      helper: 'Clicks únicos en difusión',
    },
    {
      label: 'Clicks compartidos',
      value: metricsLoading ? '...' : String(referralClicks),
      helper: 'Total de clicks en links compartidos',
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

  const upcomingEvents = upcomingEventsData.length
    ? upcomingEventsData.map((event) => ({
        title: event?.title || event?.name || 'Evento',
        meta: `${formatDate(resolveEventDate(event))} · ${(event?.city || 'Ubicación por confirmar')}${Array.isArray(event?.categories) && event.categories.length ? ` · ${event.categories.slice(0, 2).join(', ')}` : ''}`,
        status: `${Array.isArray(event?.attendees) ? event.attendees.length : 0} asistentes`,
      }))
    : [
        {
          title: 'Sin próximos eventos',
          meta: 'Crea un nuevo evento para empezar a ver actividad aquí.',
          status: 'Vacío',
        },
      ];

  const recentActivity = [
    totalOrders > 0
      ? `${totalOrders} pedidos registrados en el club.`
      : 'Todavía no hay pedidos registrados.',
    totalTickets > 0
      ? `${totalTickets} entradas vendidas en total.`
      : 'Aún no se han vendido entradas.',
    referralClicks > 0
      ? `${referralClicks} clicks generados desde links compartidos.`
      : 'Aún no hay tráfico registrado desde difusión.',
  ];

  const referralInsights = [
    topReferralEvent
      ? `Evento top por difusión: ${topReferralEvent.eventTitle || topReferralEvent.title || 'Evento'} · ${topReferralEvent.clicks || 0} clicks`
      : 'Todavía no hay un evento destacado por difusión.',
    topReferralUser
      ? `Usuario top: ${(topReferralUser.user?.username || topReferralUser.username || 'Usuario')} · ${topReferralUser.clicks || 0} clicks`
      : 'Todavía no hay usuarios destacados en compartidos.',
    `Clicks únicos acumulados: ${referralUniqueClicks}`,
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
                {(effectiveClubId || inferredClub?._id)
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
                <div>• Neto 30 días: {metricsLoading ? '...' : formatEUR(stripeNet)}</div>
              </div>
            </div>
          </div>
        </section>

        {loading && <div style={warningBox}>Cargando tu club…</div>}
        {error && <div style={errorBox}>{error}</div>}
        {!loading && !(effectiveClubId || inferredClub?._id) && (
          <div style={warningBox}>
            No se encontró ningún club asociado a tu cuenta. Si en otras pantallas sí ves datos,
            revisa en red la respuesta de <code>/api/events/mine</code> y <code>/api/clubs/mine</code>.
          </div>
        )}
        {!loading && !clubs.length && inferredClub && (
          <div style={infoBox}>
            No se encontró el club en <code>/api/clubs/mine</code>, pero el dashboard ha inferido el club desde tus eventos para no dejar la pantalla vacía.
          </div>
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
                <div>• Bruto 30 días: {metricsLoading ? '...' : formatEUR(Number(stripeSummary?.gross || 0))}</div>
                <div>• Neto 30 días: {metricsLoading ? '...' : formatEUR(stripeNet)}</div>
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
              Resumen real de tráfico compartido, usuarios alcanzados y rendimiento de difusión del club.
            </p>

            <div style={{ height: 18 }} />

            <ul style={list}>
              {referralInsights.map((item) => (
                <li key={item} style={listItem}>
                  <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{item}</div>
                </li>
              ))}
            </ul>

            <div style={{ height: 16 }} />
            <a href="/referrals" style={secondaryBtn}>
              Ver analítica completa de difusión
            </a>
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
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Resumen conectado</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Este dashboard ya está leyendo ventas, Stripe, eventos del club y difusión.
                  El siguiente paso natural sería pulir la actividad reciente y añadir más detalle visual por evento.
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
