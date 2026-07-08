'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { fetchEvent } from '@/lib/eventsApi';
import { toast, confirmDialog } from '@/components/Toast';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [initial, setInitial] = useState(null);
  const [msg, setMsg] = useState('Cargando...');
  const [copied, setCopied] = useState(false);

  // --- Photos moderation (club) ---
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.nightvibe.life';
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

  function statusBadgeClass(key) {
    if (key === 'live') return 'nv-badge nv-badge-success';
    if (key === 'upcoming') return 'nv-badge';
    if (key === 'past') return 'nv-badge nv-badge-neutral';
    return 'nv-badge nv-badge-warn';
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
      toast.success('Payload del QR copiado.');
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      toast.error('No se pudo copiar el payload.');
    }
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
    const ok = await confirmDialog({
      title: '¿Eliminar esta foto?',
      message: 'Se eliminará definitivamente del evento.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
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

  // Distingue carga inicial de un error real de fetch (msg arranca en 'Cargando...')
  const errored = !initial && !!msg && msg !== 'Cargando...';
  const loadingInitial = !initial && !errored;

  return (
    <RequireClub>
      <div className="nv-views">
          <section className="nv-hero nv-hero-split nv-animate-in">
            <div style={{ minWidth: 0 }}>
              <span className="nv-eyebrow">Edición del evento</span>
              <h1 className="nv-h1 nv-truncate" style={{ marginTop: 10 }}>
                {initial?.title || 'Editar evento'}
              </h1>
              <p className="nv-lead" style={{ marginTop: 12, maxWidth: 640 }}>
                Gestiona el evento, revisa su QR y controla la validación de fotos desde una única vista del panel de clubs.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => router.push('/events')} className="nv-btn nv-btn-ghost">
                Volver
              </button>
              {initial && (
                <span className={statusBadgeClass(statusInfo.key)}>{statusInfo.label}</span>
              )}
            </div>
          </section>

          {errored ? (
            <div className="nv-notice nv-notice-error" role="alert">{msg}</div>
          ) : loadingInitial ? (
            <section className="nv-card" style={{ display: 'grid', gap: 12 }}>
              <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '45%' }} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="nv-skeleton" style={{ height: 90, borderRadius: 16 }} />
                ))}
              </div>
              <div className="nv-skeleton" style={{ height: 240, borderRadius: 16 }} />
            </section>
          ) : (
            <>
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                <article className="nv-kpi">
                  <div className="nv-kpi-label">Fecha</div>
                  <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.45 }}>{formatDateRange(initial)}</div>
                </article>
                <article className="nv-kpi">
                  <div className="nv-kpi-label">Asistentes</div>
                  <div className="nv-kpi-value">{stats.attendeeCount}</div>
                </article>
                <article className="nv-kpi">
                  <div className="nv-kpi-label">Entradas vendidas</div>
                  <div className="nv-kpi-value">{stats.ticketsSold}</div>
                </article>
                <article className="nv-kpi">
                  <div className="nv-kpi-label">Promociones</div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{stats.promotionsEnabled ? 'Activadas' : 'No activadas'}</div>
                </article>
              </section>

              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                <section className="nv-card">
                  <div style={{ marginBottom: 18 }}>
                    <h2 className="nv-h3">Formulario del evento</h2>
                    <p className="nv-small nv-muted" style={{ marginTop: 8 }}>
                      Edita los campos principales del evento y guarda cambios cuando termines.
                    </p>
                  </div>

                  <EventForm
                    mode="edit"
                    initial={initial}
                    onSaved={() => router.push('/events')}
                  />
                </section>

                <aside style={{ display: 'grid', gap: 20 }}>
                  <section className="nv-card">
                    <div style={{ marginBottom: 14 }}>
                      <h2 className="nv-h3">QR del evento</h2>
                      <p className="nv-small nv-muted" style={{ marginTop: 6 }}>
                        Descárgalo o imprímelo para el control de accesos del evento.
                      </p>
                    </div>

                    <div className="nv-card-soft" style={{ display: 'grid', gap: 14 }}>
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 'var(--nv-r)',
                          background: '#fff',
                          overflow: 'hidden',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {qrImageUrl ? (
                          <img src={qrImageUrl} alt="QR evento" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ color: 'var(--nv-ink)', fontWeight: 700 }}>QR pendiente</div>
                        )}
                      </div>

                      <div>
                        <div className="nv-small" style={{ color: 'var(--nv-muted)', fontWeight: 700, marginBottom: 6 }}>Token QR</div>
                        <div className="nv-small" style={{ wordBreak: 'break-all' }}>
                          {initial?.qrToken || 'Aún no disponible'}
                        </div>
                      </div>

                      <div>
                        <div className="nv-small" style={{ color: 'var(--nv-muted)', fontWeight: 700, marginBottom: 6 }}>Payload actual</div>
                        <div className="nv-small nv-muted" style={{ wordBreak: 'break-all' }}>
                          {qrPayload || 'Pendiente'}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button type="button" onClick={copyQrPayload} className="nv-btn nv-btn-ghost">
                          {copied ? 'Copiado' : 'Copiar payload'}
                        </button>
                        <a
                          href={qrImageUrl || '#'}
                          download={`nightvibe-qr-${initial?._id || id}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nv-btn nv-btn-primary"
                          style={{
                            opacity: qrImageUrl ? 1 : 0.45,
                            pointerEvents: qrImageUrl ? 'auto' : 'none',
                          }}
                        >
                          Descargar QR
                        </a>
                      </div>
                    </div>
                  </section>

                  <section className="nv-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <h2 className="nv-h3">Validación de fotos</h2>
                        <p className="nv-small nv-muted" style={{ marginTop: 6 }}>
                          Revisa el contenido subido por asistentes y modéralo según el contexto del evento.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPhotos((v) => !v)}
                        className="nv-btn nv-btn-ghost"
                      >
                        {showPhotos ? 'Cerrar' : 'Abrir'}
                      </button>
                    </div>

                    {showPhotos && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div className="nv-seg" role="tablist" aria-label="Filtrar fotos por estado">
                            {[
                              { key: 'pending', label: 'Pendientes' },
                              { key: 'approved', label: 'Aprobadas' },
                              { key: 'rejected', label: 'Rechazadas' },
                            ].map((t) => (
                              <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={photoTab === t.key}
                                onClick={() => setPhotoTab(t.key)}
                                className={`nv-seg-btn ${photoTab === t.key ? 'is-active' : ''}`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => loadModerationPhotos(photoTab)}
                            className="nv-btn nv-btn-ghost"
                            style={{ marginLeft: 'auto' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
                            </svg>
                            Recargar
                          </button>
                        </div>

                        {photosMsg && (
                          <div className="nv-notice nv-notice-info" style={{ marginTop: 12 }}>{photosMsg}</div>
                        )}

                        {!photosMsg && photos.length === 0 && (
                          <div className="nv-empty">
                            <div className="nv-empty-title" style={{ fontSize: 'var(--nv-fs-md)' }}>No hay fotos en esta pestaña</div>
                            <div className="nv-empty-text">Cambia de pestaña o recarga para ver contenido nuevo.</div>
                          </div>
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
                                type="button"
                                onClick={() => {
                                  setSelectedPhoto(p);
                                  setReviewNote(p.reviewNote || '');
                                }}
                                className="nv-item"
                                style={{
                                  textAlign: 'left',
                                  padding: 0,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ width: '100%', height: 180, background: 'var(--nv-bg-soft)' }}>
                                  <img
                                    src={p.url}
                                    alt="Foto subida por asistente"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy"
                                  />
                                </div>
                                <div style={{ padding: 10 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>@{p.byUsername || 'usuario'}</div>
                                  <div className="nv-small nv-muted" style={{ marginTop: 2 }}>
                                    {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ''}
                                  </div>
                                  <div className="nv-small nv-muted" style={{ marginTop: 6 }}>Estado: {p.status}</div>
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
                  className="nv-confirm-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Moderación de foto"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="nv-card"
                    style={{
                      width: 'min(980px, 100%)',
                      maxHeight: '88vh',
                      padding: 0,
                      overflow: 'auto',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                    }}
                  >
                    <div style={{ background: 'var(--nv-ink)' }}>
                      <img
                        src={selectedPhoto.url}
                        alt="Foto seleccionada"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="nv-h4">@{selectedPhoto.byUsername || 'usuario'}</div>

                      <div>
                        <label className="nv-label" htmlFor="nv-review-note">Nota (opcional)</label>
                        <textarea
                          id="nv-review-note"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={4}
                          className="nv-textarea"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                        {selectedPhoto.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => approvePhoto(selectedPhoto.photoId)}
                            className="nv-btn nv-btn-primary"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Aprobar
                          </button>
                        )}

                        {selectedPhoto.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => rejectPhoto(selectedPhoto.photoId)}
                            className="nv-btn nv-btn-ghost"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                            Rechazar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deletePhoto(selectedPhoto.photoId)}
                          className="nv-btn nv-btn-danger"
                          style={{ marginLeft: 'auto' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </RequireClub>
  );
}
