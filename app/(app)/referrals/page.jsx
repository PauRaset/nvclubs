'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nightvibe.life').replace(/\/$/, '');

function getToken() {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('nv_token') ||
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('authToken') ||
    window.localStorage.getItem('clubToken') ||
    ''
  );
}


async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function extractClubId(payload) {
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload?.club?._id,
    payload?.club?.id,
    payload?.clubId,
    payload?._id,
    payload?.id,
    payload?.user?.club?._id,
    payload?.user?.club?.id,
    payload?.user?.clubId,
    payload?.user?._id,
    payload?.user?.id,
  ];

  for (const value of candidates) {
    const text = String(value || '').trim();
    if (text) return text;
  }

  if (typeof window !== 'undefined') {
    const fromStorage =
      window.localStorage.getItem('clubId') ||
      window.localStorage.getItem('currentClubId') ||
      window.localStorage.getItem('club_id') ||
      '';
    if (fromStorage.trim()) return fromStorage.trim();
  }

  return '';
}

async function resolveCurrentClubId() {
  const attempts = ['/api/clubs/me', '/api/auth/me'];
  let lastError = null;

  for (const path of attempts) {
    try {
      const data = await apiGet(path);
      const clubId = extractClubId(data);
      if (clubId) return clubId;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo identificar el club actual');
}

function formatInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString('es-ES') : '0';
}

function formatEUR(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function resolveMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;

  return `${API_BASE}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function Avatar({ src, name }) {
  const resolvedSrc = resolveMediaUrl(src);

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={name || 'avatar'}
        style={{ height: 40, width: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--nv-border)', flex: '0 0 auto' }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 40,
        width: 40,
        flex: '0 0 auto',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'var(--nv-accent-soft)',
        border: '1px solid var(--nv-accent-border)',
        color: 'var(--nv-accent)',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <article className="nv-kpi">
      <div className="nv-kpi-label">{label}</div>
      <div className="nv-kpi-value">{value}</div>
      {hint ? <div className="nv-kpi-help">{hint}</div> : null}
    </article>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="nv-card">
      <div className="nv-section-head" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="nv-h3">{title}</h2>
          {subtitle ? <p className="nv-small nv-muted" style={{ marginTop: 6, maxWidth: 520 }}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const TABLE_WRAP = { border: '1px solid var(--nv-border)', borderRadius: 'var(--nv-r)', overflow: 'hidden' };
const HEAD_CELL = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--nv-muted)' };
const twoColGrid = { display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' };

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clubId, setClubId] = useState('');
  const [summary, setSummary] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventDetail, setEventDetail] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError('');
      try {
        const resolvedClubId = await resolveCurrentClubId();

        if (cancelled) return;
        setClubId(String(resolvedClubId));

        const data = await apiGet(`/api/referrals/club/${encodeURIComponent(String(resolvedClubId))}/summary`);
        if (cancelled) return;

        setSummary(data || null);

        const firstEventId =
          data?.topEvents?.[0]?.eventId ||
          data?.events?.[0]?.eventId ||
          data?.eventStats?.[0]?.eventId ||
          '';

        if (firstEventId) {
          setSelectedEventId(String(firstEventId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message === 'Unauthorized' ? 'No autorizado. Inicia sesión de nuevo en el panel del club.' : (err?.message || 'No se pudo cargar la analítica de difusión o resolver el club actual'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEventDetail() {
      if (!clubId || !selectedEventId) {
        setEventDetail(null);
        return;
      }

      setEventLoading(true);
      try {
        const data = await apiGet(
          `/api/referrals/club/${encodeURIComponent(clubId)}/event/${encodeURIComponent(selectedEventId)}`
        );
        if (!cancelled) setEventDetail(data || null);
      } catch (err) {
        if (!cancelled) {
          setEventDetail(null);
        }
      } finally {
        if (!cancelled) setEventLoading(false);
      }
    }

    loadEventDetail();
    return () => {
      cancelled = true;
    };
  }, [clubId, selectedEventId]);

  const totals = useMemo(() => {
    const source = summary || {};
    return {
      clicks: source.totalClicks ?? source.clicks ?? 0,
      uniqueClicks: source.totalUniqueClicks ?? source.uniqueClicks ?? 0,
      links: source.totalLinks ?? source.links ?? 0,
      orders: source.totalOrders ?? source.orders ?? 0,
      tickets: source.totalTickets ?? source.tickets ?? 0,
      revenueEUR: source.totalRevenueEUR ?? source.revenueEUR ?? 0,
    };
  }, [summary]);

  const topUsers = useMemo(() => {
    return summary?.topUsers || summary?.users || [];
  }, [summary]);

  const topEvents = useMemo(() => {
    return summary?.topEvents || summary?.events || [];
  }, [summary]);

  const channels = useMemo(() => {
    return summary?.byChannel || summary?.channels || [];
  }, [summary]);

  const eventRows = useMemo(() => {
    return eventDetail?.rows || eventDetail?.users || eventDetail?.items || [];
  }, [eventDetail]);

  const usersCols = 'minmax(0,1.7fr) 0.7fr 0.7fr 0.7fr 0.8fr';
  const detailCols = 'minmax(0,1.45fr) 0.65fr 0.65fr 0.65fr 0.65fr 0.8fr';

  return (
    <div className="nv-views">
      <section className="nv-hero nv-hero-split nv-animate-in">
        <div>
          <span className="nv-eyebrow">Difusión</span>
          <h1 className="nv-h1" style={{ marginTop: 10 }}>Analítica de compartidos</h1>
          <p className="nv-lead" style={{ marginTop: 10, maxWidth: 620 }}>
            Aquí puedes ver qué usuarios están trayendo tráfico a tus eventos, qué eventos se comparten más y qué canales generan más movimiento.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Link href="/dashboard" className="nv-btn nv-btn-ghost">Volver al dashboard</Link>
        </div>
      </section>

      {loading ? (
        <>
          <section className="nv-grid-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="nv-kpi">
                <div className="nv-skeleton nv-skeleton-line" style={{ width: '50%' }} />
                <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '70%', marginTop: 14 }} />
              </div>
            ))}
          </section>
          <div className="nv-skeleton" style={{ height: 280, borderRadius: 'var(--nv-r-lg)' }} />
        </>
      ) : error ? (
        <div className="nv-notice nv-notice-error" role="alert">{error}</div>
      ) : (
        <>
          <section className="nv-grid-auto nv-stagger">
            <StatCard label="Clicks" value={formatInt(totals.clicks)} hint="Total de visitas desde links compartidos" />
            <StatCard label="Clicks únicos" value={formatInt(totals.uniqueClicks)} hint="Usuarios únicos aproximados" />
            <StatCard label="Links creados" value={formatInt(totals.links)} hint="Total de enlaces generados" />
            <StatCard label="Pedidos" value={formatInt(totals.orders)} hint="Ventas atribuidas a links compartidos" />
            <StatCard label="Entradas" value={formatInt(totals.tickets)} hint="Tickets vendidos atribuidos" />
            <StatCard label="Revenue" value={formatEUR(totals.revenueEUR)} hint="Ingresos atribuidos a compartidos" />
          </section>

          <div style={twoColGrid}>
            <SectionCard
              title="Top usuarios que comparten"
              subtitle="Ranking de usuarios que más tráfico y ventas generan para el club."
            >
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 520, ...TABLE_WRAP }}>
                  <div style={{ display: 'grid', gridTemplateColumns: usersCols, gap: 12, padding: '12px 14px', background: 'var(--nv-bg-soft)' }}>
                    <div style={HEAD_CELL}>Usuario</div>
                    <div style={HEAD_CELL}>Clicks</div>
                    <div style={HEAD_CELL}>Únicos</div>
                    <div style={HEAD_CELL}>Pedidos</div>
                    <div style={HEAD_CELL}>Revenue</div>
                  </div>
                  {topUsers.length ? (
                    topUsers.map((user, index) => (
                      <div
                        key={`${user?.userId || user?.id || index}`}
                        style={{ display: 'grid', gridTemplateColumns: usersCols, gap: 12, padding: '12px 14px', borderTop: '1px solid var(--nv-border)', alignItems: 'center', fontSize: 14 }}
                      >
                        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
                          <Avatar
                            src={user?.user?.profilePicture || user?.profilePicture || user?.avatarUrl || ''}
                            name={user?.user?.username || user?.username || user?.name || 'Usuario'}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="nv-truncate" style={{ fontWeight: 700 }}>
                              {user?.user?.username || user?.username || user?.name || 'Usuario NightVibe'}
                            </div>
                            <div className="nv-small nv-muted nv-truncate">
                              {user?.channel || 'Compartidos NightVibe'}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(user?.clicks)}</div>
                        <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(user?.uniqueClicks)}</div>
                        <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(user?.orders)}</div>
                        <div className="nv-accent-text" style={{ fontWeight: 700 }}>{formatEUR(user?.revenueEUR)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="nv-small nv-muted" style={{ padding: '22px 14px', textAlign: 'center', borderTop: '1px solid var(--nv-border)' }}>
                      Todavía no hay datos de usuarios con tráfico compartido.
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Eventos con más difusión"
              subtitle="Qué eventos están generando más movimiento desde los links compartidos."
            >
              <div style={{ display: 'grid', gap: 12 }}>
                {topEvents.length ? (
                  topEvents.map((event, index) => {
                    const active = String(event?.eventId || '') === String(selectedEventId || '');
                    const cover = resolveMediaUrl(event?.coverImage);
                    return (
                      <button
                        key={`${event?.eventId || index}`}
                        type="button"
                        onClick={() => setSelectedEventId(String(event?.eventId || ''))}
                        className="nv-item"
                        style={{
                          textAlign: 'left',
                          borderColor: active ? 'var(--nv-accent-border)' : undefined,
                          background: active ? 'var(--nv-accent-soft)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <div style={{ height: 56, width: 56, flex: '0 0 auto', overflow: 'hidden', borderRadius: 14, border: '1px solid var(--nv-border)', background: 'var(--nv-bg-soft)', display: 'grid', placeItems: 'center' }}>
                            {cover ? (
                              <img
                                src={cover}
                                alt={event?.eventTitle || event?.title || 'Evento'}
                                style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span className="nv-accent-text" style={{ fontSize: 18, fontWeight: 800 }}>
                                {String(event?.eventTitle || event?.title || 'E').trim().charAt(0).toUpperCase() || 'E'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="nv-truncate" style={{ fontSize: 16, fontWeight: 700 }}>
                                {event?.eventTitle || event?.title || `Evento ${index + 1}`}
                              </div>
                              <div className="nv-small nv-muted" style={{ marginTop: 4 }}>
                                {formatInt(event?.clicks)} clicks · {formatInt(event?.uniqueClicks)} únicos
                              </div>
                              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <span className="nv-badge nv-badge-neutral">
                                  {formatInt(event?.links || event?.shareLinks || 0)} links
                                </span>
                                <span className="nv-badge">{formatEUR(event?.revenueEUR)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="nv-small nv-muted" style={{ padding: '22px 14px', textAlign: 'center', border: '1px solid var(--nv-border)', borderRadius: 'var(--nv-r)' }}>
                    Todavía no hay eventos con compartidos registrados.
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div style={twoColGrid}>
            <SectionCard
              title="Detalle del evento seleccionado"
              subtitle="Desglose por usuario del tráfico y ventas atribuidas al evento."
              action={
                selectedEventId ? (
                  <span className="nv-badge nv-badge-neutral">
                    {eventLoading ? 'Actualizando…' : 'Evento activo'}
                  </span>
                ) : null
              }
            >
              {selectedEventId ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 620, ...TABLE_WRAP }}>
                    <div style={{ display: 'grid', gridTemplateColumns: detailCols, gap: 12, padding: '12px 14px', background: 'var(--nv-bg-soft)' }}>
                      <div style={HEAD_CELL}>Usuario</div>
                      <div style={HEAD_CELL}>Links</div>
                      <div style={HEAD_CELL}>Clicks</div>
                      <div style={HEAD_CELL}>Únicos</div>
                      <div style={HEAD_CELL}>Pedidos</div>
                      <div style={HEAD_CELL}>Revenue</div>
                    </div>
                    {eventRows.length ? (
                      eventRows.map((row, index) => (
                        <div
                          key={`${row?.userId || row?.id || index}`}
                          style={{ display: 'grid', gridTemplateColumns: detailCols, gap: 12, padding: '12px 14px', borderTop: '1px solid var(--nv-border)', alignItems: 'center', fontSize: 14 }}
                        >
                          <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
                            <Avatar
                              src={row?.user?.profilePicture || row?.profilePicture || row?.avatarUrl || ''}
                              name={row?.user?.username || row?.username || row?.name || 'Usuario'}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div className="nv-truncate" style={{ fontWeight: 700 }}>
                                {row?.user?.username || row?.username || row?.name || 'Usuario NightVibe'}
                              </div>
                              <div className="nv-small nv-muted nv-truncate">
                                {row?.channel || 'Difusión NightVibe'}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(row?.links)}</div>
                          <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(row?.clicks)}</div>
                          <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(row?.uniqueClicks)}</div>
                          <div style={{ fontWeight: 600, color: 'var(--nv-text-soft)' }}>{formatInt(row?.orders)}</div>
                          <div className="nv-accent-text" style={{ fontWeight: 700 }}>{formatEUR(row?.revenueEUR)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="nv-small nv-muted" style={{ padding: '22px 14px', textAlign: 'center', borderTop: '1px solid var(--nv-border)' }}>
                        {eventLoading
                          ? 'Cargando detalle del evento…'
                          : 'Todavía no hay detalle de compartidos para este evento.'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="nv-small nv-muted" style={{ padding: '22px 14px', textAlign: 'center', border: '1px solid var(--nv-border)', borderRadius: 'var(--nv-r)' }}>
                  Selecciona un evento para ver el detalle completo.
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Canales de difusión"
              subtitle="Qué origen de compartido está generando más volumen."
            >
              <div style={{ display: 'grid', gap: 12 }}>
                {channels.length ? (
                  channels.map((item, index) => (
                    <div key={`${item?.channel || index}`} className="nv-item">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                            {item?.channel || 'app'}
                          </div>
                          <div className="nv-small nv-muted" style={{ marginTop: 4 }}>
                            {formatInt(item?.links)} links · {formatInt(item?.clicks)} clicks · {formatInt(item?.uniqueClicks)} únicos
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="nv-accent-text" style={{ fontWeight: 700 }}>{formatEUR(item?.revenueEUR)}</div>
                          <div className="nv-small nv-muted" style={{ marginTop: 4 }}>{formatInt(item?.orders)} pedidos</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="nv-small nv-muted" style={{ padding: '22px 14px', textAlign: 'center', border: '1px solid var(--nv-border)', borderRadius: 'var(--nv-r)' }}>
                    Todavía no hay suficientes datos por canal.
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
