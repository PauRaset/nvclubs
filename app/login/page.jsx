'use client';
import { useState } from 'react';
import { api, setSession } from '@/lib/apiClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Conectando...');
    try {
      // Ajusta el path si tu login es otro
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(()=> ({}));

      if (!res.ok) {
        setMsg(data?.message || `Error (HTTP ${res.status})`);
        return;
      }

      // Esperado habitual: { token, user }
      const token = data?.token;
      const user  = data?.user || data;

      if (!token) {
        setMsg('Login OK pero no llegó token. Revisa el payload del login en la consola.');
        console.log('LOGIN RESPONSE:', data);
        return;
      }

      setSession(token, user);
      window.location.href = '/dashboard';
    } catch (err) {
      setMsg(String(err));
    }
  }

  return (
    <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'#0b0f19', color:'#e5e7eb' }}>
      <form onSubmit={onSubmit} style={{ width:320, display:'grid', gap:12 }}>
        <h1>Acceso discoteca</h1>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required
               style={{ padding:10, borderRadius:8 }} />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" required
               style={{ padding:10, borderRadius:8 }} />
        <button type="submit" style={{ padding:10, borderRadius:8, background:'#00e5ff', color:'#001018' }}>Entrar</button>
        <div style={{ minHeight:20 }}>{msg}</div>
      </form>
    </main>
  );
}