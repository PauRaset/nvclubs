'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { confirmDialog } from '@/components/Toast';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

const CONTENT_MISSION_OPTIONS = [
  {
    type: 'approved_event_photo',
    label: 'Foto aprobada del evento',
    description: 'La foto es válida como contenido general aprobado del evento.',
  },
  {
    type: 'theme_photo',
    label: 'Foto temática',
    description: 'La foto cumple una temática concreta del evento o de la sala.',
  },
  {
    type: 'photocall_photo',
    label: 'Foto en photocall',
    description: 'La foto ha sido tomada en el photocall o punto visual definido.',
  },
  {
    type: 'group_photo_with_followed',
    label: 'Foto de grupo válida',
    description: 'La foto muestra el contenido grupal requerido por la misión.',
  },
  {
    type: 'show_prizes_photo',
    label: 'Foto mostrando premio',
    description: 'La foto demuestra correctamente la misión relacionada con premios.',
  },
];

function getMissionMeta(type) {
  return (
    CONTENT_MISSION_OPTIONS.find((item) => item.type === type) ||
    CONTENT_MISSION_OPTIONS[0]
  );
}

function missionDisplayLabel(photo) {
  if (photo?.missionTitle && String(photo.missionTitle).trim()) {
    return String(photo.missionTitle).trim();
  }
  return getMissionMeta(photo?.missionType || 'approved_event_photo')?.label || 'Foto aprobada del evento';
}

function validatedMissionDisplayLabel(photo) {
  if (photo?.validatedForMissionTitle && String(photo.validatedForMissionTitle).trim()) {
    return String(photo.validatedForMissionTitle).trim();
  }
  return getMissionMeta(photo?.validatedForMissionType || photo?.missionType || 'approved_event_photo')?.label || 'Foto aprobada del evento';
}

function getPhotoMissionType(photo) {
  return (
    photo?.targetMissionType ||
    photo?.targetMission?.type ||
    photo?.targetMission?.missionType ||
    photo?.missionType ||
    photo?.mission?.type ||
    photo?.mission?.missionType ||
    'approved_event_photo'
  );
}


function getPhotoMissionTitle(photo) {
  if (photo?.targetMissionTitle && String(photo.targetMissionTitle).trim()) {
    return String(photo.targetMissionTitle).trim();
  }
  if (photo?.missionTitle && String(photo.missionTitle).trim()) {
    return String(photo.missionTitle).trim();
  }
  if (photo?.mission?.title && String(photo.mission.title).trim()) {
    return String(photo.mission.title).trim();
  }
  if (photo?.targetMission?.title && String(photo.targetMission.title).trim()) {
    return String(photo.targetMission.title).trim();
  }
  return getMissionMeta(getPhotoMissionType(photo))?.label || 'Foto aprobada del evento';
}

function getPhotoMissionDescription(photo) {
  if (photo?.targetMissionDescription && String(photo.targetMissionDescription).trim()) {
    return String(photo.targetMissionDescription).trim();
  }
  if (photo?.missionDescription && String(photo.missionDescription).trim()) {
    return String(photo.missionDescription).trim();
  }
  if (photo?.mission?.description && String(photo.mission.description).trim()) {
    return String(photo.mission.description).trim();
  }
  if (photo?.targetMission?.description && String(photo.targetMission.description).trim()) {
    return String(photo.targetMission.description).trim();
  }
  return getMissionMeta(getPhotoMissionType(photo))?.description || 'La foto se validará como contenido general aprobado del evento.';
}

function getPhotoMissionTarget(photo) {
  const raw =
    photo?.targetMissionTarget ??
    photo?.missionTarget ??
    photo?.mission?.target ??
    photo?.targetMission?.target ??
    null;

  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function getPhotoMissionCurrent(photo) {
  const raw =
    photo?.targetMissionCurrent ??
    photo?.missionCurrent ??
    photo?.mission?.current ??
    photo?.targetMission?.current ??
    null;

  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function getPhotoLevelNumber(photo) {
  const raw =
    photo?.targetLevelNumber ??
    photo?.levelNumber ??
    photo?.mission?.levelNumber ??
    photo?.level?.levelNumber ??
    photo?.targetMission?.levelNumber ??
    null;

  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('nv_token') ||
    localStorage.getItem('authToken') ||
    '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...getAuthHeaders(),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
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

function toAbsoluteMediaUrl(input) {
  if (!input) return '';
  const value = String(input).trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const path = `${url.pathname || ''}${url.search || ''}${url.hash || ''}`;

      if (path.startsWith('/uploads/') || path.startsWith('/api/')) {
        return `${API_BASE}${path}`;
      }

      return value;
    } catch {
      return value;
    }
  }

  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

function getFilenameFromValue(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  try {
    const parsed = /^https?:\/\//i.test(raw) ? new URL(raw) : null;
    const pathname = parsed ? parsed.pathname || '' : raw;
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';

    if (!last || last === 'file' || last === 'photos' || last === 'api' || last === 'events') {
      return '';
    }

    if (!/\.(jpg|jpeg|png|webp|gif|bmp|heic|heif|avif)$/i.test(last)) {
      return '';
    }

    return last;
  } catch {
    const parts = raw.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (!last || last === 'file' || !/\.(jpg|jpeg|png|webp|gif|bmp|heic|heif|avif)$/i.test(last)) {
      return '';
    }
    return last;
  }
}

function buildPhotoCandidates(photo) {
  const expanded = [];

  const eventId = String(photo?.eventId || photo?.event || photo?.event_id || '').trim();
  const photoId = String(photo?.photoId || photo?._id || photo?.id || '').trim();

  if (eventId && photoId) {
    expanded.push(`${API_BASE}/api/events/${eventId}/photos/${photoId}/file`);
    expanded.push(
      `${API_BASE}/api/events/${eventId}/photos/${photoId}/file?v=${encodeURIComponent(
        photo?.updatedAt || photo?.reviewedAt || photo?.uploadedAt || photoId
      )}`
    );
  }

  const rawValues = [
    photo?.url,
    photo?.image,
    photo?.path,
    photo?.photoUrl,
    photo?.src,
    photo?.filename,
    photo?.fileName,
    photo?.rawUrl,
  ].filter(Boolean);

  for (const raw of rawValues) {
    const value = String(raw).trim();
    if (!value) continue;

    if (/\/photos\/\/file(?:\?|$)/i.test(value)) {
      continue;
    }

    const normalized = toAbsoluteMediaUrl(value);
    if (normalized && !/\/photos\/\/file(?:\?|$)/i.test(normalized)) {
      expanded.push(normalized);
    }

    let pathname = '';
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        pathname = url.pathname || '';
      } catch {
        pathname = '';
      }
    } else {
      pathname = value.startsWith('/') ? value : `/${value}`;
    }

    const cleanPath = pathname.replace(/^\/+/, '');

    if (pathname.startsWith('/api/') && !/\/photos\/\/file(?:\?|$)/i.test(pathname)) {
      expanded.push(`${API_BASE}${pathname}`);
    }

    if (pathname.startsWith('/uploads/')) {
      expanded.push(`${API_BASE}${pathname}`);
    }

    const filename = getFilenameFromValue(value);

    if (filename) {
      expanded.push(`${API_BASE}/uploads/${filename}`);
      expanded.push(`${API_BASE}/uploads/event-photos/${filename}`);
      expanded.push(`${API_BASE}/uploads/eventPhotos/${filename}`);
      expanded.push(`${API_BASE}/uploads/events/${filename}`);
    }

    if (cleanPath && /^uploads\//i.test(cleanPath)) {
      expanded.push(`${API_BASE}/${cleanPath}`);
    }
  }

  return Array.from(
    new Set(
      expanded.filter((item) => Boolean(item) && !/\/photos\/\/file(?:\?|$)/i.test(item))
    )
  );
}

function statusBadge(status) {
  if (status === 'approved') return { cls: 'nv-badge nv-badge-success', label: 'Aprobada' };
  if (status === 'rejected') return { cls: 'nv-badge nv-badge-danger', label: 'Rechazada' };
  return { cls: 'nv-badge nv-badge-warn', label: 'Pendiente' };
}

function SmartPhoto({ photo, alt, style }) {
  const candidates = useMemo(() => buildPhotoCandidates(photo), [photo]);
  const [index, setIndex] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef('');

  useEffect(() => {
    setIndex(0);
    setResolvedSrc('');
    setFailed(false);
  }, [candidates]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, []);

  const currentSrc = candidates[index] || '';

  useEffect(() => {
    let cancelled = false;

    async function loadCandidate() {
      if (!currentSrc) {
        setResolvedSrc('');
        return;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }

      setResolvedSrc('');
      setFailed(false);

      try {
        const res = await fetch(currentSrc, {
          method: 'GET',
          headers: {
            ...getAuthHeaders(),
          },
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();
        if (!blob || !blob.size) {
          throw new Error('empty image blob');
        }

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        if (!cancelled) {
          setResolvedSrc(objectUrl);
        }
      } catch (error) {
        if (cancelled) return;

        if (index < candidates.length - 1) {
          setIndex((prev) => prev + 1);
        } else {
          setFailed(true);
          setResolvedSrc('');
        }
      }
    }

    loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [currentSrc, index, candidates, photo]);

  if (!candidates.length || failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--nv-muted)',
          fontSize: 13,
          textAlign: 'center',
          padding: 12,
        }}
      >
        Imagen no disponible
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--nv-muted)',
          fontSize: 13,
          textAlign: 'center',
          padding: 12,
        }}
      >
        Cargando imagen...
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} style={style} loading="lazy" />;
}

export default function ContentPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedMissionType, setSelectedMissionType] = useState('approved_event_photo');
  const [selectedLevelNumber, setSelectedLevelNumber] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setNotice('');
      try {
        const data = await apiJson(`${API_BASE}/api/events/mine`);
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setNotice(e?.message || 'No se pudieron cargar los eventos del club.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      if (loading) return;
      if (!events.length) {
        setPhotos([]);
        return;
      }

      setPhotosLoading(true);
      setNotice('');

      try {
        const targetEvents =
          selectedEventId === 'all'
            ? events
            : events.filter((event) => (event._id || event.id) === selectedEventId);

        const results = await Promise.all(
          targetEvents.map(async (event) => {
            const eventId = event._id || event.id;
            if (!eventId) return [];
            try {
              const data = await apiJson(
                `${API_BASE}/api/events/${eventId}/photos/moderation?status=${statusFilter}`
              );
              const list = Array.isArray(data?.photos) ? data.photos : [];
              return list.map((photo) => ({
                ...photo,
                photoId: photo.photoId || photo._id || photo.id || '',
                rawUrl: photo.url || photo.image || photo.path || photo.photoUrl || photo.src || photo.filename || photo.fileName || '',
                eventId,
                eventTitle: event.title || 'Evento sin título',
                eventImage: toAbsoluteMediaUrl(event.imageUrl || event.image || event.heroImage || ''),
              }));
            } catch {
              return [];
            }
          })
        );

        const merged = results.flat().sort((a, b) => {
          const aTime = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return bTime - aTime;
        });

        if (!cancelled) {
          setPhotos(merged);
          if (selectedPhoto) {
            const stillExists = merged.find((p) => p.photoId === selectedPhoto.photoId);
            if (!stillExists) {
              setSelectedPhoto(null);
              setReviewNote('');
              setSelectedMissionType('approved_event_photo');
              setSelectedLevelNumber('');
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPhotos([]);
          setNotice(e?.message || 'No se pudieron cargar las fotos.');
        }
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    }

    loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [loading, events, selectedEventId, statusFilter]);

  const counts = useMemo(() => {
    const pending = photos.filter((p) => p.status === 'pending').length;
    const approved = photos.filter((p) => p.status === 'approved').length;
    const rejected = photos.filter((p) => p.status === 'rejected').length;
    return {
      total: photos.length,
      pending,
      approved,
      rejected,
    };
  }, [photos]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId === 'all') return null;
    return events.find((event) => (event._id || event.id) === selectedEventId) || null;
  }, [events, selectedEventId]);

  const selectedMissionMeta = useMemo(() => {
    return getMissionMeta(selectedMissionType);
  }, [selectedMissionType]);

  const selectedTargetMissionType = useMemo(() => {
    return getPhotoMissionType(selectedPhoto);
  }, [selectedPhoto]);
  
  const selectedTargetMissionMeta = useMemo(() => {
    return getMissionMeta(selectedTargetMissionType);
  }, [selectedTargetMissionType]);

  async function refreshCurrentPhotos() {
    if (!events.length) return;
    setPhotosLoading(true);
    try {
      const targetEvents =
        selectedEventId === 'all'
          ? events
          : events.filter((event) => (event._id || event.id) === selectedEventId);

      const results = await Promise.all(
        targetEvents.map(async (event) => {
          const eventId = event._id || event.id;
          if (!eventId) return [];
          try {
            const data = await apiJson(
              `${API_BASE}/api/events/${eventId}/photos/moderation?status=${statusFilter}`
            );
            const list = Array.isArray(data?.photos) ? data.photos : [];
            return list.map((photo) => ({
              ...photo,
              photoId: photo.photoId || photo._id || photo.id || '',
              rawUrl: photo.url || photo.image || photo.path || photo.photoUrl || photo.src || photo.filename || photo.fileName || '',
              eventId,
              eventTitle: event.title || 'Evento sin título',
              eventImage: toAbsoluteMediaUrl(event.imageUrl || event.image || event.heroImage || ''),
            }));
          } catch {
            return [];
          }
        })
      );

      const merged = results.flat().sort((a, b) => {
        const aTime = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bTime = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return bTime - aTime;
      });

      setPhotos(merged);
    } finally {
      setPhotosLoading(false);
    }
  }

  async function approvePhoto() {
    if (!selectedPhoto?.eventId || !selectedPhoto?.photoId || actionBusy) return;
    setActionBusy(true);
    setNotice('Aprobando foto...');
    try {
      await apiJson(`${API_BASE}/api/events/${selectedPhoto.eventId}/photos/${selectedPhoto.photoId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          reviewNote: reviewNote || '',
          missionType: getPhotoMissionType(selectedPhoto) || selectedMissionType || 'approved_event_photo',
          missionId:
            selectedPhoto?.targetMissionId ||
            selectedPhoto?.missionId ||
            selectedPhoto?.mission?.missionId ||
            selectedPhoto?.mission?.id ||
            selectedPhoto?.targetMission?._id ||
            selectedPhoto?.targetMission?.id ||
            null,
          missionTitle: getPhotoMissionTitle(selectedPhoto),
          validatedForMissionId:
            selectedPhoto?.targetMissionId ||
            selectedPhoto?.missionId ||
            selectedPhoto?.mission?.missionId ||
            selectedPhoto?.mission?.id ||
            selectedPhoto?.targetMission?._id ||
            selectedPhoto?.targetMission?.id ||
            null,
          validatedForMissionType: getPhotoMissionType(selectedPhoto) || 'approved_event_photo',
          validatedForMissionTitle: getPhotoMissionTitle(selectedPhoto),
          validatedForLevelNumber: getPhotoLevelNumber(selectedPhoto),
          validationResult: 'matched',
        }),
      });
      setSelectedPhoto(null);
      setReviewNote('');
      setSelectedMissionType('approved_event_photo');
      setSelectedLevelNumber('');
      setNotice('Foto aprobada correctamente para la misión seleccionada.');
      await refreshCurrentPhotos();
    } catch (e) {
      setNotice(e?.message || 'No se pudo aprobar la foto.');
    } finally {
      setActionBusy(false);
    }
  }

  async function rejectPhoto() {
    if (!selectedPhoto?.eventId || !selectedPhoto?.photoId || actionBusy) return;
    setActionBusy(true);
    setNotice('Rechazando foto...');
    try {
      await apiJson(`${API_BASE}/api/events/${selectedPhoto.eventId}/photos/${selectedPhoto.photoId}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reviewNote: reviewNote || '',
          missionType: getPhotoMissionType(selectedPhoto) || selectedMissionType || 'approved_event_photo',
          missionId:
            selectedPhoto?.targetMissionId ||
            selectedPhoto?.missionId ||
            selectedPhoto?.mission?.missionId ||
            selectedPhoto?.mission?.id ||
            selectedPhoto?.targetMission?._id ||
            selectedPhoto?.targetMission?.id ||
            null,
          missionTitle: getPhotoMissionTitle(selectedPhoto),
          validatedForMissionType: getPhotoMissionType(selectedPhoto) || 'approved_event_photo',
          validatedForMissionId:
            selectedPhoto?.targetMissionId ||
            selectedPhoto?.missionId ||
            selectedPhoto?.mission?.missionId ||
            selectedPhoto?.mission?.id ||
            selectedPhoto?.targetMission?._id ||
            selectedPhoto?.targetMission?.id ||
            null,
          validatedForMissionTitle: getPhotoMissionTitle(selectedPhoto),
          validatedForLevelNumber: getPhotoLevelNumber(selectedPhoto),
          validationResult: 'not_matched',
        }),
      });
      setSelectedPhoto(null);
      setReviewNote('');
      setSelectedMissionType('approved_event_photo');
      setSelectedLevelNumber('');
      setNotice('Foto rechazada correctamente para la misión revisada.');
      await refreshCurrentPhotos();
    } catch (e) {
      setNotice(e?.message || 'No se pudo rechazar la foto.');
    } finally {
      setActionBusy(false);
    }
  }

  async function deletePhoto() {
    if (!selectedPhoto?.eventId || !selectedPhoto?.photoId || actionBusy) return;
    const ok = await confirmDialog({
      title: '¿Eliminar esta foto?',
      message: 'Se eliminará definitivamente del contenido del evento.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setActionBusy(true);
    setNotice('Eliminando foto...');
    try {
      await apiJson(`${API_BASE}/api/events/${selectedPhoto.eventId}/photos/${selectedPhoto.photoId}`, {
        method: 'DELETE',
      });
      setSelectedPhoto(null);
      setReviewNote('');
      setSelectedMissionType('approved_event_photo');
      setSelectedLevelNumber('');
      setNotice('Foto eliminada correctamente.');
      await refreshCurrentPhotos();
    } catch (e) {
      setNotice(e?.message || 'No se pudo eliminar la foto.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Contenido del club</span>
            <h1 className="nv-h1" style={{ marginTop: 10 }}>Validación de fotos</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 620 }}>
              Revisa el contenido subido por asistentes, filtra por evento o estado y aprueba o rechaza cada foto según la misión o contexto del evento.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button type="button" onClick={refreshCurrentPhotos} className="nv-btn nv-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              Recargar contenido
            </button>
          </div>
        </section>

        {notice && (
          <div className="nv-notice" role="status" aria-live="polite">{notice}</div>
        )}

        <section className="nv-grid-auto nv-stagger">
          <article className="nv-kpi">
            <div className="nv-kpi-label">Fotos visibles</div>
            <div className="nv-kpi-value">{counts.total}</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Pendientes</div>
            <div className="nv-kpi-value">{counts.pending}</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Aprobadas</div>
            <div className="nv-kpi-value">{counts.approved}</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Rechazadas</div>
            <div className="nv-kpi-value">{counts.rejected}</div>
          </article>
        </section>

        <section className="nv-card">
          <div className="nv-toolbar">
            <label className="nv-field" style={{ flex: '1 1 240px', maxWidth: 380 }}>
              <span className="nv-label">Evento</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="nv-select"
              >
                <option value="all">Todos mis eventos</option>
                {events.map((event) => (
                  <option key={event._id || event.id} value={event._id || event.id}>
                    {event.title || 'Evento sin título'}
                  </option>
                ))}
              </select>
            </label>

            <div className="nv-seg" role="tablist" aria-label="Filtrar por estado">
              {[
                { key: 'pending', label: 'Pendientes' },
                { key: 'approved', label: 'Aprobadas' },
                { key: 'rejected', label: 'Rechazadas' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`nv-seg-btn ${statusFilter === item.key ? 'is-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <span className="nv-small nv-muted" style={{ whiteSpace: 'nowrap' }}>
              {selectedEvent ? `Evento: ${selectedEvent.title}` : 'Vista global del club'}
            </span>
          </div>
        </section>

        <section className="nv-card">
          {loading || photosLoading ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="nv-skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="nv-skeleton" style={{ height: 210, borderRadius: 0 }} />
                    <div style={{ padding: 12 }}>
                      <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '70%' }} />
                      <div className="nv-skeleton nv-skeleton-line" style={{ width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="nv-empty">
                <div className="nv-empty-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="2" />
                    <path d="m4 18 5-4 4 3 3-2 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="nv-empty-title">No hay fotos en esta vista</div>
                <div className="nv-empty-text">
                  Prueba con otro evento o cambia el filtro de estado para revisar más contenido.
                </div>
              </div>
            ) : (
              <div
                className="nv-stagger"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {photos.map((photo) => {
                  const badge = statusBadge(photo.status);
                  return (
                  <button
                    key={`${photo.eventId}-${photo.photoId}`}
                    type="button"
                    className="nv-card nv-card-interactive"
                    onClick={() => {
                      const detectedMissionType = getPhotoMissionType(photo) || 'approved_event_photo';
                      const detectedLevelNumber = getPhotoLevelNumber(photo);

                      setSelectedPhoto(photo);
                      setReviewNote(photo.reviewNote || '');
                      setSelectedMissionType(detectedMissionType);
                      setSelectedLevelNumber(
                        detectedLevelNumber != null ? String(detectedLevelNumber) : ''
                      );
                    }}
                    style={{ padding: 0, overflow: 'hidden', textAlign: 'left', display: 'block' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: 210,
                        background: 'var(--nv-ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <SmartPhoto
                        photo={photo}
                        alt="Foto subida por asistente"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                      <div className="nv-h4">{photo.eventTitle || 'Evento sin título'}</div>
                      <div className="nv-small nv-muted">@{photo.byUsername || 'usuario'}</div>
                      <div className="nv-card-soft" style={{ display: 'grid', gap: 6 }}>
                        <div className="nv-small nv-muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          Misión objetivo
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>
                          {getPhotoMissionTitle(photo)}
                        </div>
                        {getPhotoLevelNumber(photo) != null && (
                          <div className="nv-accent-text nv-small" style={{ fontWeight: 700 }}>
                            Nivel {getPhotoLevelNumber(photo)}
                          </div>
                        )}

                        {(getPhotoMissionCurrent(photo) != null || getPhotoMissionTarget(photo) != null) && (
                          <div className="nv-small nv-muted">
                            Objetivo {getPhotoMissionCurrent(photo) ?? 0}/{getPhotoMissionTarget(photo) ?? '—'}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className={badge.cls}>{badge.label}</span>
                        {photo.validatedForMissionType && (
                          <span className="nv-badge">Validada como {validatedMissionDisplayLabel(photo)}</span>
                        )}
                      </div>
                      <div className="nv-small nv-muted">
                        {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString('es-ES') : ''}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </section>

        {selectedPhoto && (
          <div
            onClick={() => {
              if (actionBusy) return;
              setSelectedPhoto(null);
              setReviewNote('');
              setSelectedMissionType('approved_event_photo');
              setSelectedLevelNumber('');
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Revisión de foto"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.68)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 80,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(860px, 100%)',
                maxHeight: '84vh',
                background: 'var(--nv-surface)',
                border: '1px solid var(--nv-border-strong)',
                borderRadius: 'var(--nv-r-lg)',
                overflow: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              }}
            >
              <div style={{
                background: 'var(--nv-ink)',
                minHeight: 320,
                maxHeight: '84vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                overflow: 'hidden',
              }}>
                <SmartPhoto
                  photo={selectedPhoto}
                  alt="Foto seleccionada"
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: 14,
                    display: 'block',
                  }}
                />
              </div>

              <div style={{
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                maxHeight: '84vh',
                overflowY: 'auto',
              }}>
                <div>
                  <div className="nv-h3">{selectedPhoto.eventTitle || 'Evento sin título'}</div>
                  <div className="nv-small nv-muted" style={{ marginTop: 6 }}>
                    Subida por @{selectedPhoto.byUsername || 'usuario'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={statusBadge(selectedPhoto.status).cls}>
                    {statusBadge(selectedPhoto.status).label}
                  </span>
                </div>

                <p className="nv-small" style={{ color: 'var(--nv-text-soft)', lineHeight: 1.6, margin: 0 }}>
                  Aquí ves la misión objetivo de la foto y puedes decidir si realmente la cumple. Solo debería aprobarse si encaja con la misión requerida por ese usuario en ese momento.
                </p>

                <div className="nv-card-soft" style={{ display: 'grid', gap: 10 }}>
                  <div className="nv-small nv-muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Misión objetivo detectada en esta foto
                  </div>
                  <div className="nv-h4">{getPhotoMissionTitle(selectedPhoto)}</div>
                  <div className="nv-small" style={{ color: 'var(--nv-text-soft)', lineHeight: 1.6 }}>
                    {getPhotoMissionDescription(selectedPhoto)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {getPhotoLevelNumber(selectedPhoto) != null && (
                      <span className="nv-badge">Nivel objetivo {getPhotoLevelNumber(selectedPhoto)}</span>
                    )}
                    {(getPhotoMissionCurrent(selectedPhoto) != null || getPhotoMissionTarget(selectedPhoto) != null) && (
                      <span className="nv-badge nv-badge-neutral">
                        Objetivo {getPhotoMissionCurrent(selectedPhoto) ?? 0}/{getPhotoMissionTarget(selectedPhoto) ?? '—'}
                      </span>
                    )}
                    {selectedPhoto?.validationResult && (
                      <span className="nv-badge nv-badge-neutral">
                        {selectedPhoto.validationResult === 'matched' ? 'Coincide con la misión' : 'No coincide con la misión'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="nv-card-soft" style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div className="nv-label">Misión que le toca cumplir al usuario</div>
                    <div className="nv-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 800, lineHeight: 1.45 }}>
                      {getPhotoMissionTitle(selectedPhoto)}
                    </div>
                  </div>

                  <div>
                    <div className="nv-label">Nivel de la misión</div>
                    <div className="nv-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 800 }}>
                      {getPhotoLevelNumber(selectedPhoto) != null
                        ? `Nivel ${getPhotoLevelNumber(selectedPhoto)}`
                        : 'Sin nivel objetivo'}
                    </div>
                  </div>

                  <div className="nv-notice nv-notice-info">
                    <strong style={{ display: 'block', marginBottom: 6 }}>
                      {getPhotoMissionTitle(selectedPhoto)}
                    </strong>
                    {getPhotoMissionDescription(selectedPhoto)}
                    {(getPhotoMissionCurrent(selectedPhoto) != null || getPhotoMissionTarget(selectedPhoto) != null) && (
                      <div style={{ marginTop: 8, fontWeight: 700 }}>
                        Objetivo actual: {getPhotoMissionCurrent(selectedPhoto) ?? 0}/{getPhotoMissionTarget(selectedPhoto) ?? '—'}
                      </div>
                    )}
                  </div>
                </div>

                {selectedPhoto?.validatedForMissionType && (
                  <div className="nv-card-soft" style={{ display: 'grid', gap: 8 }}>
                    <div className="nv-small nv-muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Última validación guardada
                    </div>
                    <div className="nv-h4">{validatedMissionDisplayLabel(selectedPhoto)}</div>
                    {selectedPhoto?.validatedForLevelNumber != null && selectedPhoto?.validatedForLevelNumber !== '' && (
                      <div className="nv-accent-text nv-small" style={{ fontWeight: 700 }}>
                        Nivel validado {selectedPhoto.validatedForLevelNumber}
                      </div>
                    )}
                  </div>
                )}

                <label className="nv-field">
                  <span className="nv-label">Nota de revisión</span>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={5}
                    className="nv-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </label>

                <div style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
                  {selectedPhoto.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={approvePhoto}
                      disabled={actionBusy}
                      className="nv-btn nv-btn-primary nv-btn-block"
                    >
                      {actionBusy ? 'Procesando…' : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Aprobar porque sí cumple la misión
                        </>
                      )}
                    </button>
                  )}

                  {selectedPhoto.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={rejectPhoto}
                      disabled={actionBusy}
                      className="nv-btn nv-btn-ghost nv-btn-block"
                    >
                      {actionBusy ? 'Procesando…' : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                          Rechazar porque no cumple la misión
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={deletePhoto}
                    disabled={actionBusy}
                    className="nv-btn nv-btn-danger nv-btn-block"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                    Eliminar foto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireClub>
  );
}
