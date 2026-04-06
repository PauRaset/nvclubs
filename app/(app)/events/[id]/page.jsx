'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { fetchEvent } from '@/lib/eventsApi';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [initial, setInitial] = useState(null);
  const [msg, setMsg] = useState('Cargando...');
  const [copied, setCopied] = useState(false);

  // --- Photos moderation (club) ---
  const API_BASE = 'https://api.nightvibe.life';
  const [showPhotos, setShowPhotos] = useState(false);
  const [photoTab, setPhotoTab] = useState('pending'); // pending | approved | rejected
  const [photos, setPhotos] = useState([]);
  const [photosMsg, setPhotosMsg] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('nv_token') ||
      localStorage.getItem('authToken') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const statusInfo = useMemo(() => {
    const startRaw = initial?.startAt || initial?.startDate || initial?.date || initial?.eventDate || initial?.startsAt;
    const endRaw = initial?.endAt || initial?.endDate || initial?.endsAt;
    const now = Date.now();
    const start = startRaw ? new Date(startRaw).getTime() : 0;
    const end = endRaw ? new Date(endRaw).getTime() : 0;

    if (end && end < now) return { key: 'past', label: 'Finalizado' };
    if (start && start < now && (!end || end >= now)) return { key: 'live', label: 'En curso' };
    if (start && start >= now) return { key: 'upcoming', label: 'Próximo' };
    return { key: 'draft', label: 'Sin fecha' };
  }, [initial]);

  const qrPayload = useMemo(() => {
    if (!initial?._id && !id) return '';
    const eventId = initial?._id || initial?.id || id;
    const qrToken = initial?.qrToken || '';
    return `NV_EVENT:${eventId}:${qrToken || 'pending'}`;
  }, [initial, id]);

  const qrImageUrl = useMemo(() => {
    if (!qrPayload) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(qrPayload)}`;
  }, [qrPayload]);

  const stats = useMemo(() => {
    const attendeeCount = Array.isArray(initial?.attendees) ? initial.attendees.length : 0;
    const ticketsSold = Number(initial?.ticketsSold || 0);
    const promotionsEnabled = !!initial?.promotionsEnabled;
    return { attendeeCount, ticketsSold, promotionsEnabled };
  }, [initial]);

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

    if (start && end) return `${start.toLocaleString('es-ES')} — ${end.toLocaleString('es-ES')}`;
    if (start) return start.toLocaleString('es-ES');
    return 'Fecha pendiente';
  }

  async function copyQrPayload() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  }

  async function apiJson(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        ...authHeaders,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      credentials: 'include',
    });

    const text = await res.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text;
    }

    if (!res.ok) {
      const message =
        (data && data.message) ||
        (typeof data === 'string' && data) ||
        `Error (HTTP ${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function loadModerationPhotos(tab = photoTab) {
    if (!id) return;
    setPhotosMsg('Cargando fotos...');
    try {
      const data = await apiJson(`${API_BASE}/api/events/${id}/photos/moderation?status=${tab}`);
      setPhotos(Array.isArray(data?.photos) ? data.photos : []);
      setPhotosMsg('');
    } catch (e) {
      setPhotos([]);
      setPhotosMsg(e?.message || 'Error cargando fotos');
    }
  }

  async function approvePhoto(photoId) {
    if (!id || !photoId) return;
    setPhotosMsg('Aprobando...');
    try {
      await apiJson(`${API_BASE}/api/events/${id}/photos/${photoId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewNote: reviewNote || '' }),
      });
      setSelectedPhoto(null);
      setReviewNote('');
      await loadModerationPhotos(photoTab);
    } catch (e) {
      setPhotosMsg(e?.message || 'Error aprobando');
    }
  }

  async function rejectPhoto(photoId) {
    if (!id || !photoId) return;
    setPhotosMsg('Rechazando...');
    try {
      await apiJson(`${API_BASE}/api/events/${id}/photos/${photoId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewNote: reviewNote || '' }),
      });
      setSelectedPhoto(null);
      setReviewNote('');
      await loadModerationPhotos(photoTab);
    } catch (e) {
      setPhotosMsg(e?.message || 'Error rechazando');
    }
  }

  async function deletePhoto(photoId) {
    if (!id || !photoId) return;
    if (!confirm('¿Eliminar esta foto definitivamente?')) return;
    setPhotosMsg('Eliminando...');
    try {
      await apiJson(`${API_BASE}/api/events/${id}/photos/${photoId}`, { method: 'DELETE' });
      setSelectedPhoto(null);
      setReviewNote('');
      await loadModerationPhotos(photoTab);
    } catch (e) {
      setPhotosMsg(e?.message || 'Error eliminando');
    }
  }

  useEffect(() => {
    (async () => {
      const r = await fetchEvent(id);
      if (!r.ok) return setMsg(r.data?.message || `Error (HTTP ${r.status})`);
      setInitial(r.data);
      setMsg('');
    })();
  }, [id]);

  useEffect(() => {
    if (!showPhotos) return;
    loadModerationPhotos(photoTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPhotos, photoTab, id]);

  const pageStyle = {
    padding: '28px 24px 44px',
    color: '#e5e7eb',
    background: 'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), #0b0f19',
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

  const panelStyle = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  };

  const primaryBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    padding: '0 16px',
    borderRadius: 14,
    background: '#00e5ff',
    color: '#001018',
    fontWeight: 800,
    textDecoration: 'none',
    border: '1px solid #00d4eb',
    cursor: 'pointer',
    boxShadow: '0 12px 32px rgba(0,229,255,0.22)',
    whiteSpace: 'nowrap',
  };

  const ghostBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    padding: '0 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb',
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: 700,
  };

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
                Edición del evento
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 900 }}>
                {initial?.title || 'Editar evento'}
              </h1>
              <p style={{ color: '#cbd5e1', lineHeight: 1.65, fontSize: 15, margin: '12px 0 0', maxWidth: 760 }}>
                Gestiona el evento, revisa su QR y controla la validación de fotos desde una única vista del panel de clubs.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => router.push('/events')} style={ghostBtn}>
                Volver
              </button>
              {initial && (
                <span
                  style={{
                    ...getStatusStyles(statusInfo.key),
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 44,
                    padding: '0 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusInfo.label}
                </span>
              )}
            </div>
          </section>

          {msg && !initial ? (
            <section style={panelStyle}>{msg}</section>
          ) : (
            <>
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                <article style={panelStyle}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Fecha</div>
                  <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.45 }}>{formatDateRange(initial)}</div>
                </article>
                <article style={panelStyle}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Asistentes</div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{stats.attendeeCount}</div>
                </article>
                <article style={panelStyle}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Entradas vendidas</div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{stats.ticketsSold}</div>
                </article>
                <article style={panelStyle}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Promociones</div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{stats.promotionsEnabled ? 'Activadas' : 'No activadas'}</div>
                </article>
              </section>

              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                <section style={panelStyle}>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>Formulario del evento</div>
                    <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                      Edita los campos principales del evento y guarda cambios cuando termines.
                    </div>
                  </div>

                  <EventForm
                    mode="edit"
                    initial={initial}
                    onSaved={() => router.push('/events')}
                  />
                </section>

                <aside style={{ display: 'grid', gap: 20 }}>
                  <section style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>QR del evento</div>
                        <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                          Este QR ya queda preparado para descargar, imprimir o usarlo como base en misiones y accesos.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,229,255,0.05))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'grid',
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 18,
                          background: '#fff',
                          overflow: 'hidden',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {qrImageUrl ? (
                          <img src={qrImageUrl} alt="QR evento" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ color: '#111827', fontWeight: 700 }}>QR pendiente</div>
                        )}
                      </div>

                      <div>
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Token QR</div>
                        <div style={{ color: '#e5e7eb', fontSize: 13, lineHeight: 1.55, wordBreak: 'break-all' }}>
                          {initial?.qrToken || 'Aún no disponible'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Payload actual</div>
                        <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.55, wordBreak: 'break-all' }}>
                          {qrPayload || 'Pendiente'}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button type="button" onClick={copyQrPayload} style={ghostBtn}>
                          {copied ? 'Copiado' : 'Copiar payload'}
                        </button>
                        <a
                          href={qrImageUrl || '#'}
                          download={`nightvibe-qr-${initial?._id || id}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...primaryBtn,
                            opacity: qrImageUrl ? 1 : 0.45,
                            pointerEvents: qrImageUrl ? 'auto' : 'none',
                          }}
                        >
                          Descargar QR
                        </a>
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: 'rgba(0,229,255,0.06)',
                          border: '1px solid rgba(0,229,255,0.12)',
                          color: '#cbd5e1',
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        Este QR se genera en frontend usando el <strong>qrToken</strong> del evento. Más adelante, si quieres, podemos mover la generación a backend o añadir impresión directa.
                      </div>
                    </div>
                  </section>

                  <section style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <h2 style={{ fontSize: 18, margin: 0 }}>Validación de fotos</h2>
                        <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                          Revisa el contenido subido por asistentes y modera según la misión o contexto del evento.
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPhotos((v) => !v)}
                        style={{
                          ...ghostBtn,
                          background: showPhotos ? '#111827' : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        {showPhotos ? 'Cerrar' : 'Abrir'}
                      </button>
                    </div>

                    {showPhotos && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {[
                            { key: 'pending', label: 'Pendientes' },
                            { key: 'approved', label: 'Aprobadas' },
                            { key: 'rejected', label: 'Rechazadas' },
                          ].map((t) => (
                            <button
                              key={t.key}
                              onClick={() => setPhotoTab(t.key)}
                              style={{
                                ...ghostBtn,
                                minHeight: 42,
                                padding: '0 12px',
                                background: photoTab === t.key ? '#111827' : 'rgba(255,255,255,0.03)',
                              }}
                            >
                              {t.label}
                            </button>
                          ))}

                          <button
                            onClick={() => loadModerationPhotos(photoTab)}
                            style={{
                              ...ghostBtn,
                              marginLeft: 'auto',
                              minHeight: 42,
                              padding: '0 12px',
                            }}
                          >
                            ↻ Recargar
                          </button>
                        </div>

                        {photosMsg && <p style={{ marginTop: 10, opacity: 0.85 }}>{photosMsg}</p>}

                        {!photosMsg && photos.length === 0 && (
                          <p style={{ marginTop: 10, opacity: 0.75 }}>No hay fotos en esta pestaña.</p>
                        )}

                        {photos.length > 0 && (
                          <div
                            style={{
                              marginTop: 12,
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                              gap: 12,
                            }}
                          >
                            {photos.map((p) => (
                              <button
                                key={p.photoId}
                                onClick={() => {
                                  setSelectedPhoto(p);
                                  setReviewNote(p.reviewNote || '');
                                }}
                                style={{
                                  textAlign: 'left',
                                  border: '1px solid rgba(255,255,255,0.10)',
                                  borderRadius: 16,
                                  overflow: 'hidden',
                                  background: 'rgba(255,255,255,0.02)',
                                  color: '#e5e7eb',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ width: '100%', height: 180, background: 'rgba(255,255,255,0.03)' }}>
                                  <img
                                    src={p.url}
                                    alt="user photo"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy"
                                  />
                                </div>
                                <div style={{ padding: 10 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>@{p.byUsername || 'usuario'}</div>
                                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                    {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ''}
                                  </div>
                                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>Estado: {p.status}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </aside>
              </section>

              {selectedPhoto && (
                <div
                  onClick={() => setSelectedPhoto(null)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    zIndex: 50,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 'min(980px, 100%)',
                      background: '#0b0f19',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 18,
                      overflow: 'hidden',
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1fr',
                    }}
                  >
                    <div style={{ background: '#020617' }}>
                      <img
                        src={selectedPhoto.url}
                        alt="selected"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>@{selectedPhoto.byUsername || 'usuario'}</div>

                      <label style={{ fontSize: 12, opacity: 0.75 }}>Nota (opcional)</label>
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 12,
                          padding: 10,
                          background: 'rgba(255,255,255,0.03)',
                          color: '#e5e7eb',
                        }}
                      />

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        {selectedPhoto.status !== 'approved' && (
                          <button
                            onClick={() => approvePhoto(selectedPhoto.photoId)}
                            style={{
                              ...ghostBtn,
                              background: '#111827',
                            }}
                          >
                            ✅ Aprobar
                          </button>
                        )}

                        {selectedPhoto.status !== 'rejected' && (
                          <button
                            onClick={() => rejectPhoto(selectedPhoto.photoId)}
                            style={ghostBtn}
                          >
                            ❌ Rechazar
                          </button>
                        )}

                        <button
                          onClick={() => deletePhoto(selectedPhoto.photoId)}
                          style={{
                            marginLeft: 'auto',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid rgba(239,68,68,0.55)',
                            background: 'transparent',
                            color: '#fca5a5',
                            cursor: 'pointer',
                          }}
                        >
                          🗑 Eliminar
                        </button>
                      </div>

                      <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.65 }}>photoId: {selectedPhoto.photoId}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </RequireClub>
  );
}
