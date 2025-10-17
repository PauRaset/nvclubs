'use client';
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
const btnGhost = { ...btn, background:'transparent' };
