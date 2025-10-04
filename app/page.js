'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Comprobando API...');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';
    fetch(`${base}/api/clubs/health`, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data?.ok) {
          setStatus('✅ API OK');
          setDetail(JSON.stringify(data));
        } else {
          setStatus('⚠️ API respondió con error');
          setDetail(JSON.stringify(data));
        }
      })
      .catch((e) => {
        setStatus('❌ No se pudo conectar con la API');
        setDetail(String(e));
      });
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>NightVibe · Portal de Discotecas</h1>
      <p>Estado de conexión con la API: <b>{status}</b></p>
      {detail && (
        <pre style={{ marginTop: 16, padding: 12, background: '#0f172a', color: '#e2e8f0', borderRadius: 8 }}>
          {detail}
        </pre>
      )}
    </main>
  );
}