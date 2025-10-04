'use client';
import { clearSession, getUser } from '@/lib/apiClient';

export default function TopNav() {
  const user = getUser();

  function logout(e) {
    e.preventDefault();
    clearSession();
    window.location.href = '/login';
  }

  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'12px 16px', borderBottom:'1px solid #1d263a', background:'#0b0f19', position:'sticky', top:0, zIndex:20
    }}>
      <nav style={{ display:'flex', gap:12, alignItems:'center' }}>
        <a href="/events" style={{ padding:'8px 10px', borderRadius:8, background:'#111827', color:'#e5e7eb' }}>Eventos</a>
        <a href="/events/new" style={{ padding:'8px 10px', borderRadius:8, background:'#0ea5e9', color:'#001018', fontWeight:600 }}>+ Crear</a>
      </nav>
      <div style={{ display:'flex', gap:12, alignItems:'center', color:'#9ca3af' }}>
        <span style={{ fontSize:13 }}>#{user?.username || user?.email}</span>
        <a href="/login" onClick={logout} style={{ padding:'6px 10px', border:'1px solid #334155', borderRadius:8 }}>Salir</a>
      </div>
    </header>
  );
}
