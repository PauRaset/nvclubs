'use client';
import { useState } from 'react';
import { regenerateScannerKey } from '@/lib/clubsApi';
import { toast, confirmDialog } from '@/components/Toast';

export default function ScannerKeyCard({ clubId, initialKey = '' }) {
  const [revealed, setRevealed] = useState(false);
  const [key, setKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);

  async function regen() {
    const ok = await confirmDialog({
      title: 'Regenerar clave del escáner',
      message: 'La clave anterior dejará de funcionar inmediatamente en todos los dispositivos. ¿Continuar?',
      confirmText: 'Regenerar',
      danger: true,
    });
    if (!ok) return;
    try {
      setLoading(true);
      const { scannerApiKey } = await regenerateScannerKey(clubId);
      setKey(scannerApiKey);
      setRevealed(true);
      toast.success('Nueva clave del escáner generada.');
    } catch (e) {
      toast.error(e.message || 'No se pudo generar la clave.');
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!key) return;
    navigator.clipboard?.writeText(key);
    toast.success('Clave copiada al portapapeles.');
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
        <button onClick={copyKey} className="nv-btn nv-btn-ghost" disabled={!key}>
          Copiar
        </button>
      </div>
    </div>
  );
}
