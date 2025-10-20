
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
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
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

    setMsg('✅ Guardado');
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
      } else {
        alert(r.data?.message || `No se pudo borrar (HTTP ${r.status})`);
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo borrar la foto.');
    } finally {
      setDeletingIdx(null);
    }
  }

  // ====== UI ======
  return (
    <form onSubmit={handleSubmit} style={sx.form}>
      {/* Encabezado */}
      <div style={sx.header}>
        <div>
          <h1 style={sx.h1}>{mode === 'create' ? 'Crear evento' : 'Editar evento'}</h1>
          <p style={sx.muted}>Completa los detalles del evento. La imagen se recorta automáticamente a 800×450.</p>
        </div>
        <button
          disabled={saving}
          type="submit"
          style={sx.primary}
        >
          {saving ? 'Guardando...' : (mode === 'create' ? 'Crear evento' : 'Guardar cambios')}
        </button>
      </div>

      {formError && <div role="alert" style={sx.errorBox}>{formError}</div>}
      {msg && !formError && <div style={sx.okBox}>{msg}</div>}

      {/* Card: Datos básicos */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Datos básicos</h2>
        <div style={sx.grid2}>
          <label style={sx.label}>
            Título <span style={sx.req}>*</span>
            <input
              value={title}
              onChange={e=>setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="Nombre del evento"
              style={sx.input}
            />
          </label>

          <label style={sx.label}>
            Código de vestimenta
            <input
              value={dressCode}
              onChange={e=>setDressCode(e.target.value)}
              placeholder="casual, elegante..."
              maxLength={80}
              style={sx.input}
            />
          </label>
        </div>

        <label style={sx.label}>
          Descripción
          <textarea
            value={description}
            onChange={e=>setDescription(e.target.value)}
            rows={5}
            placeholder="Cuéntale a la gente qué hará especial tu evento…"
            style={sx.textarea}
          />
        </label>
      </section>

      {/* Card: Fechas */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Fechas</h2>
        <div style={sx.grid2}>
          <label style={sx.label}>
            Inicio <span style={sx.req}>*</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={e=>setStartAt(e.target.value)}
              required
              style={sx.input}
            />
          </label>
          <label style={sx.label}>
            Fin <span style={sx.req}>*</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={e=>setEndAt(e.target.value)}
              required
              style={sx.input}
            />
          </label>
        </div>
      </section>

      {/* Card: Ubicación */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Ubicación</h2>
        <label style={sx.label}>
          Calle
          <input
            value={street}
            onChange={e=>setStreet(e.target.value)}
            placeholder="Calle, número, piso..."
            style={sx.input}
          />
        </label>
        <div style={sx.grid2}>
          <label style={sx.label}>
            Ciudad
            <input
              value={city}
              onChange={e=>setCity(e.target.value)}
              style={sx.input}
            />
          </label>
          <label style={sx.label}>
            Código postal
            <input
              value={postalCode}
              onChange={e=>setPostalCode(e.target.value)}
              style={sx.input}
            />
          </label>
        </div>
      </section>

      {/* Card: Música */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Categorías musicales</h2>
        {/* Chips de seleccionados */}
        {categories.length > 0 && (
          <div style={sx.chipsWrap}>
            {categories.map(cat => (
              <button
                key={`chip-${cat}`}
                type="button"
                onClick={() => toggleCategory(cat)}
                title="Quitar"
                style={sx.chip}
              >
                {cat} <span style={sx.chipX}>×</span>
              </button>
            ))}
          </div>
        )}

        <div style={sx.genreActions}>
          <div style={{display:'flex', gap:8, flex:1}}>
            <input
              placeholder="Buscar género…"
              value={genreQuery}
              onChange={e=>setGenreQuery(e.target.value)}
              style={{...sx.input, maxWidth:360}}
            />
            <button type="button" style={sx.ghost} onClick={() => setGenreQuery('')}>Limpiar búsqueda</button>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button
              type="button"
              style={sx.ghost}
              onClick={() => setCategories(uniq([...ALL_GENRES]))}
              title="Seleccionar todos los géneros"
            >
              Seleccionar todo
            </button>
            <button
              type="button"
              style={sx.ghostDanger}
              onClick={() => setCategories([])}
              title="Limpiar selección"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div style={sx.genreGrid}>
          {visibleGenres.map(cat => {
            const checked = categories.includes(cat);
            return (
              <label key={cat} style={sx.genreItem(checked)}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={()=>toggleCategory(cat)}
                  style={{marginRight:8}}
                />
                {cat}
              </label>
            );
          })}
        </div>

        <label style={{...sx.label, marginTop:12}}>
          Otras categorías (separadas por comas)
          <input
            value={otherCats}
            onChange={e=>setOtherCats(e.target.value)}
            placeholder="p.ej. techno melódico, indie dance"
            style={sx.input}
          />
        </label>
      </section>

      {/* Card: Detalles */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Detalles</h2>
        <div style={sx.grid3}>
          <label style={sx.label}>
            Precio (€)
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={e=>setPrice(e.target.value)}
              placeholder="p.ej. 15"
              style={sx.input}
            />
          </label>
          <label style={sx.label}>
            Edad mínima
            <input
              type="number"
              min="0"
              step="1"
              value={age}
              onChange={e=>setAge(e.target.value)}
              placeholder="18"
              style={sx.input}
            />
          </label>
          <div />
        </div>
      </section>

      {/* Card: Imagen */}
      <section style={sx.card}>
        <h2 style={sx.h2}>Imagen principal</h2>
        <p style={sx.mutedSmall}>Se recorta automáticamente a 800×450 (formato .webp).</p>
        <label style={sx.fileLabel}>
          <span>Seleccionar imagen…</span>
          <input type="file" accept="image/*" onChange={onPick} style={{ display:'none' }}/>
        </label>

        {preview && (
          <div style={{marginTop:12}}>
            <div style={sx.mutedSmall}>Previsualización</div>
            <img
              src={preview}
              alt="preview"
              style={{ width:480, height:270, objectFit:'cover', borderRadius:10, border:'1px solid #243044' }}
            />
          </div>
        )}
      </section>

      {/* Card: Galería (sólo edición) */}
      {mode !== 'create' && (
        <section style={sx.card}>
          <h2 style={sx.h2}>Fotos subidas por asistentes</h2>
          {loadingPhotos ? (
            <div style={sx.muted}>Cargando galería…</div>
          ) : photos.length === 0 ? (
            <div style={sx.muted}>Aún no hay fotos en la galería.</div>
          ) : (
            <div style={sx.galleryGrid}>
              {photos.map((ph, idx) => (
                <div key={`${ph.url}-${idx}`} style={sx.photoCell}>
                  <img src={ph.url} alt={`photo-${idx}`} style={sx.photoImg}/>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(idx)}
                      disabled={deletingIdx === idx}
                      title="Eliminar foto"
                      style={sx.deleteBtn(deletingIdx === idx)}
                    >
                      {deletingIdx === idx ? 'Borrando…' : 'Eliminar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isOwner && photos.length > 0 && (
            <div style={sx.mutedSmall}>* Solo el creador del evento puede eliminar fotos.</div>
          )}
        </section>
      )}

      {/* Footer actions */}
      <div style={sx.footer}>
        <button
          disabled={saving}
          type="submit"
          style={sx.primary}
        >
          {saving ? 'Guardando...' : (mode === 'create' ? 'Crear evento' : 'Guardar cambios')}
        </button>
        {msg && !formError && <span style={sx.okInline}>{msg}</span>}
      </div>
    </form>
  );
}

/* ================== estilos inline (oscuro minimal) ================== */
const sx = {
  form: {
    display:'grid',
    gap:16,
    maxWidth:920,
    margin:'0 auto',
    color:'#e5e7eb',
  },
  header: {
    display:'flex',
    alignItems:'center',
    justifyContent:'space-between',
    background:'#0d1526',
    border:'1px solid #1f2b43',
    borderRadius:12,
    padding:16,
  },
  h1: { fontSize:22, margin:0, fontWeight:800 },
  h2: { fontSize:18, margin:'0 0 10px 0', fontWeight:800 },
  muted: { opacity:.8, marginTop:4 },
  mutedSmall: { opacity:.7, fontSize:12 },
  card: {
    background:'#0b1220',
    border:'1px solid #1f2b43',
    borderRadius:12,
    padding:16,
  },
  grid2: {
    display:'grid',
    gridTemplateColumns:'1fr 1fr',
    gap:12,
  },
  grid3: {
    display:'grid',
    gridTemplateColumns:'1fr 1fr 1fr',
    gap:12,
  },
  label: { display:'grid', gap:6, fontSize:14 },
  input: {
    width:'100%',
    padding:'10px 12px',
    borderRadius:10,
    border:'1px solid #243044',
    background:'#0d1526',
    color:'#e5e7eb',
    outline:'none',
  },
  textarea: {
    width:'100%',
    padding:'10px 12px',
    minHeight:120,
    borderRadius:10,
    border:'1px solid #243044',
    background:'#0d1526',
    color:'#e5e7eb',
    outline:'none',
    resize:'vertical',
  },
  req: { color:'#00e5ff', marginLeft:6, fontWeight:800 },
  primary: {
    background:'#00e5ff',
    color:'#001018',
    padding:'10px 16px',
    borderRadius:10,
    fontWeight:800,
    border:'1px solid #00b9d1',
    cursor:'pointer',
  },
  ghost: {
    background:'#0d1526',
    color:'#cbd5e1',
    padding:'10px 12px',
    borderRadius:10,
    fontWeight:700,
    border:'1px solid #243044',
    cursor:'pointer',
  },
  ghostDanger: {
    background:'#111827',
    color:'#f87171',
    padding:'10px 12px',
    borderRadius:10,
    fontWeight:800,
    border:'1px solid #7f1d1d',
    cursor:'pointer',
  },
  errorBox: {
    background:'#1b0e12',
    border:'1px solid #7f1d1d',
    color:'#fecaca',
    padding:12,
    borderRadius:10,
  },
  okBox: {
    background:'#0e1b17',
    border:'1px solid #14532d',
    color:'#bbf7d0',
    padding:12,
    borderRadius:10,
  },
  okInline: { color:'#86efac', marginLeft:12, fontSize:13 },

  /* Géneros */
  genreActions: {
    display:'flex',
    justifyContent:'space-between',
    alignItems:'center',
    gap:12,
    margin:'8px 0 12px',
    flexWrap:'wrap',
  },
  genreGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
    gap:8,
  },
  genreItem: (checked) => ({
    display:'flex',
    alignItems:'center',
    gap:8,
    padding:'8px 10px',
    borderRadius:10,
    border:'1px solid ' + (checked ? '#00b9d1' : '#243044'),
    background: checked ? '#08222a' : '#0d1526',
    cursor:'pointer',
    userSelect:'none',
    fontSize:14,
  }),
  chipsWrap: {
    display:'flex',
    flexWrap:'wrap',
    gap:8,
    marginBottom:8,
  },
  chip: {
    border:'1px solid #00b9d1',
    background:'#08222a',
    color:'#c3f3fb',
    padding:'6px 10px',
    borderRadius:999,
    fontSize:13,
    cursor:'pointer',
  },
  chipX: { marginLeft:6, opacity:.8 },

  /* Imagen */
  fileLabel: {
    display:'inline-flex',
    alignItems:'center',
    gap:8,
    background:'#0d1526',
    border:'1px solid #243044',
    color:'#cbd5e1',
    padding:'10px 12px',
    borderRadius:10,
    fontWeight:700,
    cursor:'pointer',
    width:'fit-content',
  },

  /* Galería */
  galleryGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',
    gap:12,
    marginTop:8,
  },
  photoCell: {
    position:'relative',
    border:'1px solid #243044',
    borderRadius:10,
    overflow:'hidden',
    height:140,
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    background:'#0b1220'
  },
  photoImg: { width:'100%', height:'100%', objectFit:'cover' },
  deleteBtn: (disabled) => ({
    position:'absolute',
    top:6,
    right:6,
    padding:'6px 8px',
    borderRadius:8,
    border:'1px solid #ef4444',
    background: disabled ? '#1f2937' : '#111827',
    color:'#ef4444',
    fontWeight:700,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }),

  footer: {
    display:'flex',
    alignItems:'center',
    gap:12,
    justifyContent:'flex-end',
    marginTop:4,
  },
};

/*'use client';
import { useEffect, useState } from 'react';
import {
  createEvent,
  updateEvent,
  uploadEventImage,
  fetchEventPhotos,
  deleteEventPhoto,
} from '@/lib/eventsApi';
import { getUser } from '@/lib/apiClient';

// --- Recorte simple: centra y reescala a 800x450 --- 
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

// Lista base de géneros (puedes editarla libremente) 
const GENRES = [
  'House', 'Techno', 'EDM', 'Reggaeton', 'Hip-Hop', 'Trap',
  'Commercial', 'Deep House', 'Tech House', 'Drum & Bass',
  'Afro', 'Latin', 'R&B'
];

// Convierte Date o ISO a valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm) 
function toLocalInputValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  // A datetime-local NO lleva zona; rellenamos con hora local
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Pasa valor de <input datetime-local> a ISO 
function localToISO(v) {
  if (!v) return null;
  // 'YYYY-MM-DDTHH:mm' se interpreta en local → Date → toISOString()
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Extrae un id de propietario desde createdBy (string u objeto) 
function ownerIdFrom(createdBy) {
  if (!createdBy) return null;
  if (typeof createdBy === 'string') return createdBy;
  return createdBy._id || createdBy.id || createdBy.toString?.() || null;
}

export default function EventForm({ initial = null, onSaved, mode = 'create' }) {
  // Normaliza props iniciales (acepta claves nuevas o antiguas)
  const initialStart = initial?.startAtISO || initial?.startAt || initial?.dateISO || initial?.date || null;
  const initialEnd   = initial?.endAtISO   || initial?.endAt   || null;

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
  const [otherCats, setOtherCats] = useState(''); // extra por comas opcional
  const [dressCode, setDressCode] = useState(initial?.dressCode || '');
  const [age, setAge] = useState(initial?.age ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');

  // Imagen
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Galería (solo en edición)
  const [photos, setPhotos] = useState([]);       // [{url, byUsername?, uploadedAt?}]
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);

  // Estado
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Previsualización: usa imageUrl o image si es string absoluta/relativa
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

  // Handlers categorías
  function toggleCategory(cat) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function mergedCategories() {
    const base = new Set(categories.map(String));
    if (otherCats.trim()) {
      otherCats.split(',').map(s => s.trim()).filter(Boolean).forEach(s => base.add(s));
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('Guardando...');

    // Validación mínima fechas
    const startISO = localToISO(startAt);
    const endISO = localToISO(endAt);
    if (!startISO || !endISO) {
      setSaving(false);
      return setMsg('Introduce fechas de inicio y fin válidas.');
    }
    if (new Date(endISO) < new Date(startISO)) {
      setSaving(false);
      return setMsg('La fecha de fin no puede ser anterior al inicio.');
    }

    // Construye payload esperado por lib/eventsApi (mapEventForSave lo adaptará)
    const payload = {
      title,
      description,
      startAt: startISO,
      endAt: endISO,
      street,
      city,
      postalCode,
      categories: mergedCategories(),
      dressCode,
      age: age === '' ? null : Number(age),
      price: price === '' ? null : Number(price),
    };

    const res = mode === 'create'
      ? await createEvent(payload)
      : await updateEvent(initial?._id || initial?.id, payload);

    if (!res.ok) {
      setSaving(false);
      return setMsg(res.data?.message || `Error (HTTP ${res.status})`);
    }

    const saved = res.data;

    // Subida de imagen si se seleccionó
    if (imageFile) {
      try {
        const cropped = await cropTo800x450(imageFile);
        const targetId = saved?.id || saved?._raw?._id || initial?._id || initial?.id;
        const up = await uploadEventImage(targetId, cropped);
        if (!up.ok) {
          setMsg(`Evento guardado, pero la imagen falló (HTTP ${up.status})`);
        }
      } catch (err) {
        console.error(err);
        setMsg('Evento guardado, pero no se pudo procesar la imagen.');
      }
    }

    setMsg('✅ Guardado');
    setSaving(false);
    if (onSaved) onSaved(saved);
  }

  async function handleDeletePhoto(idx) {
    if (idx < 0 || idx >= photos.length) return;
    const id = initial?.id || initial?._id || initial?._raw?._id;
    if (!id) return;

    if (!isOwner) return; // doble cierre en cliente

    const photo = photos[idx];
    setDeletingIdx(idx);
    try {
      const r = await deleteEventPhoto(id, { url: photo?.url, idx });
      if (r.ok) {
        setPhotos(prev => prev.filter((_, i) => i !== idx));
      } else {
        alert(r.data?.message || `No se pudo borrar (HTTP ${r.status})`);
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo borrar la foto.');
    } finally {
      setDeletingIdx(null);
    }
  }

  // ====== CÁLCULO DEL OWNER EN CLIENTE (si el backend no trajo initial.isOwner) ======
  const currentUserId = getUser()?.id || null;
  const createdByCandidate =
    initial?.createdBy ??
    initial?._raw?.createdBy ??
    null;
  const createdById = ownerIdFrom(createdByCandidate);
  const computedIsOwner = currentUserId && createdById
    ? String(currentUserId) === String(createdById)
    : false;

  const isOwner = initial?.isOwner ?? computedIsOwner;

  return (
    <form onSubmit={handleSubmit} style={{ display:'grid', gap:12, maxWidth:720 }}>
      <h2 style={{ margin:'6px 0 2px', fontSize:18, fontWeight:700 }}>Datos básicos</h2>

      <label>
        Título
        <input
          value={title}
          onChange={e=>setTitle(e.target.value)}
          required
          style={{ width:'100%', padding:10, borderRadius:8 }}
        />
      </label>

      <label>
        Descripción
        <textarea
          value={description}
          onChange={e=>setDescription(e.target.value)}
          rows={4}
          style={{ width:'100%', padding:10, borderRadius:8 }}
        />
      </label>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <label>
          Inicio
          <input
            type="datetime-local"
            value={startAt}
            onChange={e=>setStartAt(e.target.value)}
            required
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
        <label>
          Fin
          <input
            type="datetime-local"
            value={endAt}
            onChange={e=>setEndAt(e.target.value)}
            required
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
      </div>

      <h2 style={{ margin:'12px 0 2px', fontSize:18, fontWeight:700 }}>Ubicación</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
        <label>
          Calle
          <input
            value={street}
            onChange={e=>setStreet(e.target.value)}
            placeholder="Calle, número, piso..."
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
          <label>
            Ciudad
            <input
              value={city}
              onChange={e=>setCity(e.target.value)}
              style={{ width:'100%', padding:10, borderRadius:8 }}
            />
          </label>
          <label>
            Código postal
            <input
              value={postalCode}
              onChange={e=>setPostalCode(e.target.value)}
              style={{ width:'100%', padding:10, borderRadius:8 }}
            />
          </label>
        </div>
      </div>

      <h2 style={{ margin:'12px 0 2px', fontSize:18, fontWeight:700 }}>Categorías musicales</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
        {GENRES.map(cat => (
          <label key={cat} style={{ display:'flex', alignItems:'center', gap:8, fontSize:14 }}>
            <input
              type="checkbox"
              checked={categories.includes(cat)}
              onChange={()=>toggleCategory(cat)}
            />
            {cat}
          </label>
        ))}
      </div>
      <label>
        Otras categorías (separadas por comas)
        <input
          value={otherCats}
          onChange={e=>setOtherCats(e.target.value)}
          placeholder="p.ej. techno melódico, indie dance"
          style={{ width:'100%', padding:10, borderRadius:8 }}
        />
      </label>

      <h2 style={{ margin:'12px 0 2px', fontSize:18, fontWeight:700 }}>Detalles</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <label>
          Precio (€)
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={e=>setPrice(e.target.value)}
            placeholder="p.ej. 15"
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
        <label>
          Edad mínima
          <input
            type="number"
            min="0"
            step="1"
            value={age}
            onChange={e=>setAge(e.target.value)}
            placeholder="18"
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
        <label>
          Código de vestimenta
          <input
            value={dressCode}
            onChange={e=>setDressCode(e.target.value)}
            placeholder="casual, elegante..."
            style={{ width:'100%', padding:10, borderRadius:8 }}
          />
        </label>
      </div>

      <h2 style={{ margin:'12px 0 2px', fontSize:18, fontWeight:700 }}>Imagen principal</h2>
      <label>
        (Se recorta automáticamente a 800×450)
        <input type="file" accept="image/*" onChange={onPick}/>
      </label>

      {preview && (
        <div>
          <div style={{ fontSize:12, opacity:0.7, marginBottom:6 }}>Previsualización</div>
          <img
            src={preview}
            alt="preview"
            style={{ width:400, height:225, objectFit:'cover', borderRadius:8, border:'1px solid #243044' }}
          />
        </div>
      )}

      {mode !== 'create' && (
        <div style={{ marginTop:16 }}>
          <h2 style={{ margin:'12px 0 8px', fontSize:18, fontWeight:700 }}>
            Fotos subidas por asistentes
          </h2>
          {loadingPhotos ? (
            <div style={{ opacity:0.8 }}>Cargando galería…</div>
          ) : photos.length === 0 ? (
            <div style={{ opacity:0.8 }}>Aún no hay fotos en la galería.</div>
          ) : (
            <div
              style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',
                gap:12
              }}
            >
              {photos.map((ph, idx) => (
                <div
                  key={`${ph.url}-${idx}`}
                  style={{
                    position:'relative',
                    border:'1px solid #243044',
                    borderRadius:10,
                    overflow:'hidden',
                    height:120,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    background:'#0b1220'
                  }}
                >
                  <img
                    src={ph.url}
                    alt={`photo-${idx}`}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  />
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(idx)}
                      disabled={deletingIdx === idx}
                      title="Eliminar foto"
                      style={{
                        position:'absolute',
                        top:6,
                        right:6,
                        padding:'6px 8px',
                        borderRadius:8,
                        border:'1px solid #ef4444',
                        background: deletingIdx === idx ? '#1f2937' : '#111827',
                        color:'#ef4444',
                        fontWeight:700,
                        cursor: deletingIdx === idx ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {deletingIdx === idx ? 'Borrando…' : 'Eliminar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isOwner && photos.length > 0 && (
            <div style={{ marginTop:8, fontSize:12, opacity:0.7 }}>
              * Solo el creador del evento puede eliminar fotos.
            </div>
          )}
        </div>
      )}

      <button
        disabled={saving}
        type="submit"
        style={{ padding:12, borderRadius:10, background:'#00e5ff', color:'#001018', fontWeight:600, marginTop:12 }}
      >
        {saving ? 'Guardando...' : (mode === 'create' ? 'Crear evento' : 'Guardar cambios')}
      </button>

      <div style={{ minHeight:20 }}>{msg}</div>
    </form>
  );
}*/
