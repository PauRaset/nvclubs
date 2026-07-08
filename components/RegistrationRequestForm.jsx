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

  return (
    <form
      onSubmit={onSubmit}
      className="nv-card"
      style={{ display: 'grid', gap: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}
    >
      <h2 className="nv-h3">Solicitar cuenta de club</h2>

      <label className="nv-field">
        <span className="nv-label">Nombre del club *</span>
        <input className="nv-input" value={form.name} onChange={e=>set('name', e.target.value)} placeholder="NightVibe Club" />
      </label>

      <label className="nv-field">
        <span className="nv-label">Email de contacto *</span>
        <input className="nv-input" type="email" value={form.email} onChange={e=>set('email', e.target.value)} placeholder="contacto@club.com" />
      </label>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <label className="nv-field">
          <span className="nv-label">Ciudad</span>
          <input className="nv-input" value={form.city} onChange={e=>set('city', e.target.value)} placeholder="Barcelona" />
        </label>
        <label className="nv-field">
          <span className="nv-label">Web</span>
          <input className="nv-input" value={form.website} onChange={e=>set('website', e.target.value)} placeholder="https://..." />
        </label>
      </div>

      <label className="nv-field">
        <span className="nv-label">Instagram</span>
        <input className="nv-input" value={form.instagram} onChange={e=>set('instagram', e.target.value)} placeholder="@tuclub" />
      </label>

      <label className="nv-field">
        <span className="nv-label">Notas (opcional)</span>
        <textarea className="nv-textarea" rows={4} value={form.notes} onChange={e=>set('notes', e.target.value)} placeholder="Cuéntanos algo sobre el club..." />
      </label>

      <label className="nv-row" style={{ gap: 10, flexWrap: 'nowrap' }}>
        <input type="checkbox" checked={form.accept} onChange={e=>set('accept', e.target.checked)} />
        <span className="nv-small nv-muted">Acepto validar mi email y que revisemos la solicitud.</span>
      </label>

      <div className="nv-row">
        <button disabled={loading} type="submit" className="nv-btn nv-btn-primary">
          {loading ? 'Enviando…' : 'Enviar solicitud'}
        </button>
        <a href="/register/verify" className="nv-btn nv-btn-ghost">
          Ya tengo token de verificación
        </a>
      </div>

      {okMsg && <p role="status" aria-live="polite" className="nv-notice nv-notice-success">{okMsg}</p>}
      {errMsg && <p role="alert" aria-live="assertive" className="nv-notice nv-notice-error">{errMsg}</p>}
    </form>
  );
}
