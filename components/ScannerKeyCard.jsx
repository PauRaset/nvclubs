'use client';
import { useState } from 'react';
import { regenerateScannerKey } from '@/lib/clubsApi';

export default function ScannerKeyCard({ clubId, initialKey = '' }) {
  const [revealed, setRevealed] = useState(false);
  const [key, setKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function regen() {
    try {
      setLoading(true);
      const { scannerApiKey } = await regenerateScannerKey(clubId);
      setKey(scannerApiKey);
      setRevealed(true);
      setMsg('Nueva clave generada');
      setTimeout(()=>setMsg(''), 2000);
    } catch (e) {
      setMsg(e.message || 'Error generando clave');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <h3 style={title}>API key del escáner</h3>
      <p style={muted}>Úsala en la cabecera <code>x-scanner-key</code> en /scanner.</p>

      {revealed ? (
        <pre style={pre}>{key || '(vacía)'}</pre>
      ) : (
        <button onClick={()=>setRevealed(true)} style={btn}>Revelar</button>
      )}

      <div style={{ marginTop:10, display:'flex', gap:8 }}>
        <button onClick={regen} disabled={loading} style={btnPrimary}>
          {loading ? 'Generando…' : 'Regenerar'}
        </button>
        <button onClick={() => navigator.clipboard.writeText(key || '')} style={btn}>
          Copiar
        </button>
      </div>

      {msg && <p style={{ fontSize:13, marginTop:6 }}>{msg}</p>}
    </div>
  );
}

const card = { background:'#0b0f19', border:'1px solid #1d263a', borderRadius:16, padding:16 };
const title = { margin:0, marginBottom:8 };
const muted = { color:'#9ca3af', fontSize:14 };
const pre = { background:'#0b1220', border:'1px solid #1f2937', padding:12, borderRadius:10, overflow:'auto' };
const btn = { padding:'8px 12px', borderRadius:10, background:'#111827', color:'#e5e7eb', border:'1px solid #303848', cursor:'pointer' };
const btnPrimary = { ...btn, background:'#0ea5e9', color:'#001018', fontWeight:600, border:'none' };
