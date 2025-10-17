// components/RegistrationRequestForm.jsx
'use client';
import { useState } from 'react';
import { sendRegistrationRequest } from '@/lib/registrationApi';

export default function RegistrationRequestForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    website: '',
    instagram: '',
    notes: '',
    accept: false,
  });
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  function set(k, v) { setForm(s => ({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setOkMsg(''); setErrMsg('');
    if (!form.accept) { setErrMsg('Debes aceptar los términos.'); return; }
    if (!form.name || !form.email) { setErrMsg('Nombre del club y email son obligatorios.'); return; }
    setLoading(true);
    try {
      await sendRegistrationRequest({
        name: form.name,
        email: form.email,
        city: form.city,
        website: form.website,
        instagram: form.instagram,
        notes: form.notes,
      });
      setOkMsg('¡Solicitud enviada! Revisa tu correo para verificar la dirección.');
    } catch (e) {
      setErrMsg(e.message || 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #1f2937',
    background: '#0b1220',
    color: '#e5e7eb',
  };

  return (
    <form onSubmit={onSubmit} style={{
      display: 'grid', gap: 12, maxWidth: 640, margin: '0 auto',
      background: '#0b0f19', padding: 16, border: '1px solid #1d263a', borderRadius: 14
    }}>
      <h2 style={{ margin: 0 }}>Solicitar cuenta de club</h2>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Nombre del club *</span>
        <input style={input} value={form.name} onChange={e=>set('name', e.target.value)} placeholder="NightVibe Club" />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Email de contacto *</span>
        <input style={input} type="email" value={form.email} onChange={e=>set('email', e.target.value)} placeholder="contacto@club.com" />
      </label>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Ciudad</span>
          <input style={input} value={form.city} onChange={e=>set('city', e.target.value)} placeholder="Barcelona" />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Web</span>
          <input style={input} value={form.website} onChange={e=>set('website', e.target.value)} placeholder="https://..." />
        </label>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Instagram</span>
        <input style={input} value={form.instagram} onChange={e=>set('instagram', e.target.value)} placeholder="@tuclub" />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Notas (opcional)</span>
        <textarea rows={4} style={{ ...input, resize: 'vertical' }} value={form.notes} onChange={e=>set('notes', e.target.value)} placeholder="Cuéntanos algo sobre el club..." />
      </label>

      <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#cbd5e1' }}>
        <input type="checkbox" checked={form.accept} onChange={e=>set('accept', e.target.checked)} />
        <span>Acepto validar mi email y que revisemos la solicitud.</span>
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button disabled={loading} type="submit" style={{
          padding: '10px 14px', borderRadius: 10, border: '1px solid #0ea5e9',
          background: loading ? '#0b1220' : '#0ea5e9', color: loading ? '#64748b' : '#001018', fontWeight: 700
        }}>
          {loading ? 'Enviando…' : 'Enviar solicitud'}
        </button>
        <a href="/register/verify" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', textDecoration: 'none', color: '#e5e7eb' }}>
          Ya tengo token de verificación
        </a>
      </div>

      {okMsg && <div style={{ padding: 12, borderRadius: 10, background: '#052e1a', border: '1px solid #14532d', color: '#86efac' }}>{okMsg}</div>}
      {errMsg && <div style={{ padding: 12, borderRadius: 10, background: '#2a0a0a', border: '1px solid #7f1d1d', color: '#fecaca' }}>{errMsg}</div>}
    </form>
  );
}