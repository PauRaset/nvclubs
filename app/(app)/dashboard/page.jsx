'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StripeConnectCard from '@/components/StripeConnectCard';
import SalesSummaryCard from '@/components/SalesSummaryCard';
import ScannerKeyCard from '@/components/ScannerKeyCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
}

/*'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StripeConnectCard from '@/components/StripeConnectCard';
import SalesSummaryCard from '@/components/SalesSummaryCard';
import ScannerKeyCard from '@/components/ScannerKeyCard';
import { api, getUser } from '@/lib/apiClient';

export default function DashboardPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // clubId inicial desde query (si ya viene)
  const queryClubId = sp?.get('club') || '';

  const [clubId, setClubId] = useState(queryClubId);
  const [loading, setLoading] = useState(!queryClubId);
  const [error, setError] = useState('');

  // Si no viene ?club=..., tratar de resolver automáticamente
  useEffect(() => {
    if (queryClubId) {
      setClubId(queryClubId);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function resolveClub() {
      setLoading(true);
      setError('');
      try {
        const u = getUser?.();
        if (!u) {
          setError('No hay usuario en sesión.');
          setLoading(false);
          return;
        }

        // 1) Si tienes un endpoint directo /api/clubs/mine
        let found = null;
        try {
          const r1 = await api('/api/clubs/mine', { method: 'GET' });
          if (r1.ok && Array.isArray(r1.data) && r1.data.length) {
            found = r1.data[0];
          }
        } catch (_) { }

        // 2) Fallback por ownerUserId (en aprobación lo guardamos como email)
        if (!found && u.email) {
          const r2 = await api(`/api/clubs?ownerUserId=${encodeURIComponent(u.email)}`, { method: 'GET' });
          if (r2.ok && Array.isArray(r2.data) && r2.data.length) {
            found = r2.data[0];
          }
        }

        // 3) Fallback por ownerUserId = user._id (por si en tu backend lo usas así)
        if (!found && u.id) {
          const r3 = await api(`/api/clubs?ownerUserId=${encodeURIComponent(u.id)}`, { method: 'GET' });
          if (r3.ok && Array.isArray(r3.data) && r3.data.length) {
            found = r3.data[0];
          }
        }

        if (!found) {
          setError('No se encontró ningún club asociado a tu cuenta.');
          setLoading(false);
          return;
        }

        if (cancelled) return;

        // Actualiza estado y URL para que todo quede consistente:
        setClubId(found._id || found.id);
        const url = new URL(window.location.href);
        url.searchParams.set('club', found._id || found.id);
        router.replace(`${url.pathname}?${url.searchParams.toString()}`);
      } catch (e) {
        setError('No se pudo resolver tu club.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolveClub();
    return () => { cancelled = true; };
  }, [queryClubId, router]);

  // Enlaces con ?club= persistido
  const eventsHref = useMemo(() => clubId ? `/events?club=${clubId}` : '/events', [clubId]);
  const scannerHref = useMemo(() => clubId ? `/scanner?club=${clubId}` : '/scanner', [clubId]);

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Panel del club</h1>
        <a href={eventsHref} style={link}>Eventos</a>
        <a href={scannerHref} style={link}>Escáner</a>
      </div>

      {loading && (
        <div style={note}>Cargando tu club…</div>
      )}

      {!loading && !clubId && (
        <div style={warn}>
          {error
            ? error
            : <>Falta el identificador del club. Añade <code>?club=ID</code> a la URL
              para cargar tus datos (p. ej. <code>/dashboard?club=6630…</code>).</>}
        </div>
      )}

      {!!clubId && !loading && (
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

const note = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #1f2937',
  background: '#0b1220',
  borderRadius: 10,
  color: '#9ca3af',
  fontSize: 14
};*/
