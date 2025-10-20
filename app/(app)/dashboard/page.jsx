// POST /api/clubs/:id/stripe/login-link
// Devuelve un enlace de acceso al Dashboard Express de Stripe para la cuenta conectada
router.post('/:id/stripe/login-link', requireClubOwnerOrManager, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id).lean();
    if (!club || !club.stripeAccountId) {
      return res.status(404).json({ error: 'no_connected_account' });
    }

    // redirect_url opcional: tras cerrar sesión en Stripe, volver a tu portal
    const portalBase = (process.env.CLUBS_PORTAL_URL || process.env.FRONTEND_URL || 'https://clubs.nightvibe.life').replace(/\/+$/, '');

    const link = await stripe.accounts.createLoginLink(club.stripeAccountId, {
      redirect_url: `${portalBase}/dashboard?club=${club._id}`,
    });

    return res.json({ url: link.url });
  } catch (e) {
    console.error('POST /clubs/:id/stripe/login-link error:', e);
    res.status(500).json({ error: 'login_link_error', message: e?.message || 'failed' });
  }
});


/*'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StripeConnectCard from '@/components/StripeConnectCard';
import SalesSummaryCard from '@/components/SalesSummaryCard';
import ScannerKeyCard from '@/components/ScannerKeyCard';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

function DashboardInner() {
  // clubId desde ?club=...
  const sp = useSearchParams();
  const clubId = useMemo(() => sp.get('club') || '', [sp]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);

  // Utilidad segura en cliente
  function getToken() {
    try {
      return localStorage.getItem('nv_token') || '';
    } catch {
      return '';
    }
  }

  // Cargar mis clubs (necesita JWT). Solo en cliente tras montar.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError('');
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/mine`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`${res.status} ${res.statusText} ${t || ''}`.trim());
        }
        const data = await res.json();
        if (!cancelled) setClubs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError('No se pudo cargar tu club.');
        console.error('[dashboard] /clubs/mine error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Si no viene ?club, intenta usar el primero que devuelva /mine
  const effectiveClubId = clubId || (clubs[0]?._id || '');

  const link = {
    padding: '6px 10px',
    borderRadius: 8,
    background: '#111827',
    color: '#e5e7eb',
    textDecoration: 'none',
    fontSize: 14,
    border: '1px solid #303848',
  };

  const warn = {
    marginTop: 14,
    padding: 12,
    border: '1px solid #3b2f14',
    background: '#1a1408',
    borderRadius: 10,
    color: '#fbbf24',
    fontSize: 14,
  };

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Panel del club</h1>
        <a href="/events" style={link}>Eventos</a>
        <a href="/scanner" style={link}>Escáner</a>
      </div>

      {loading && <div style={warn}>Cargando…</div>}
      {error && <div style={warn}>{error}</div>}

      {!effectiveClubId && !loading && !error && (
        <div style={warn}>
          No se encontró ningún club asociado a tu cuenta.
          {clubs.length > 1 && ' (Tienes varios; añade ?club=<id> a la URL)'}
        </div>
      )}

      {effectiveClubId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 1000 }}>
          <StripeConnectCard clubId={effectiveClubId} />
          <SalesSummaryCard clubId={effectiveClubId} />
          <ScannerKeyCard clubId={effectiveClubId} />
        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: '#e5e7eb' }}>Cargando…</div>}>
      <DashboardInner />
    </Suspense>
  );
}*/
