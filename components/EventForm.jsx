
'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  createEvent,
  updateEvent,
  uploadEventImage,
  fetchEventPhotos,
  deleteEventPhoto,
} from '@/lib/eventsApi';
import { getUser } from '@/lib/apiClient';
import { toast } from '@/components/Toast';

/* --- Recorte simple: centra y reescala a 800x450 --- */
async function cropTo800x450(file) {
  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  await new Promise(r => { img.onload = r; img.onerror = r; });
  const canvas = document.createElement('canvas');
  const targetW = 800, targetH = 450;
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const { naturalWidth:w, naturalHeight:h } = img;
  const targetRatio = 16/9;
  const srcRatio = w / h;
  let sw, sh, sx, sy;
  if (srcRatio > targetRatio) {
    sh = h;
    sw = Math.round(h * targetRatio);
    sx = Math.floor((w - sw) / 2);
    sy = 0;
  } else {
    sw = w;
    sh = Math.round(w / targetRatio);
    sx = 0;
    sy = Math.floor((h - sh) / 2);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const cropped = new File([blob], `event-hero-800x450.webp`, { type: 'image/webp' });
      resolve(cropped);
    }, 'image/webp', 0.9);
  });
}

/* ====== Géneros (lista amplia y ordenada alfabéticamente) ====== */
const ALL_GENRES = [
  'Afro', 'Afrobeat', 'Afrobeats', 'Amapiano',
  'Ambient', 'Bass House', 'Big Room', 'Breakbeat', 'Breaks',
  'Commercial', 'Dancehall', 'Dembow', 'Deep House', 'Disco', 'Drum & Bass',
  'Dubstep', 'EDM', 'Electro', 'Funk', 'Garage', 'Hardcore', 'Hardstyle',
  'Hip-Hop', 'House', 'Indie Dance', 'J-Pop', 'K-Pop', 'Latin',
  'Lo-Fi', 'Melodic Techno', 'Minimal / Deep Tech', 'Nu-Disco',
  'Pop', 'Progressive House', 'Psytrance', 'R&B', 'Rap', 'Reggaeton',
  'Salsa', 'Synthwave', 'Tech House', 'Techno', 'Trap', 'Trance',
  'UK Garage', 'Bachata', 'Merengue', 'Chillout', 'Soul'
].sort((a, b) => a.localeCompare(b));

/* Convierte Date o ISO a valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm) */
function toLocalInputValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/* Pasa valor de <input datetime-local> a ISO */
function localToISO(v) {
  if (!v) return null;

  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, ys, ms, ds, hs, mins] = m;
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const hour = Number(hs);
  const minute = Number(mins);

  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatLocalPreview(v) {
  if (!v) return 'No seleccionada';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return v;

  const [, ys, ms, ds, hs, mins] = m;
  const d = new Date(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins), 0, 0);

  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* Extrae un id de propietario desde createdBy (string u objeto) */
function ownerIdFrom(createdBy) {
  if (!createdBy) return null;
  if (typeof createdBy === 'string') return createdBy;
  return createdBy._id || createdBy.id || createdBy.toString?.() || null;
}

/* Utilidades pequeñas */
const uniq = (arr) => Array.from(new Set(arr));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function formatSummaryDate(v) {
  if (!v) return 'Pendiente';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return 'Pendiente';
  const [, ys, ms, ds, hs, mins] = m;
  const d = new Date(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins), 0, 0);
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoneyPreview(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || String(v).trim() === '') return 'Gratis o pendiente';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function EventForm({ initial = null, onSaved, mode = 'create' }) {
  // Normaliza props iniciales (acepta claves nuevas o antiguas)
  const initialStart = initial?.startAtISO || initial?.startAt || initial?.dateISO || initial?.date || null;
  const initialEnd   = initial?.endAtISO   || initial?.endAt   || null;

  // Básicos
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');

  // Ubicación
  const [street, setStreet] = useState(initial?.street || initial?._raw?.street || '');
  const [city, setCity] = useState(initial?.city || initial?._raw?.city || '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode || initial?._raw?.postalCode || '');

  // Fechas
  const [startAt, setStartAt] = useState(toLocalInputValue(initialStart));
  const [endAt, setEndAt] = useState(toLocalInputValue(initialEnd));

  // Extras
  const [categories, setCategories] = useState(
    Array.isArray(initial?.categories) ? initial.categories.map(String) : []
  );
  const [genreQuery, setGenreQuery] = useState('');
  const [otherCats, setOtherCats] = useState(''); // extra por comas
  const [dressCode, setDressCode] = useState(initial?.dressCode || '');
  const [age, setAge] = useState(initial?.age ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');

  // Imagen
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Galería (solo en edición)
  const [photos, setPhotos] = useState([]); // [{url, byUsername?, uploadedAt?}]
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);

  // Estado
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Previsualización inicial
  useEffect(() => {
    const p = initial?.imageUrl || initial?.image || null;
    if (p && typeof p === 'string') setPreview(p);
  }, [initial]);

  // Cargar galería en modo edición
  useEffect(() => {
    const id = initial?.id || initial?._id || initial?._raw?._id;
    if (!id || mode === 'create') return;

    (async () => {
      setLoadingPhotos(true);
      const r = await fetchEventPhotos(id);
      if (r.ok) {
        const list = Array.isArray(r.data) ? r.data.map(p => (typeof p === 'string' ? { url: p } : p)) : [];
        setPhotos(list);
      }
      setLoadingPhotos(false);
    })();
  }, [initial, mode]);

  // ====== owner ======
  const currentUserId = getUser()?.id || null;
  const createdByCandidate = initial?.createdBy ?? initial?._raw?.createdBy ?? null;
  const createdById = ownerIdFrom(createdByCandidate);
  const computedIsOwner = currentUserId && createdById
    ? String(currentUserId) === String(createdById)
    : false;

  const isOwner = initial?.isOwner ?? computedIsOwner;

  // ====== Géneros: filtrado por búsqueda ======
  const visibleGenres = useMemo(() => {
    const q = genreQuery.trim().toLowerCase();
    if (!q) return ALL_GENRES;
    return ALL_GENRES.filter(g => g.toLowerCase().includes(q));
  }, [genreQuery]);

  function toggleCategory(cat) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function mergedCategories() {
    const base = new Set(categories.map(String));
    if (otherCats.trim()) {
      otherCats.split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(s => base.add(s));
    }
    return Array.from(base);
  }

  // Imagen
  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onDropImage(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f || !f.type?.startsWith('image/')) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    setMsg('Guardando...');

    // Validación mínima
    const startISO = localToISO(startAt);
    const endISO = localToISO(endAt);
    if (!startISO || !endISO) {
      setSaving(false);
      setMsg('');
      return setFormError('Introduce fechas de inicio y fin válidas.');
    }
    if (new Date(endISO) < new Date(startISO)) {
      setSaving(false);
      setMsg('');
      return setFormError('La fecha de fin no puede ser anterior al inicio.');
    }
    if (!title.trim()) {
      setSaving(false);
      setMsg('');
      return setFormError('El título es obligatorio.');
    }

    // Normaliza números
    const priceNum = price === '' ? null : clamp(Math.round(Number(price)), 0, 999999);
    const ageNum = age === '' ? null : clamp(Math.round(Number(age)), 0, 99);

    // Construye payload
    const payload = {
      title: title.trim(),
      description: description?.trim() || '',
      startAt: startISO,
      endAt: endISO,
      street: street?.trim() || '',
      city: city?.trim() || '',
      postalCode: postalCode?.trim() || '',
      categories: mergedCategories(),
      dressCode: dressCode?.trim() || '',
      age: ageNum,
      price: priceNum,
    };

    const res = mode === 'create'
      ? await createEvent(payload)
      : await updateEvent(initial?._id || initial?.id, payload);

    if (!res.ok) {
      setSaving(false);
      setMsg('');
      return setFormError(res.data?.message || `Error (HTTP ${res.status})`);
    }

    const saved = res.data;

    // Subida de imagen si se seleccionó
    if (imageFile) {
      try {
        const cropped = await cropTo800x450(imageFile);
        const targetId = saved?.id || saved?._raw?._id || initial?._id || initial?.id;
        const up = await uploadEventImage(targetId, cropped);
        if (!up.ok) {
          setMsg('');
          setFormError(`Evento guardado, pero la imagen falló (HTTP ${up.status})`);
        }
      } catch (err) {
        console.error(err);
        setMsg('');
        setFormError('Evento guardado, pero no se pudo procesar la imagen.');
      }
    }

    setMsg('Guardado');
    toast.success(mode === 'create' ? 'Evento creado correctamente.' : 'Cambios guardados correctamente.');
    setSaving(false);
    if (onSaved) onSaved(saved);
  }

  async function handleDeletePhoto(idx) {
    if (idx < 0 || idx >= photos.length) return;
    const id = initial?.id || initial?._id || initial?._raw?._id;
    if (!id) return;
    if (!isOwner) return;

    const photo = photos[idx];
    setDeletingIdx(idx);
    try {
      const r = await deleteEventPhoto(id, { url: photo?.url, idx });
      if (r.ok) {
        setPhotos(prev => prev.filter((_, i) => i !== idx));
        toast.success('Foto eliminada.');
      } else {
        toast.error(r.data?.message || `No se pudo borrar (HTTP ${r.status})`);
      }
    } catch (e) {
      console.error(e);
      toast.error('No se pudo borrar la foto.');
    } finally {
      setDeletingIdx(null);
    }
  }

  // ====== preview helpers ======
  const previewCategories = mergedCategories();
  const previewLocation = [street, city, postalCode].filter(Boolean).join(' · ') || 'Ubicación pendiente';
  const previewImage = preview || initial?.imageUrl || initial?.image || null;

  // ====== UI ======
  const selectedCount = categories.length;
  const isCreate = mode === 'create';

  return (
    <form onSubmit={handleSubmit} className={isCreate ? 'nv-form-grid' : 'nv-stack'}>
      {/* Columna principal: campos por secciones numeradas */}
      <div className="nv-form-main nv-stack">
        {formError && <div role="alert" className="nv-notice nv-notice-error">{formError}</div>}

        {/* 1 · Datos básicos */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">1</span>
            <div>
              <h3 className="nv-h4">Datos básicos</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Nombre, tono y descripción del evento.</p>
            </div>
          </header>
          <div className="nv-field-grid">
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Título <span style={{ color: 'var(--nv-accent)' }}>*</span></span>
              <input
                value={title}
                onChange={e=>setTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="Nombre del evento"
                className="nv-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Código de vestimenta</span>
              <input
                value={dressCode}
                onChange={e=>setDressCode(e.target.value)}
                placeholder="casual, elegante..."
                maxLength={80}
                className="nv-input"
              />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
            <span className="nv-label" style={{ marginBottom: 0 }}>Descripción</span>
            <textarea
              value={description}
              onChange={e=>setDescription(e.target.value)}
              rows={5}
              placeholder="Cuéntale a la gente qué hará especial tu evento…"
              className="nv-textarea"
            />
          </label>
        </section>

        {/* 2 · Fechas */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">2</span>
            <div>
              <h3 className="nv-h4">Fechas</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Hora local exacta de inicio y final.</p>
            </div>
          </header>
          <div className="nv-field-grid">
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Inicio <span style={{ color: 'var(--nv-accent)' }}>*</span></span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={e=>setStartAt(e.target.value)}
                required
                className="nv-input"
              />
              <span className="nv-small nv-muted">{formatLocalPreview(startAt)}</span>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Fin <span style={{ color: 'var(--nv-accent)' }}>*</span></span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={e=>setEndAt(e.target.value)}
                required
                className="nv-input"
              />
              <span className="nv-small nv-muted">{formatLocalPreview(endAt)}</span>
            </label>
          </div>
          <div className="nv-notice nv-notice-info" style={{ marginTop: 12 }}>
            En la base de datos la fecha puede guardarse en UTC; en la app se respeta la hora local que eliges aquí.
          </div>
        </section>

        {/* 3 · Ubicación */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">3</span>
            <div>
              <h3 className="nv-h4">Ubicación</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Dirección base para entender y filtrar el evento.</p>
            </div>
          </header>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="nv-label" style={{ marginBottom: 0 }}>Calle</span>
            <input
              value={street}
              onChange={e=>setStreet(e.target.value)}
              placeholder="Calle, número, piso..."
              className="nv-input"
            />
          </label>
          <div className="nv-field-grid" style={{ marginTop: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Ciudad</span>
              <input value={city} onChange={e=>setCity(e.target.value)} className="nv-input" />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Código postal</span>
              <input value={postalCode} onChange={e=>setPostalCode(e.target.value)} className="nv-input" />
            </label>
          </div>
        </section>

        {/* 4 · Categorías musicales */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">4</span>
            <div style={{ minWidth: 0 }}>
              <div className="nv-row" style={{ gap: 8 }}>
                <h3 className="nv-h4">Categorías musicales</h3>
                {selectedCount > 0 && <span className="nv-badge">{selectedCount} {selectedCount === 1 ? 'seleccionada' : 'seleccionadas'}</span>}
              </div>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Toca los estilos que encajan con tu evento.</p>
            </div>
          </header>

          <div className="nv-toolbar" style={{ marginBottom: 14 }}>
            <input
              placeholder="Buscar género…"
              value={genreQuery}
              onChange={e=>setGenreQuery(e.target.value)}
              className="nv-input"
              aria-label="Buscar género"
            />
            {selectedCount > 0 && (
              <button type="button" className="nv-btn nv-btn-ghost" onClick={() => setCategories([])}>
                Quitar selección
              </button>
            )}
          </div>

          <div className="nv-chips">
            {visibleGenres.map(cat => {
              const on = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`nv-chip ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                >
                  {on && <span className="nv-chip-x" aria-hidden="true">✓</span>}
                  {cat}
                </button>
              );
            })}
            {visibleGenres.length === 0 && (
              <span className="nv-small nv-muted">No hay géneros que coincidan con “{genreQuery}”.</span>
            )}
          </div>

          <label style={{ display: 'grid', gap: 6, marginTop: 16 }}>
            <span className="nv-label" style={{ marginBottom: 0 }}>Otras categorías (separadas por comas)</span>
            <input
              value={otherCats}
              onChange={e=>setOtherCats(e.target.value)}
              placeholder="p.ej. techno melódico, indie dance"
              className="nv-input"
            />
          </label>
        </section>

        {/* 5 · Detalles */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">5</span>
            <div>
              <h3 className="nv-h4">Detalles</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Precio y edad mínima (opcionales).</p>
            </div>
          </header>
          <div className="nv-field-grid">
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Precio (€)</span>
              <input type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder="p.ej. 15" className="nv-input" />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="nv-label" style={{ marginBottom: 0 }}>Edad mínima</span>
              <input type="number" min="0" step="1" value={age} onChange={e=>setAge(e.target.value)} placeholder="18" className="nv-input" />
            </label>
          </div>
        </section>

        {/* 6 · Imagen principal */}
        <section className="nv-card-soft">
          <header className="nv-form-section-head">
            <span className="nv-step">6</span>
            <div>
              <h3 className="nv-h4">Imagen principal</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 4 }}>Se recorta automáticamente a 800×450 (.webp).</p>
            </div>
          </header>
          <label
            className={`nv-dropzone ${dragOver ? 'is-drag' : ''}`}
            onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
            onDragLeave={()=>setDragOver(false)}
            onDrop={onDropImage}
          >
            {preview ? (
              <div style={{ width: '100%', display: 'grid', gap: 10, justifyItems: 'center' }}>
                <img
                  src={preview}
                  alt="Previsualización de portada"
                  style={{ width: '100%', maxWidth: 520, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 'var(--nv-r-sm)', border: '1px solid var(--nv-border)' }}
                />
                <span className="nv-small nv-muted">Arrastra otra imagen o haz clic para cambiarla</span>
              </div>
            ) : (
              <>
                <span className="nv-dropzone-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m3 16 5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="9" r="1.5" />
                  </svg>
                </span>
                <div className="nv-h4">Arrastra tu portada aquí</div>
                <div className="nv-small nv-muted">o haz clic para seleccionar un archivo</div>
              </>
            )}
            <input type="file" accept="image/*" onChange={onPick} style={{ display:'none' }} />
          </label>
        </section>

        {/* Galería (sólo edición) */}
        {mode !== 'create' && (
          <section className="nv-card-soft">
            <div style={{ marginBottom: 14 }}>
              <h3 className="nv-h4">Fotos subidas por asistentes</h3>
              <p className="nv-small nv-muted" style={{ marginTop: 6, maxWidth: 720 }}>Revisa y gestiona el contenido que los asistentes han subido.</p>
            </div>
            {loadingPhotos ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="nv-skeleton" style={{ height: 140, borderRadius: 'var(--nv-r-sm)' }} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="nv-empty">
                <div className="nv-empty-title" style={{ fontSize: 'var(--nv-fs-md)' }}>Aún no hay fotos en la galería</div>
                <div className="nv-empty-text">Cuando los asistentes suban contenido aparecerá aquí.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {photos.map((ph, idx) => (
                  <div
                    key={`${ph.url}-${idx}`}
                    style={{
                      position: 'relative',
                      border: '1px solid var(--nv-border)',
                      borderRadius: 'var(--nv-r-sm)',
                      overflow: 'hidden',
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--nv-bg-soft)',
                    }}
                  >
                    <img src={ph.url} alt={`photo-${idx}`} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(idx)}
                        disabled={deletingIdx === idx}
                        title="Eliminar foto"
                        className="nv-btn nv-btn-danger"
                        style={{ position: 'absolute', top: 6, right: 6, minHeight: 34, padding: '0 10px', fontSize: 12 }}
                      >
                        {deletingIdx === idx ? 'Borrando…' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isOwner && photos.length > 0 && (
              <div className="nv-small nv-muted" style={{ marginTop: 10 }}>* Solo el creador del evento puede eliminar fotos.</div>
            )}
          </section>
        )}
      </div>

      {/* Raíl lateral fijo con vista previa (solo al crear) */}
      {isCreate ? (
        <aside className="nv-form-rail">
          <div className="nv-card" style={{ display: 'grid', gap: 12 }}>
            <span className="nv-eyebrow">Vista previa</span>
            <div className="nv-thumb" style={{ aspectRatio: '16 / 9' }}>
              {previewImage ? (
                <img src={previewImage} alt="Previsualización de portada" />
              ) : (
                <span className="nv-thumb-empty" style={{ textAlign: 'center', padding: '0 18px' }}>Tu portada aparecerá aquí</span>
              )}
            </div>
            <div className="nv-h3" style={{ wordBreak: 'break-word', minWidth: 0 }}>
              {title.trim() || 'Evento sin título'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="nv-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="nv-small nv-muted">Inicio</span>
                <span className="nv-small" style={{ fontWeight: 700, textAlign: 'right' }}>{formatSummaryDate(startAt)}</span>
              </div>
              <div className="nv-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="nv-small nv-muted">Fin</span>
                <span className="nv-small" style={{ fontWeight: 700, textAlign: 'right' }}>{formatSummaryDate(endAt)}</span>
              </div>
              <div className="nv-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="nv-small nv-muted">Ubicación</span>
                <span className="nv-small" style={{ fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{previewLocation}</span>
              </div>
              <div className="nv-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="nv-small nv-muted">Precio</span>
                <span className="nv-small" style={{ fontWeight: 700, textAlign: 'right' }}>{formatMoneyPreview(price)}</span>
              </div>
            </div>
            {previewCategories.length > 0 && (
              <div className="nv-chips">
                {previewCategories.slice(0, 6).map((cat) => (
                  <span key={`preview-${cat}`} className="nv-badge">{cat}</span>
                ))}
              </div>
            )}
          </div>

          <button disabled={saving} type="submit" className="nv-btn nv-btn-primary nv-btn-block">
            {saving ? 'Guardando…' : 'Crear evento'}
          </button>
          <p className="nv-small nv-muted" style={{ textAlign: 'center', margin: 0 }}>
            Al guardar entrarás a la edición del evento.
          </p>
        </aside>
      ) : (
        <div className="nv-row" style={{ justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
          {msg && !formError && <span className="nv-small" style={{ color: 'var(--nv-success)' }}>{msg}</span>}
          <button disabled={saving} type="submit" className="nv-btn nv-btn-primary">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </form>
  );
}
