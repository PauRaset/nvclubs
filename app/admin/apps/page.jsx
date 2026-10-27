'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/apiBase';

// Llamada a las rutas de administración del registro con la clave de administrador
// en X-Admin-Key (sin Authorization ni cookies). La clave solo vive en el estado de React.
async function adminFetch(path, adminKey, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'X-Admin-Key': adminKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AdminAppsPage() {
  // Clave de administrador: SOLO en memoria. Al recargar o cerrar la pestaña se pierde.
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');

  const [status, setStatus] = useState('email_verified'); // pending | email_verified | approved | rejected
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 401/403: clave incorrecta -> se borra y se vuelve al campo. 503: administración desactivada.
  // Devuelve true si la respuesta ya se ha tratado como error de acceso.
  function handleAccessError(res) {
    if (res.status === 401 || res.status === 403) {
      setAdminKey('');
      setItems([]);
      setMsg('Clave incorrecta');
      return true;
    }
    if (res.status === 503) {
      setItems([]);
      setMsg('La administración está desactivada en el servidor');
      return true;
    }
    return false;
  }

  function enter(e) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    setMsg('');
    setAdminKey(k);
    setKeyInput('');
  }

  function logout() {
    setAdminKey('');
    setKeyInput('');
    setItems([]);
    setMsg('');
  }

  async function load() {
    if (!adminKey) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await adminFetch(`/api/registration/applications?status=${encodeURIComponent(status)}`, adminKey);
      if (handleAccessError(res)) return;
      if (!res.ok) {
        setItems([]);
        setMsg(res.data?.error || 'No se pudo cargar');
        return;
      }
      setItems(res.data?.items || []);
    } catch (e) {
      setItems([]);
      setMsg('No hay conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // No se carga nada hasta tener la clave.
  useEffect(() => { if (adminKey) load(); }, [status, adminKey]);

  async function approve(id) {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    setMsg('');
    try {
      const res = await adminFetch(`/api/registration/applications/${encodeURIComponent(id)}/approve`, adminKey, {
        method: 'POST',
      });
      if (handleAccessError(res)) return;
      if (!res.ok || !res.data?.ok) {
        setMsg(res.data?.error || 'No se pudo aprobar');
        return;
      }
    } catch (e) {
      setMsg('No hay conexión con el servidor. Inténtalo de nuevo.');
      return;
    }
    setMsg('✅ Aprobada');
    load();
  }

  async function reject(id) {
    const reason = prompt('Motivo de rechazo (opcional):') || '';
    setMsg('');
    try {
      const res = await adminFetch(`/api/registration/applications/${encodeURIComponent(id)}/reject`, adminKey, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (handleAccessError(res)) return;
      if (!res.ok || !res.data?.ok) {
        setMsg(res.data?.error || 'No se pudo rechazar');
        return;
      }
    } catch (e) {
      setMsg('No hay conexión con el servidor. Inténtalo de nuevo.');
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

  const pageBg = {
    minHeight: '100vh',
    background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
    padding: 16, color: '#e5e7eb'
  };

  if (!adminKey) {
    return (
      <main style={pageBg}>
        <form onSubmit={enter} style={{ maxWidth: 360, margin: '80px auto 0', display: 'grid', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Solicitudes de clubs</h1>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
            Clave de administrador
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
              autoFocus
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
            />
          </label>
          {msg && <p role="alert" style={{ margin: 0, color: '#fca5a5' }}>{msg}</p>}
          <button
            type="submit"
            disabled={!keyInput.trim()}
            style={{ padding: '10px 12px', borderRadius: 8, border: 0, background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#001018', fontWeight: 800, cursor: 'pointer', opacity: keyInput.trim() ? 1 : 0.6 }}
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.15) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.15) 0, transparent 60%), #0b0f19',
      padding: 16, color: '#e5e7eb'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Solicitudes de clubs</h1>
          <button
            type="button"
            onClick={logout}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1f2937', background: '#0b0f19', color: '#e5e7eb', fontWeight: 700, cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>

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