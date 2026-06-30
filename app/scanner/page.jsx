'use client';

import ScannerCheckin from '@/components/ScannerCheckin';

export default function ScannerPage() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';
  const key = process.env.NEXT_PUBLIC_SCANNER_KEY || '';

  return (
    <main className="nv-page">
      <div className="nv-shell" style={{ maxWidth: 720 }}>
        <div className="nv-row" style={{ justifyContent: 'space-between' }}>
          <a href="/dashboard" className="nv-link-accent">← Volver al panel</a>
          <span className={`nv-badge ${key ? 'nv-badge-success' : 'nv-badge-warn'}`}>
            {key ? 'Escáner listo' : 'Falta clave de escáner'}
          </span>
        </div>

        <section className="nv-hero">
          <div className="nv-badge">Control de acceso</div>
          <h1 className="nv-h1" style={{ marginTop: 14 }}>Escáner de entradas</h1>
          <p className="nv-lead" style={{ marginTop: 12 }}>
            Apunta la cámara al código QR de la entrada para validar el acceso en tiempo real.
          </p>
        </section>

        <div className="nv-card" style={{ padding: 14 }}>
          <ScannerCheckin backendBase={backend} scannerKey={key} />
        </div>
      </div>
    </main>
  );
}
