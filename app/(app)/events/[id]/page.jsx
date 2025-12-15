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

  async function apiJson(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        ...authHeaders,
        // Only set JSON content-type when we send JSON
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
      setInitial(r.data); setMsg('');
    })();
  }, [id]);

  useEffect(() => {
    if (!showPhotos) return;
    loadModerationPhotos(photoTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPhotos, photoTab, id]);

  return (
    <RequireClub>
      <main style={{ padding:24, color:'#e5e7eb', background:'#0b0f19', minHeight:'100vh' }}>
        <h1 style={{ fontSize:24, marginBottom:16 }}>Editar evento</h1>
        {msg && !initial ? <p>{msg}</p> : (
          <>
            <EventForm
              mode="edit"
              initial={initial}
              onSaved={() => router.push('/events')}
            />

            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>Validación de fotos</h2>
                <button
                  onClick={() => setShowPhotos((v) => !v)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: showPhotos ? '#111827' : 'transparent',
                    color: '#e5e7eb',
                    cursor: 'pointer',
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
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: photoTab === t.key ? '#111827' : 'transparent',
                          color: '#e5e7eb',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}

                    <button
                      onClick={() => loadModerationPhotos(photoTab)}
                      style={{
                        marginLeft: 'auto',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'transparent',
                        color: '#e5e7eb',
                        cursor: 'pointer',
                      }}
                    >
                      ↻ Recargar
                    </button>
                  </div>

                  {photosMsg && (
                    <p style={{ marginTop: 10, opacity: 0.85 }}>{photosMsg}</p>
                  )}

                  {!photosMsg && photos.length === 0 && (
                    <p style={{ marginTop: 10, opacity: 0.75 }}>
                      No hay fotos en esta pestaña.
                    </p>
                  )}

                  {photos.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
                          <div style={{ width: '100%', height: 190, background: 'rgba(255,255,255,0.03)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt="user photo"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          </div>
                          <div style={{ padding: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              @{p.byUsername || 'usuario'}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                              {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ''}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                              Estado: {p.status}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedPhoto.url}
                            alt="selected"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontSize: 16, fontWeight: 800 }}>
                            @{selectedPhoto.byUsername || 'usuario'}
                          </div>

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
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  background: '#111827',
                                  color: '#e5e7eb',
                                  cursor: 'pointer',
                                }}
                              >
                                ✅ Aprobar
                              </button>
                            )}

                            {selectedPhoto.status !== 'rejected' && (
                              <button
                                onClick={() => rejectPhoto(selectedPhoto.photoId)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  background: 'transparent',
                                  color: '#e5e7eb',
                                  cursor: 'pointer',
                                }}
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

                          <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.65 }}>
                            photoId: {selectedPhoto.photoId}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </RequireClub>
  );
}
