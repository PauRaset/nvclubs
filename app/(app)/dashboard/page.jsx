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

  const hasClub = Boolean(effectiveClubId || inferredClub?._id);

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
  const stripeGross = Number(stripeSummary?.gross || 0);
  const referralClicks = Number(referralsSummary?.totalClicks || 0);
  const referralUniqueClicks = Number(referralsSummary?.totalUniqueClicks || 0);
  const topReferralEvent = referralsSummary?.topEvents?.[0] || null;
  const topReferralUser = referralsSummary?.topUsers?.[0] || null;

  const kpis = [
    {
      label: 'Eventos activos',
      value: String(totalUpcomingEvents),
      helper: `${totalEvents} eventos en total`,
    },
    {
      label: 'Entradas vendidas',
      value: String(totalTickets),
      helper: `${totalOrders} pedidos registrados`,
    },
    {
      label: 'Ingresos',
      value: formatEUR(totalRevenueEUR),
      helper: 'Volumen bruto de pedidos',
    },
    {
      label: 'Asistencias',
      value: String(totalAttendees),
      helper: 'Usuarios marcados como asistentes',
    },
    {
      label: 'Usuarios alcanzados',
      value: String(referralUniqueClicks),
      helper: 'Clicks únicos en difusión',
    },
    {
      label: 'Clicks compartidos',
      value: String(referralClicks),
      helper: 'Total de clicks en links compartidos',
    },
  ];

  const quickActions = [
    {
      title: 'Crear evento',
      description: 'Publica un nuevo evento para tu club.',
      href: '/events/new',
      icon: 'plus',
    },
    {
      title: 'Gestionar eventos',
      description: 'Edita, revisa y organiza tus eventos.',
      href: '/events',
      icon: 'calendar',
    },
    {
      title: 'Promociones',
      description: 'Configura niveles, misiones y recompensas.',
      href: '/promotions',
      icon: 'gift',
    },
    {
      title: 'Escáner',
      description: 'Valida entradas y registra accesos.',
      href: '/scanner',
      icon: 'scan',
    },
  ];

  const referralInsights = [
    topReferralEvent
      ? `Evento top: ${topReferralEvent.eventTitle || topReferralEvent.title || 'Evento'} · ${topReferralEvent.clicks || 0} clicks`
      : 'Todavía no hay un evento destacado por difusión.',
    topReferralUser
      ? `Usuario top: ${(topReferralUser.user?.username || topReferralUser.username || 'Usuario')} · ${topReferralUser.clicks || 0} clicks`
      : 'Todavía no hay usuarios destacados en compartidos.',
    `Clicks únicos acumulados: ${referralUniqueClicks}`,
  ];

  const stripeConnected = Boolean(status?.connected);

  return (
    <div className="nv-views">
      <section className="nv-hero nv-hero-split nv-animate-in">
        <div>
          <span className="nv-eyebrow">Panel del club</span>
          <h1 className="nv-h1" style={{ marginTop: 10 }}>Hola, {clubName}</h1>
          <p className="nv-lead" style={{ marginTop: 10, maxWidth: 560 }}>
            Controla ventas, eventos y difusión de tu club desde un único lugar.
          </p>
          <div className="nv-row" style={{ marginTop: 18 }}>
            <a href="/events/new" className="nv-btn nv-btn-primary">+ Crear evento</a>
            <button
              type="button"
              onClick={openStripeDashboard}
              className="nv-btn nv-btn-ghost"
              disabled={!hasClub || busy}
            >
              {busy ? 'Abriendo…' : 'Abrir Stripe'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, alignContent: 'start', minWidth: 220 }}>
          <span className={`nv-badge ${stripeConnected ? 'nv-badge-success' : 'nv-badge-warn'}`}>
            {stripeConnected ? 'Cobros conectados' : 'Cobros pendientes'}
          </span>
          <div className="nv-card-soft" style={{ display: 'grid', gap: 8 }}>
            <div className="nv-small nv-muted">Neto últimos 30 días</div>
            <div className="nv-kpi-value" style={{ fontSize: 26 }}>
              {metricsLoading ? '…' : formatEUR(stripeNet)}
            </div>
            <div className="nv-small nv-muted">Bruto {metricsLoading ? '…' : formatEUR(stripeGross)}</div>
          </div>
        </div>
      </section>

      {error && (
        <div className="nv-notice nv-notice-error" role="alert" aria-live="assertive">{error}</div>
      )}
      {!loading && !hasClub && (
        <div className="nv-notice nv-notice-warn" role="status">
          No se ha detectado ningún club asociado a esta cuenta. Comprueba tu sesión o vuelve a iniciar sesión.
        </div>
      )}
      {!loading && !clubs.length && inferredClub && (
        <div className="nv-notice nv-notice-info">
          Mostrando datos del club inferido a partir de tus eventos.
        </div>
      )}

      <section className="nv-grid-auto nv-stagger">
        {kpis.map((item) => (
          <article key={item.label} className="nv-kpi">
            <div className="nv-kpi-label">{item.label}</div>
            {metricsLoading ? (
              <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '55%', marginTop: 0 }} />
            ) : (
              <div className="nv-kpi-value">{item.value}</div>
            )}
            <div className="nv-kpi-help">{item.helper}</div>
          </article>
        ))}
      </section>

      <section className="nv-grid-cards">
        {quickActions.map((item) => (
          <a key={item.title} href={item.href} className="nv-card nv-card-interactive" style={{ display: 'grid', gap: 10, textDecoration: 'none' }}>
            <span className="nv-empty-icon" aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 13, marginBottom: 0 }}>
              <QuickIcon name={item.icon} />
            </span>
            <div className="nv-h4">{item.title}</div>
            <div className="nv-small nv-muted">{item.description}</div>
          </a>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
        <article className="nv-card">
          <div className="nv-section-head" style={{ marginBottom: 16 }}>
            <h2 className="nv-h3">Próximos eventos</h2>
            <a href="/events" className="nv-link-accent">Ver todos</a>
          </div>

          {metricsLoading ? (
            <div className="nv-list">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="nv-item"><div className="nv-skeleton nv-skeleton-line lg" style={{ width: '60%', marginTop: 0 }} /></div>
              ))}
            </div>
          ) : upcomingEventsData.length === 0 ? (
            <div className="nv-empty" style={{ padding: '28px 12px' }}>
              <div className="nv-empty-title" style={{ fontSize: 18 }}>Sin próximos eventos</div>
              <div className="nv-empty-text">Crea un evento para empezar a ver actividad aquí.</div>
              <a href="/events/new" className="nv-btn nv-btn-primary" style={{ marginTop: 6 }}>+ Crear evento</a>
            </div>
          ) : (
            <ul className="nv-list">
              {upcomingEventsData.map((event) => {
                const id = event?._id || event?.id;
                const title = event?.title || event?.name || 'Evento';
                const attendees = Array.isArray(event?.attendees) ? event.attendees.length : 0;
                const place = event?.city || 'Ubicación por confirmar';
                return (
                  <li key={id || title}>
                    <a href={id ? `/events/${id}` : '/events'} className="nv-item" style={{ textDecoration: 'none' }}>
                      <div className="nv-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                        <span className="nv-h4 nv-truncate">{title}</span>
                        <span className="nv-badge">{attendees} asist.</span>
                      </div>
                      <div className="nv-small nv-muted">{formatDate(resolveEventDate(event))} · {place}</div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="nv-card">
          <div className="nv-section-head" style={{ marginBottom: 16 }}>
            <h2 className="nv-h3">Cobros con Stripe</h2>
            <span className={`nv-badge ${stripeConnected ? 'nv-badge-success' : 'nv-badge-warn'}`}>
              {stripeConnected ? 'Conectado' : 'Pendiente'}
            </span>
          </div>

          <div className={`nv-notice ${stripeConnected ? 'nv-notice-success' : 'nv-notice-warn'}`} style={{ marginBottom: 14 }}>
            {stripeConnected
              ? 'Tu cuenta puede recibir cobros. Consulta ventas y transferencias en Stripe.'
              : 'Completa el onboarding de Stripe para empezar a cobrar tus eventos.'}
          </div>

          <ul className="nv-list" style={{ marginBottom: 16 }}>
            <li className="nv-item nv-row" style={{ justifyContent: 'space-between' }}>
              <span className="nv-small nv-muted">Pagos habilitados</span>
              <strong className="nv-small">{status?.payouts_enabled ? 'Sí' : 'No'}</strong>
            </li>
            <li className="nv-item nv-row" style={{ justifyContent: 'space-between' }}>
              <span className="nv-small nv-muted">Datos enviados</span>
              <strong className="nv-small">{status?.details_submitted ? 'Sí' : 'No'}</strong>
            </li>
            <li className="nv-item nv-row" style={{ justifyContent: 'space-between' }}>
              <span className="nv-small nv-muted">Neto 30 días</span>
              <strong className="nv-small">{metricsLoading ? '…' : formatEUR(stripeNet)}</strong>
            </li>
          </ul>

          <button
            type="button"
            onClick={openStripeDashboard}
            className="nv-btn nv-btn-primary nv-btn-block"
            disabled={!hasClub || busy}
          >
            {busy ? 'Abriendo…' : stripeConnected ? 'Abrir panel de Stripe' : 'Completar onboarding'}
          </button>
        </article>
      </section>

      <section className="nv-card">
        <div className="nv-section-head" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="nv-h3">Difusión y compartidos</h2>
            <p className="nv-small nv-muted" style={{ marginTop: 6 }}>Rendimiento de los enlaces que comparten tus usuarios.</p>
          </div>
          <a href="/referrals" className="nv-btn nv-btn-secondary">Ver analítica completa</a>
        </div>
        <ul className="nv-list">
          {referralInsights.map((item) => (
            <li key={item} className="nv-item">
              <span className="nv-small" style={{ color: 'var(--nv-text-soft)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function QuickIcon({ name }) {
  const c = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'plus') return (<svg {...c}><path d="M12 5v14M5 12h14" /></svg>);
  if (name === 'gift') return (<svg {...c}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9M12 8S10 3 7.5 4.5 12 8 12 8Zm0 0s2-5 4.5-3.5S12 8 12 8Z" /></svg>);
  if (name === 'scan') return (<svg {...c}><path d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2M8 12h8" /></svg>);
  return (<svg {...c}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>);
}

export default function Page() {
  return (
    <Suspense fallback={<div className="nv-skeleton nv-skeleton-card" style={{ height: 200 }} />}>
      <DashboardInner />
    </Suspense>
  );
}
