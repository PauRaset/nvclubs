'use client';
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
}