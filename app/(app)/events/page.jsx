'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { fetchEvents, deleteEvent } from '@/lib/eventsApi';
import { toast, confirmDialog } from '@/components/Toast';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    setLoading(true);
    setMsg('');
    const r = await fetchEvents();
    if (!r.ok) {
      setEvents([]);
      setMsg(r.data?.message || `No se pudieron cargar los eventos (HTTP ${r.status})`);
      setLoading(false);
      return;
    }
    setEvents(Array.isArray(r.data) ? r.data : []);
    setMsg('');
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id) {
    const ok = await confirmDialog({
      title: '¿Eliminar este evento?',
      message: 'Esta acción no se puede deshacer. El evento dejará de estar disponible.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(id);
    const r = await deleteEvent(id);
    if (!r.ok) {
      setDeletingId('');
      toast.error(r.data?.message || `No se pudo eliminar (HTTP ${r.status})`);
      return;
    }
    await load();
    setDeletingId('');
    toast.success('Evento eliminado correctamente.');
  }

  function getEventTimestamp(ev) {
    const raw = ev?.startAt || ev?.startDate || ev?.date || ev?.eventDate || ev?.startsAt;
    const ts = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  }

  function getEventStatus(ev) {
    const now = Date.now();
    const start = getEventTimestamp(ev);
    const endRaw = ev?.endAt || ev?.endDate || ev?.endsAt;
    const end = endRaw ? new Date(endRaw).getTime() : 0;

    if (end && end < now) {
      return { key: 'past', label: 'Finalizado', badge: 'nv-badge-neutral' };
    }

    if (start && start < now && (!end || end >= now)) {
      return { key: 'live', label: 'En curso', badge: 'nv-badge-success' };
    }

    if (start && start >= now) {
      return { key: 'upcoming', label: 'Próximo', badge: 'nv-badge' };
    }

    return { key: 'draft', label: 'Sin fecha', badge: 'nv-badge-warn' };
  }

  function formatDateRange(ev) {
    const startRaw = ev?.startAt || ev?.startDate || ev?.date || ev?.eventDate || ev?.startsAt;
    const endRaw = ev?.endAt || ev?.endDate || ev?.endsAt;

    const start = startRaw ? new Date(startRaw) : null;
    const end = endRaw ? new Date(endRaw) : null;

    const sameDay = start && end && start.toDateString() === end.toDateString();

    if (start && end && sameDay) {
      return `${start.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} · ${start.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${end.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    if (start && end) {
      return `${start.toLocaleString('es-ES')} — ${end.toLocaleString('es-ES')}`;
    }

    if (start) {
      return start.toLocaleString('es-ES');
    }

    return 'Fecha pendiente';
  }

  const sortedEvents = useMemo(() => {
    return [...(events || [])].sort((a, b) => {
      const aTs = getEventTimestamp(a);
      const bTs = getEventTimestamp(b);
      return bTs - aTs;
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();

    return sortedEvents.filter((ev) => {
      const title = String(ev?.title || '').toLowerCase();
      const city = String(ev?.city || ev?.location || '').toLowerCase();
      const status = getEventStatus(ev).key;

      const matchesQuery = !term || title.includes(term) || city.includes(term);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'upcoming' && (status === 'upcoming' || status === 'live')) ||
        (filter === 'past' && status === 'past') ||
        (filter === 'draft' && status === 'draft');

      return matchesQuery && matchesFilter;
    });
  }, [sortedEvents, query, filter]);

  const counts = useMemo(() => {
    return (events || []).reduce(
      (acc, ev) => {
        const status = getEventStatus(ev).key;
        acc.all += 1;
        if (status === 'upcoming' || status === 'live') acc.upcoming += 1;
        if (status === 'past') acc.past += 1;
        if (status === 'draft') acc.draft += 1;
        return acc;
      },
      { all: 0, upcoming: 0, past: 0, draft: 0 }
    );
  }, [events]);

  const filterTabs = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'upcoming', label: 'Próximos', count: counts.upcoming },
    { key: 'past', label: 'Pasados', count: counts.past },
    { key: 'draft', label: 'Sin fecha', count: counts.draft },
  ];

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Gestión de eventos</span>
            <h1 className="nv-h1" style={{ marginTop: 10 }}>Tus eventos</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 560 }}>
              Consulta, filtra y organiza todos los eventos de tu club.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a href="/events/new" className="nv-btn nv-btn-primary">+ Crear evento</a>
          </div>
        </section>

        <section className="nv-card">
          <div className="nv-toolbar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ciudad"
              className="nv-input"
              aria-label="Buscar eventos"
            />
            <div className="nv-seg" role="tablist" aria-label="Filtrar por estado">
              {filterTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  className={`nv-seg-btn ${filter === item.key ? 'is-active' : ''}`}
                >
                  {item.label}
                  <span className="nv-seg-count">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading && (
          <section style={{ display: 'grid', gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="nv-card nv-event-card">
                <div className="nv-skeleton" style={{ width: '100%', aspectRatio: '16 / 10', borderRadius: 16 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '55%' }} />
                  <div className="nv-skeleton nv-skeleton-line" style={{ width: '35%' }} />
                  <div className="nv-skeleton nv-skeleton-line" style={{ width: '25%' }} />
                </div>
                <div className="nv-event-actions">
                  <div className="nv-skeleton" style={{ height: 44, borderRadius: 12 }} />
                  <div className="nv-skeleton" style={{ height: 44, borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && msg && (
          <div className="nv-notice nv-notice-error" role="alert">{msg}</div>
        )}

        {!loading && !msg && filteredEvents.length === 0 && (
          <section className="nv-card">
            <div className="nv-empty">
              <div className="nv-empty-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="nv-empty-title">No hay eventos en esta vista</div>
              <div className="nv-empty-text">
                {counts.all === 0
                  ? 'Todavía no has creado ningún evento. Crea el primero para empezar.'
                  : 'No se han encontrado eventos con los filtros actuales. Prueba con otra búsqueda.'}
              </div>
              <a href="/events/new" className="nv-btn nv-btn-primary" style={{ marginTop: 6 }}>+ Crear evento</a>
            </div>
          </section>
        )}

        {!loading && !msg && filteredEvents.length > 0 && (
          <section className="nv-stagger" style={{ display: 'grid', gap: 16 }}>
            {filteredEvents.map((ev) => {
              const id = ev._id || ev.id;
              const status = getEventStatus(ev);
              const cover = ev.heroImage || ev.image || ev.coverImage || ev.poster || '';
              const city = ev.city || ev.location || ev.venue || 'Ubicación pendiente';

              return (
                <article key={id} className="nv-card nv-event-card">
                  <div className={`nv-thumb ${cover ? 'nv-cover' : ''}`}>
                    {cover ? (
                      <img src={cover} alt={`Portada de ${ev.title || 'evento'}`} />
                    ) : (
                      <span className="nv-thumb-empty">Sin imagen</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="nv-row" style={{ gap: 10 }}>
                      <h2 className="nv-h3 nv-truncate" style={{ fontSize: 22, minWidth: 0 }}>
                        {ev.title || 'Evento sin título'}
                      </h2>
                      <span className={status.badge}>{status.label}</span>
                    </div>

                    <div className="nv-metas" style={{ marginTop: 12 }}>
                      <span className="nv-meta">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
                        </svg>
                        {formatDateRange(ev)}
                      </span>
                      <span className="nv-meta">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {city}
                      </span>
                      {ev.category && (
                        <span className="nv-badge-neutral nv-badge">{ev.category}</span>
                      )}
                    </div>
                  </div>

                  <div className="nv-event-actions">
                    <a href={`/events/${id}`} className="nv-btn nv-btn-ghost">Ver / Editar</a>
                    <button
                      type="button"
                      onClick={() => onDelete(id)}
                      disabled={deletingId === id}
                      className="nv-btn nv-btn-danger"
                    >
                      {deletingId === id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </RequireClub>
  );
}
