'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

function DashboardInner() {
  // clubId desde ?club=...
  const sp = useSearchParams();
  const clubIdFromQuery = useMemo(() => sp.get('club') || '', [sp]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);
  const [status, setStatus] = useState(null); // { connected, payouts_enabled, details_submitted }
  const [busy, setBusy] = useState(false);

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
  const effectiveClubId = clubIdFromQuery || (clubs[0]?._id || '');

  // Cargar estado de Stripe del club seleccionado
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (!effectiveClubId) return;
      try {
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return; // no bloquear la UI
        const data = await res.json();
        if (!cancelled) setStatus(data || null);
      } catch (_) {}
    }
    loadStatus();
    return () => { cancelled = true; };
  }, [effectiveClubId]);

  async function openStripeDashboard() {
    if (!effectiveClubId) return;
    setBusy(true);
    setError('');
    try {
      const token = getToken();
      // Endpoint esperado en el backend: POST /api/clubs/:id/stripe/login-link
      const resp = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/login-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.url) {
          window.location.href = data.url; // redirige al Dashboard Express de Stripe
          return;
        }
      }

      // Fallback: si no existe el endpoint o no hay cuenta conectada, intentamos onboarding
      const ob = await fetch(`${API}/api/clubs/${effectiveClubId}/stripe/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (ob.ok) {
        const data = await ob.json();
        if (data?.url) {
          window.location.href = data.url; // flujo de onboarding
          return;
        }
      }

      throw new Error('No se pudo abrir Stripe.');
    } catch (e) {
      console.error('[dashboard] abrir Stripe error:', e);
      setError('No se pudo abrir el panel de Stripe.');
    } finally {
      setBusy(false);
    }
  }

  const container = {
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#e5e7eb',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
  };

  const card = {
    width: '100%',
    maxWidth: 520,
    background: '#0f1629',
    border: '1px solid #1f2937',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
  };

  const btn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: '12px 14px',
    fontWeight: 800,
    border: '1px solid #00c2ff',
    background: '#00e5ff',
    color: '#0b0f19',
    cursor: 'pointer',
    textDecoration: 'none',
    width: '100%',
  };

  const btnGhost = {
    ...btn,
    marginTop: 10,
    background: 'transparent',
    color: '#e5e7eb',
    border: '1px solid #2b3547',
  };

  const note = {
    marginTop: 12,
    fontSize: 13,
    opacity: 0.75,
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
    <main style={container}>
      <div style={card}>
        <h1 style={{ margin: 0, fontSize: 22, marginBottom: 8 }}>Panel de cobros</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Accede a tu panel de Stripe para ver ventas, pagos y transferencias.
        </p>

        {loading && <div style={warn}>Cargando tu club…</div>}
        {error && <div style={warn}>{error}</div>}

        {!loading && !effectiveClubId && (
          <div style={warn}>No se encontró ningún club asociado a tu cuenta.</div>
        )}

        <button onClick={openStripeDashboard} style={btn} disabled={!effectiveClubId || busy}>
          {busy ? 'Abriendo…' : 'Abrir panel de Stripe'}
        </button>

        {status && !status.connected && (
          <button onClick={openStripeDashboard} style={btnGhost} disabled={!effectiveClubId || busy}>
            {busy ? 'Abriendo…' : 'Configurar cuenta (onboarding)'}
          </button>
        )}

        <div style={note}>
          Seguridad: esta pantalla no muestra navegación ni accesos a otras zonas del portal.
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: '#e5e7eb' }}>Cargando…</div>}>
      <DashboardInner />
    </Suspense>
  );
}


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
