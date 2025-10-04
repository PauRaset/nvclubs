'use client';
import RequireClub from '@/components/RequireClub';

export default function Dashboard() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('nv_user') : null;
  const user = raw ? JSON.parse(raw) : null;

  return (
    <RequireClub>
      <main style={{ padding:24, color:'#e5e7eb', background:'#0b0f19', minHeight:'100vh' }}>
        <h1 style={{ fontSize:24, marginBottom:12 }}>Panel de discoteca</h1>
        <p>Hola, <b>{user?.entityName || user?.username || user?.email}</b></p>
        <pre style={{ marginTop:16, padding:12, background:'#0f172a', borderRadius:8, overflowX:'auto' }}>
{JSON.stringify(user, null, 2)}
        </pre>
        <a href="/login" onClick={() => { localStorage.clear(); }} style={{ marginTop:16, display:'inline-block', padding:10, background:'#243044', borderRadius:8 }}>
          Cerrar sesión
        </a>
      </main>
    </RequireClub>
  );
}