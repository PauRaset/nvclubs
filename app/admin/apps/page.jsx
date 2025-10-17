'use client';

import { useEffect, useState } from 'react';

export default function AdminAppsPage() {
  const API =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.nightvibe.life';

  const [status, setStatus] = useState('email_verified'); // pending | email_verified | approved | rejected
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/registration/applications?status=${status}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar');
      setItems(data.items || []);
    } catch (e) {
      setMsg(e.message || 'Error cargando solicitudes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  async function approve(id) {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    setMsg('');
    const res = await fetch(`${API}/api/registration/applications/${id}/approve`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || 'No se pudo aprobar');
      return;
    }
    setMsg('✅ Aprobada');
    load();
  }

  async function reject(id) {
    const reason = prompt('Motivo de rechazo (opcional):') || '';
    const res = await fetch(`${API}/api/registration/applications/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || 'No se pudo rechazar');
      return;
    }
    setMsg('🚫 Rechazada');
    load();
  }

  const tab = (key, label) => (
    <button
      onClick={() => setStatus(key)}
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid #1f2937',
        background: status === key ? 'linear-gradient(90deg,#0ea5e9,#6366f1)' : '#0b0f19',
        color: status === key ? '#001018' : '#e5e7eb',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      padding: 16, color: '#e5e7eb'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Solicitudes de clubs</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {tab('pending', 'Pendientes')}
          {tab('email_verified', 'Email verificado')}
          {tab('approved', 'Aprobados')}
          {tab('rejected', 'Rechazados')}
        </div>

        {msg && <p style={{ marginBottom: 8 }}>{msg}</p>}
        {loading ? <p>Cargando…</p> : (
          <div style={{
            border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden',
            background: 'rgba(11,15,25,.6)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0b1220' }}>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #1f2937' }}>Club</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #1f2937' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #1f2937' }}>Estado</th>
                  <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #1f2937' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map(it => (
                  <tr key={it._id}>
                    <td style={{ padding: 10, borderTop: '1px solid #1f2937' }}>{it.clubName}</td>
                    <td style={{ padding: 10, borderTop: '1px solid #1f2937' }}>{it.email}</td>
                    <td style={{ padding: 10, borderTop: '1px solid #1f2937' }}>{it.status}</td>
                    <td style={{ padding: 10, borderTop: '1px solid #1f2937', textAlign: 'right' }}>
                      {status !== 'approved' && (
                        <button
                          onClick={() => approve(it._id)}
                          style={{ marginRight: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #1f2937', background: '#10b981', color: '#001015', fontWeight: 700 }}
                        >Aprobar</button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          onClick={() => reject(it._id)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1f2937', background: '#ef4444', color: '#fff', fontWeight: 700 }}
                        >Rechazar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!items?.length && (
                  <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#93a4b8' }}>No hay solicitudes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}