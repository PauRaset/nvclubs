'use client';

import { useMemo } from 'react';
import StripeConnectCard from '@/components/StripeConnectCard';
import SalesSummaryCard from '@/components/SalesSummaryCard';
import ScannerKeyCard from '@/components/ScannerKeyCard';

export default function DashboardPage() {
  // Por ahora tomamos el club desde la query ?club=...
  const clubId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const q = new URLSearchParams(window.location.search);
    return q.get('club') || '';
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Panel del club</h1>
        <a href="/events" style={link}>Eventos</a>
        <a href="/scanner" style={link}>Escáner</a>
      </div>

      {!clubId && (
        <div style={warn}>
          Falta el identificador del club. Añade <code>?club=ID</code> a la URL
          para cargar tus datos (p. ej. <code>/dashboard?club=6630…</code>).
        </div>
      )}

      {clubId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 1000 }}>
          <StripeConnectCard clubId={clubId} />
          <SalesSummaryCard clubId={clubId} />
          <ScannerKeyCard clubId={clubId} />
        </div>
      )}
    </main>
  );
}

const link = {
  padding: '6px 10px',
  borderRadius: 8,
  background: '#111827',
  color: '#e5e7eb',
  textDecoration: 'none',
  fontSize: 14,
  border: '1px solid #303848'
};

const warn = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #3b2f14',
  background: '#1a1408',
  borderRadius: 10,
  color: '#fbbf24',
  fontSize: 14
};
