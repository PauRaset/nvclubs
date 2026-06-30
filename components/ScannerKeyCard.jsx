'use client';
import { useState } from 'react';
import { regenerateScannerKey } from '@/lib/clubsApi';

export default function ScannerKeyCard({ clubId, initialKey = '' }) {
  const [revealed, setRevealed] = useState(false);
  const [key, setKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function regen() {
    if (!confirm('Regenerar la clave invalidará la anterior. ¿Continuar?')) return;
    try {
      setLoading(true);
      const { scannerApiKey } = await regenerateScannerKey(clubId);
      setKey(scannerApiKey);
      setRevealed(true);
      setMsg('Nueva clave generada');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg(e.message || 'Error generando clave');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nv-card-soft" style={{ display: 'grid', gap: 10 }}>
      <p className="nv-small nv-muted" style={{ margin: 0 }}>
        Se envía en la cabecera <code>x-scanner-key</code> al usar el escáner.
      </p>

      {revealed ? (
        <pre
          style={{
            background: 'var(--nv-bg-soft)',
            border: '1px solid var(--nv-border-strong)',
            padding: 12,
            borderRadius: 'var(--nv-r-sm)',
            overflow: 'auto',
            fontSize: 13,
            margin: 0,
          }}
        >
          {key || '(vacía)'}
        </pre>
      ) : (
        <button onClick={() => setRevealed(true)} className="nv-btn nv-btn-ghost" style={{ width: 'fit-content' }}>
          Revelar clave
        </button>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={regen} disabled={loading} className="nv-btn nv-btn-primary">
          {loading ? 'Generando…' : 'Regenerar'}
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(key || '')}
          className="nv-btn nv-btn-ghost"
          disabled={!key}
        >
          Copiar
        </button>
      </div>

      {msg && <p className="nv-small" style={{ margin: 0, color: 'var(--nv-accent-2)' }}>{msg}</p>}
    </div>
  );
}
