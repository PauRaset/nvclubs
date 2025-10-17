'use client';

import ScannerCheckin from '@/components/ScannerCheckin';

export default function ScannerPage() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.nightvibe.life';
  const key = process.env.NEXT_PUBLIC_SCANNER_KEY || '';

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Escáner de entradas</h1>
      <ScannerCheckin backendBase={backend} scannerKey={key} />
    </main>
  );
}
