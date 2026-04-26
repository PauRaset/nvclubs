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

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function Avatar({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-400/20">
      {initials(name)}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-sm font-medium text-white/55">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-white/45">{hint}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111624] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

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

  return (
    <main className="min-h-screen bg-[#0B0F18] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Difusión
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
              Analítica de compartidos
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Aquí puedes ver qué usuarios están trayendo tráfico a tus eventos, qué eventos se comparten más y qué canales generan más movimiento.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white"
          >
            Volver al dashboard
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111624] p-8 text-center text-white/60">
            Cargando analítica de difusión…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 text-center text-rose-100">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Clicks" value={formatInt(totals.clicks)} hint="Total de visitas desde links compartidos" />
              <StatCard label="Clicks únicos" value={formatInt(totals.uniqueClicks)} hint="Usuarios únicos aproximados" />
              <StatCard label="Links creados" value={formatInt(totals.links)} hint="Total de enlaces generados" />
              <StatCard label="Pedidos" value={formatInt(totals.orders)} hint="Ventas atribuidas a links compartidos" />
              <StatCard label="Entradas" value={formatInt(totals.tickets)} hint="Tickets vendidos atribuidos" />
              <StatCard label="Revenue" value={formatEUR(totals.revenueEUR)} hint="Ingresos atribuidos a compartidos" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard
                title="Top usuarios que comparten"
                subtitle="Ranking de usuarios que más tráfico y ventas generan para el club."
              >
                <div className="overflow-hidden rounded-2xl border border-white/8">
                  <div className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                    <div>Usuario</div>
                    <div>Clicks</div>
                    <div>Únicos</div>
                    <div>Pedidos</div>
                    <div>Revenue</div>
                  </div>
                  <div className="divide-y divide-white/6">
                    {topUsers.length ? (
                      topUsers.map((user, index) => (
                        <div
                          key={`${user?.userId || user?.id || index}`}
                          className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar src={user?.profilePicture || user?.avatarUrl || ''} name={user?.username || user?.name || 'Usuario'} />
                            <div className="min-w-0">
                              <div className="truncate font-bold text-white">
                                {user?.username || user?.name || 'Usuario NightVibe'}
                              </div>
                              <div className="truncate text-xs text-white/45">
                                {user?.channel || 'Compartidos NightVibe'}
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold text-white/85">{formatInt(user?.clicks)}</div>
                          <div className="font-semibold text-white/85">{formatInt(user?.uniqueClicks)}</div>
                          <div className="font-semibold text-white/85">{formatInt(user?.orders)}</div>
                          <div className="font-semibold text-cyan-300">{formatEUR(user?.revenueEUR)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-white/45">
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
                <div className="space-y-3">
                  {topEvents.length ? (
                    topEvents.map((event, index) => {
                      const active = String(event?.eventId || '') === String(selectedEventId || '');
                      return (
                        <button
                          key={`${event?.eventId || index}`}
                          type="button"
                          onClick={() => setSelectedEventId(String(event?.eventId || ''))}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? 'border-cyan-400/40 bg-cyan-400/10'
                              : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-white">
                                {event?.eventTitle || event?.title || `Evento ${index + 1}`}
                              </div>
                              <div className="mt-1 text-sm text-white/45">
                                {formatInt(event?.clicks)} clicks · {formatInt(event?.uniqueClicks)} únicos · {formatEUR(event?.revenueEUR)}
                              </div>
                            </div>
                            <div className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/70">
                              {formatInt(event?.links || event?.shareLinks || 0)} links
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
                      Todavía no hay eventos con compartidos registrados.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <SectionCard
                title="Detalle del evento seleccionado"
                subtitle="Desglose por usuario del tráfico y ventas atribuidas al evento."
                action={
                  selectedEventId ? (
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/65">
                      {eventLoading ? 'Actualizando…' : 'Evento activo'}
                    </span>
                  ) : null
                }
              >
                {selectedEventId ? (
                  <div className="overflow-hidden rounded-2xl border border-white/8">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_0.65fr_0.65fr_0.65fr_0.65fr_0.65fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                      <div>Usuario</div>
                      <div>Links</div>
                      <div>Clicks</div>
                      <div>Únicos</div>
                      <div>Pedidos</div>
                      <div>Revenue</div>
                    </div>
                    <div className="divide-y divide-white/6">
                      {eventRows.length ? (
                        eventRows.map((row, index) => (
                          <div
                            key={`${row?.userId || row?.id || index}`}
                            className="grid grid-cols-[minmax(0,1.4fr)_0.65fr_0.65fr_0.65fr_0.65fr_0.65fr] gap-3 px-4 py-3 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar src={row?.profilePicture || row?.avatarUrl || ''} name={row?.username || row?.name || 'Usuario'} />
                              <div className="min-w-0">
                                <div className="truncate font-bold text-white">
                                  {row?.username || row?.name || 'Usuario NightVibe'}
                                </div>
                                <div className="truncate text-xs text-white/45">
                                  {row?.channel || 'Difusión NightVibe'}
                                </div>
                              </div>
                            </div>
                            <div className="font-semibold text-white/85">{formatInt(row?.links)}</div>
                            <div className="font-semibold text-white/85">{formatInt(row?.clicks)}</div>
                            <div className="font-semibold text-white/85">{formatInt(row?.uniqueClicks)}</div>
                            <div className="font-semibold text-white/85">{formatInt(row?.orders)}</div>
                            <div className="font-semibold text-cyan-300">{formatEUR(row?.revenueEUR)}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-white/45">
                          {eventLoading
                            ? 'Cargando detalle del evento…'
                            : 'Todavía no hay detalle de compartidos para este evento.'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
                    Selecciona un evento para ver el detalle completo.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Canales de difusión"
                subtitle="Qué origen de compartido está generando más volumen."
              >
                <div className="space-y-3">
                  {channels.length ? (
                    channels.map((item, index) => (
                      <div
                        key={`${item?.channel || index}`}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold capitalize text-white">
                              {item?.channel || 'app'}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              {formatInt(item?.links)} links · {formatInt(item?.clicks)} clicks · {formatInt(item?.uniqueClicks)} únicos
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-cyan-300">{formatEUR(item?.revenueEUR)}</div>
                            <div className="mt-1 text-xs text-white/45">{formatInt(item?.orders)} pedidos</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
                      Todavía no hay suficientes datos por canal.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
