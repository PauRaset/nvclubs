// components/SalesSummaryCard.jsx
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/apiClient';

const API = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.nightvibe.life';

export default function SalesSummaryCard({ clubId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setErr('');
        const token = getToken();
        const res = await fetch(`${API}/api/clubs/${clubId}/stripe/summary?days=30`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'error');
        setData(json);
      } catch (e) {
        setErr('No se pudo cargar ventas (Stripe).');
      }
    })();
  }, [clubId]);

  if (err) return <div className="nv-notice nv-notice-warn">{err}</div>;
  if (!data) return <div className="nv-notice nv-notice-info">Cargando ventas…</div>;
  if (!data.connected) return <div className="nv-notice nv-notice-warn">Cuenta Stripe no conectada.</div>;

  const { gross, fees, net, count } = data.totals;
  const currency = (data.currency || 'eur').toUpperCase();
  const fmt = v => (v/100).toLocaleString(undefined, { style:'currency', currency });

  return (
    <section className="nv-card">
      <h3 className="nv-h3" style={{ marginBottom: 12 }}>Ventas últimos {data.days} días</h3>
      <div className="nv-stack" style={{ gap: 6 }}>
        <div>Pedidos: <b>{count}</b></div>
        <div>Bruto: <b>{fmt(gross)}</b></div>
        <div>Comisiones: <b>{fmt(fees)}</b></div>
        <div>Neto: <b>{fmt(net)}</b></div>
      </div>
    </section>
  );
}
