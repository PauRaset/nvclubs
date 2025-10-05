'use client';
import { useEffect, useState } from 'react';
import { createEvent, updateEvent, uploadEventImage } from '@/lib/eventsApi';

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

/* Lista base de géneros (puedes editarla libremente) */
const GENRES = [
  'House', 'Techno', 'EDM', 'Reggaeton', 'Hip-Hop', 'Trap',
  'Commercial', 'Deep House', 'Tech House', 'Drum & Bass',
  'Afro', 'Latin', 'R&B'
];

/* Convierte Date o ISO a valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm) */
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

/* Pasa valor de <input datetime-local> a ISO */
function localToISO(v) {
  if (!v) return null;
  // 'YYYY-MM-DDTHH:mm' se interpreta en local → Date → toISOString()
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
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

  // Estado
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Previsualización: usa imageUrl o image si es string absoluta/relativa
    const p = initial?.imageUrl || initial?.image || null;
    if (p && typeof p === 'string') setPreview(p);
  }, [initial]);

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

      <button
        disabled={saving}
        type="submit"
        style={{ padding:12, borderRadius:10, background:'#00e5ff', color:'#001018', fontWeight:600 }}
      >
        {saving ? 'Guardando...' : (mode === 'create' ? 'Crear evento' : 'Guardar cambios')}
      </button>

      <div style={{ minHeight:20 }}>{msg}</div>
    </form>
  );
}

/*'use client';
import { useEffect, useState, useRef } from 'react';
import { createEvent, updateEvent, uploadEventImage } from '@/lib/eventsApi';

// Recorte simple: centra y reescala a 800x450
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
    // sobra ancho → recortar lados
    sh = h;
    sw = Math.round(h * targetRatio);
    sx = Math.floor((w - sw) / 2);
    sy = 0;
  } else {
    // sobra alto → recortar arriba/abajo
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

export default function EventForm({ initial = null, onSaved, mode = 'create' }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [startAt, setStartAt] = useState(initial?.startAt ? new Date(initial.startAt).toISOString().slice(0,16) : '');
  const [endAt, setEndAt] = useState(initial?.endAt ? new Date(initial.endAt).toISOString().slice(0,16) : '');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (initial?.heroImage && typeof initial.heroImage === 'string') {
      setPreview(initial.heroImage);
    }
  }, [initial]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setMsg('Guardando...');

    // payload mínimo: AJUSTA las keys si tu backend espera otros nombres
    const payload = {
      title,
      description,
      category,
      startAt: new Date(startAt).toISOString(),
      endAt:   new Date(endAt).toISOString()
    };

    const res = mode === 'create'
      ? await createEvent(payload)
      : await updateEvent(initial._id || initial.id, payload);

    if (!res.ok) {
      setSaving(false);
      return setMsg(res.data?.message || `Error (HTTP ${res.status})`);
    }

    const saved = res.data;

    // Subir imagen si se seleccionó
    if (imageFile) {
      try {
        const cropped = await cropTo800x450(imageFile);
        const up = await uploadEventImage(saved._id || saved.id || initial._id || initial.id, cropped);
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

  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'grid', gap:12, maxWidth:640 }}>
      <label>
        Título
        <input value={title} onChange={e=>setTitle(e.target.value)} required style={{ width:'100%', padding:10, borderRadius:8 }}/>
      </label>

      <label>
        Descripción
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4}
                  style={{ width:'100%', padding:10, borderRadius:8 }}/>
      </label>

      <label>
        Categoría musical
        <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="house, techno, reggaeton..."
               style={{ width:'100%', padding:10, borderRadius:8 }}/>
      </label>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <label>
          Inicio
          <input type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} required
                 style={{ width:'100%', padding:10, borderRadius:8 }}/>
        </label>
        <label>
          Fin
          <input type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)} required
                 style={{ width:'100%', padding:10, borderRadius:8 }}/>
        </label>
      </div>

      <label>
        Imagen principal (se recorta a 800×450)
        <input type="file" accept="image/*" onChange={onPick}/>
      </label>

      {preview && (
        <div>
          <div style={{ fontSize:12, opacity:0.7, marginBottom:6 }}>Previsualización</div>
          <img src={preview} alt="preview" style={{ width:400, height:225, objectFit:'cover', borderRadius:8, border:'1px solid #243044' }}/>
        </div>
      )}

      <button disabled={saving} type="submit" style={{ padding:12, borderRadius:10, background:'#00e5ff', color:'#001018', fontWeight:600 }}>
        {saving ? 'Guardando...' : (mode === 'create' ? 'Crear evento' : 'Guardar cambios')}
      </button>

      <div style={{ minHeight:20 }}>{msg}</div>
    </form>
  );
}*/
