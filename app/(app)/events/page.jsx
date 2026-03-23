'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { fetchEvents, deleteEvent } from '@/lib/eventsApi';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState('Cargando...');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    setLoading(true);
    setMsg('Cargando...');
    const r = await fetchEvents();
    if (!r.ok) {
      setEvents([]);
      setMsg(r.data?.message || `Error (HTTP ${r.status})`);
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
    if (!confirm('¿Eliminar este evento?')) return;
    setDeletingId(id);
    const r = await deleteEvent(id);
    if (!r.ok) {
      setDeletingId('');
      alert(r.data?.message || `Error (HTTP ${r.status})`);
      return;
    }
    await load();
    setDeletingId('');
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
      return { key: 'past', label: 'Finalizado' };
    }

    if (start && start < now && (!end || end >= now)) {
      return { key: 'live', label: 'En curso' };
    }

    if (start && start >= now) {
      return { key: 'upcoming', label: 'Próximo' };
    }

    return { key: 'draft', label: 'Sin fecha' };
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

  const pageStyle = {
    padding: '28px 24px 40px',
    color: '#e5e7eb',
    background:
      'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), #0b0f19',
    minHeight: '100vh',
  };

  const shellStyle = {
    width: '100%',
    maxWidth: 1280,
    margin: '0 auto',
    display: 'grid',
    gap: 22,
  };

  const heroStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) auto',
    gap: 18,
    alignItems: 'center',
    padding: 26,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(15,22,41,0.96))',
    border: '1px solid rgba(0,229,255,0.18)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
  };

  const titleStyle = {
    margin: 0,
    fontSize: 'clamp(28px, 4vw, 42px)',
    lineHeight: 1.02,
    letterSpacing: '-0.03em',
    fontWeight: 900,
  };

  const mutedStyle = {
    color: '#cbd5e1',
    lineHeight: 1.65,
    fontSize: 15,
  };

  const primaryBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '0 18px',
    borderRadius: 14,
    background: '#00e5ff',
    color: '#001018',
    fontWeight: 800,
    textDecoration: 'none',
    border: '1px solid #00d4eb',
    boxShadow: '0 12px 32px rgba(0,229,255,0.22)',
    whiteSpace: 'nowrap',
  };

  const panelStyle = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  };

  const toolbarStyle = {
    ...panelStyle,
    display: 'grid',
    gap: 16,
  };

  const filterRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  };

  const statGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  };

  const statCardStyle = {
    padding: 16,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  };

  const listStyle = {
    display: 'grid',
    gap: 16,
  };

  function getStatusStyles(key) {
    if (key === 'live') {
      return {
        background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.24)',
        color: '#86efac',
      };
    }
    if (key === 'upcoming') {
      return {
        background: 'rgba(0,229,255,0.08)',
        border: '1px solid rgba(0,229,255,0.18)',
        color: '#67e8f9',
      };
    }
    if (key === 'past') {
      return {
        background: 'rgba(148,163,184,0.08)',
        border: '1px solid rgba(148,163,184,0.18)',
        color: '#cbd5e1',
      };
    }
    return {
      background: 'rgba(250,204,21,0.08)',
      border: '1px solid rgba(250,204,21,0.18)',
      color: '#fde68a',
    };
  }

  return (
    <RequireClub>
      <main style={pageStyle}>
        <div style={shellStyle}>
          <section style={heroStyle}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,229,255,0.2)',
                  background: 'rgba(0,229,255,0.08)',
                  color: '#7dd3fc',
                  fontWeight: 800,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                Gestión de eventos
              </div>
              <h1 style={titleStyle}>Tus eventos</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Gestiona tus eventos desde un panel más visual y profesional. Aquí podrás ver el
                listado completo, filtrar por estado y mantener una mejor organización del club.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/events/new" style={primaryBtn}>
                + Crear evento
              </a>
            </div>
          </section>

          <section style={statGridStyle}>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Total</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{counts.all}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Eventos detectados</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Próximos</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{counts.upcoming}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Eventos futuros o en curso</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Finalizados</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{counts.past}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Eventos ya celebrados</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Sin fecha</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{counts.draft}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Pendientes de completar</div>
            </article>
          </section>

          <section style={toolbarStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Explorar eventos</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
                  Busca por nombre o ubicación y filtra el estado del evento.
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>
                Mostrando {filteredEvents.length} de {events.length}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o ciudad"
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#e5e7eb',
                  padding: '0 14px',
                  outline: 'none',
                  fontSize: 14,
                }}
              />

              <div style={filterRowStyle}>
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'upcoming', label: 'Próximos' },
                  { key: 'past', label: 'Pasados' },
                  { key: 'draft', label: 'Sin fecha' },
                ].map((item) => {
                  const active = filter === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      style={{
                        minHeight: 42,
                        padding: '0 14px',
                        borderRadius: 12,
                        border: active
                          ? '1px solid rgba(0,229,255,0.26)'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: active ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
                        color: active ? '#7dd3fc' : '#cbd5e1',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {loading && <div style={panelStyle}>{msg}</div>}
          {!loading && msg && <div style={panelStyle}>{msg}</div>}

          {!loading && !msg && filteredEvents.length === 0 && (
            <section style={{ ...panelStyle, padding: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>No hay eventos en esta vista</div>
              <div style={{ ...mutedStyle, maxWidth: 620 }}>
                No se han encontrado eventos con los filtros actuales. Prueba con otra búsqueda o crea un nuevo evento.
              </div>
              <div style={{ marginTop: 18 }}>
                <a href="/events/new" style={primaryBtn}>
                  Crear evento
                </a>
              </div>
            </section>
          )}

          {!loading && !msg && filteredEvents.length > 0 && (
            <section style={listStyle}>
              {filteredEvents.map((ev) => {
                const id = ev._id || ev.id;
                const status = getEventStatus(ev);
                const statusStyle = getStatusStyles(status.key);
                const cover = ev.heroImage || ev.image || ev.coverImage || ev.poster || '';
                const city = ev.city || ev.location || ev.venue || 'Ubicación pendiente';

                return (
                  <article
                    key={id}
                    style={{
                      ...panelStyle,
                      padding: 18,
                      display: 'grid',
                      gridTemplateColumns: '180px minmax(0, 1fr) auto',
                      gap: 18,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '16 / 10',
                        borderRadius: 18,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background:
                          cover
                            ? '#0b0f19'
                            : 'linear-gradient(135deg, rgba(0,229,255,0.14), rgba(255,255,255,0.03))',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={ev.title || 'Evento'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ color: '#7dd3fc', fontWeight: 800, fontSize: 14 }}>Sin imagen</div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 24,
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            minWidth: 0,
                          }}
                        >
                          {ev.title || 'Evento sin título'}
                        </h2>
                        <span
                          style={{
                            ...statusStyle,
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 32,
                            padding: '0 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                        {formatDateRange(ev)}
                      </div>

                      <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 14 }}>{city}</div>

                      <div
                        style={{
                          marginTop: 16,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            fontSize: 13,
                            color: '#cbd5e1',
                          }}
                        >
                          ID: {id}
                        </div>
                        {ev.category && (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: 14,
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              fontSize: 13,
                              color: '#cbd5e1',
                            }}
                          >
                            Categoría: {ev.category}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 10,
                        justifyItems: 'stretch',
                        minWidth: 150,
                      }}
                    >
                      <a
                        href={`/events/${id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 44,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e5e7eb',
                          textDecoration: 'none',
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        Ver / Editar
                      </a>
                      <button
                        onClick={() => onDelete(id)}
                        disabled={deletingId === id}
                        style={{
                          minHeight: 44,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,107,129,0.22)',
                          background: 'rgba(255,107,129,0.06)',
                          color: '#ff8ea1',
                          fontWeight: 700,
                          cursor: deletingId === id ? 'not-allowed' : 'pointer',
                          opacity: deletingId === id ? 0.6 : 1,
                        }}
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
      </main>
    </RequireClub>
  );
}
