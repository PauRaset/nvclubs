// components/SalesSummaryCard.jsx (ejemplo rápido)
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

  if (err) return <div style={warn}>{err}</div>;
  if (!data) return <div style={note}>Cargando ventas…</div>;
  if (!data.connected) return <div style={warn}>Cuenta Stripe no conectada.</div>;

  const { gross, fees, net, count } = data.totals;
  const currency = (data.currency || 'eur').toUpperCase();
  const fmt = v => (v/100).toLocaleString(undefined, { style:'currency', currency });

  return (
    <section style={card}>
      <h3 style={{marginTop:0}}>Ventas últimos {data.days} días</h3>
      <div>Pedidos: <b>{count}</b></div>
      <div>Bruto: <b>{fmt(gross)}</b></div>
      <div>Comisiones: <b>{fmt(fees)}</b></div>
      <div>Neto: <b>{fmt(net)}</b></div>
    </section>
  );
}

const card = { padding:16, border:'1px solid #1f2937', borderRadius:12, background:'#0b1220', color:'#e5e7eb' };
const warn = { marginTop:14, padding:12, border:'1px solid #3b2f14', background:'#1a1408', borderRadius:10, color:'#fbbf24', fontSize:14 };
const note = { marginTop:14, padding:12, border:'1px solid #1d263a', background:'#0f172a', borderRadius:10, color:'#9ca3af', fontSize:14 };

/*'use client';
import { useEffect, useState } from 'react';
import { getOrders, downloadOrdersCsv } from '@/lib/clubsApi';

export default function SalesSummaryCard({ clubId }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState('today'); // today | 7d | 30d

  function dateRange(key) {
    const now = new Date();
    const to = now.toISOString().slice(0,10);
    if (key === 'today') return { from: to, to };
    const days = key === '7d' ? 7 : 30;
    const fromD = new Date(now.getTime() - (days-1)*24*3600*1000).toISOString().slice(0,10);
    return { from: fromD, to };
  }

  async function load() {
    try {
      setLoading(true); setError('');
      const { from, to } = dateRange(range);
      const data = await getOrders(clubId, { from, to, status:'paid' });
      setSummary(data);
    } catch (e) {
      setError(e.message || 'Error cargando ventas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (clubId) load(); }, [clubId, range]);

  const total = (summary?.totalCents || 0)/100;

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={title}>Ventas</h3>
        <select value={range} onChange={e=>setRange(e.target.value)} style={select}>
          <option value="today">Hoy</option>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
        </select>
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p style={err}>{error}</p>}

      {summary && (
        <>
          <p style={{ fontSize:22, margin:'8px 0' }}>€ {total.toFixed(2)}</p>
          <p style={muted}>
            {summary.totalTickets} entradas · {summary.count} pedidos
          </p>

          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button
              onClick={()=>{
                const { from, to } = dateRange(range);
                downloadOrdersCsv(clubId, { from, to, status:'paid' });
              }}
              style={btn}
            >
              Descargar CSV
            </button>
            <button onClick={load} style={btnGhost}>Actualizar</button>
          </div>
        </>
      )}
    </div>
  );
}

const card = { background:'#0b0f19', border:'1px solid #1d263a', borderRadius:16, padding:16 };
const title = { margin:0 };
const muted = { color:'#9ca3af', fontSize:14 };
const err = { color:'#ef4444', fontSize:13 };
const select = { background:'#0b1220', color:'#e5e7eb', border:'1px solid #1f2937', borderRadius:10, padding:'6px 8px' };
const btn = { padding:'8px 12px', borderRadius:10, background:'#111827', color:'#e5e7eb', border:'1px solid #303848', cursor:'pointer' };
const btnGhost = { ...btn, background:'transparent' };*/
