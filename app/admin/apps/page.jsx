'use client';

import { useEffect, useState } from 'react';
import { toast, confirmDialog } from '@/components/Toast';

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
    const ok = await confirmDialog({
      title: 'Aprobar solicitud',
      message: '¿Aprobar esta solicitud de club?',
      confirmText: 'Aprobar',
    });
    if (!ok) return;
    setMsg('');
    const res = await fetch(`${API}/api/registration/applications/${id}/approve`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || 'No se pudo aprobar');
      return;
    }
    toast.success('Solicitud aprobada');
    load();
  }

  async function reject(id) {
    const reason = window.prompt('Motivo del rechazo (opcional). Deja el campo vacío y acepta para rechazar sin motivo:');
    if (reason === null) return; // cancelado
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
    toast.success('Solicitud rechazada');
    load();
  }

  const seg = (key, label) => (
    <button
      type="button"
      onClick={() => setStatus(key)}
      className={`nv-seg-btn ${status === key ? 'is-active' : ''}`}
    >
      {label}
    </button>
  );

  const statusBadge = (s) => {
    const cls =
      s === 'approved' ? 'nv-badge-success'
      : s === 'rejected' ? 'nv-badge-danger'
      : s === 'pending' ? 'nv-badge-warn'
      : 'nv-badge-neutral';
    return <span className={`nv-badge ${cls}`}>{s}</span>;
  };

  return (
    <main className="nv-page">
      <div className="nv-shell">
        <section className="nv-hero">
          <div className="nv-badge">Administración</div>
          <h1 className="nv-h1" style={{ marginTop: 16 }}>Solicitudes de clubs</h1>
        </section>

        <div className="nv-seg" role="tablist">
          {seg('pending', 'Pendientes')}
          {seg('email_verified', 'Email verificado')}
          {seg('approved', 'Aprobados')}
          {seg('rejected', 'Rechazados')}
        </div>

        {msg && <p role="alert" className="nv-notice nv-notice-error">{msg}</p>}

        {loading ? (
          <div className="nv-card">
            <div className="nv-skeleton nv-skeleton-line lg" />
            <div className="nv-skeleton nv-skeleton-line" />
            <div className="nv-skeleton nv-skeleton-line" />
          </div>
        ) : !items?.length ? (
          <div className="nv-empty">
            <h2 className="nv-empty-title">No hay solicitudes</h2>
            <p className="nv-empty-text">No hay solicitudes con este estado.</p>
          </div>
        ) : (
          <ul className="nv-list">
            {items.map(it => (
              <li key={it._id} className="nv-item">
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <strong className="nv-truncate">{it.clubName}</strong>
                  <span className="nv-small nv-muted nv-truncate">{it.email}</span>
                </div>
                <div className="nv-row" style={{ marginLeft: 'auto', gap: 8 }}>
                  {statusBadge(it.status)}
                  {status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => approve(it._id)}
                      className="nv-btn nv-btn-primary"
                    >Aprobar</button>
                  )}
                  {status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => reject(it._id)}
                      className="nv-btn nv-btn-danger"
                    >Rechazar</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
