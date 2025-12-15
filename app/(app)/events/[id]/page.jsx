'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { fetchEvent } from '@/lib/eventsApi';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [initial, setInitial] = useState(null);
  const [msg, setMsg] = useState('Cargando...');

  useEffect(() => {
    (async () => {
      const r = await fetchEvent(id);
      if (!r.ok) return setMsg(r.data?.message || `Error (HTTP ${r.status})`);
      setInitial(r.data); setMsg('');
    })();
  }, [id]);

  return (
    <RequireClub>
      <main style={{ padding:24, color:'#e5e7eb', background:'#0b0f19', minHeight:'100vh' }}>
        <h1 style={{ fontSize:24, marginBottom:16 }}>Editar evento</h1>
        {msg && !initial ? <p>{msg}</p> : (
          <EventForm
            mode="edit"
            initial={initial}
            onSaved={() => router.push('/events')}
          />
        )}
      </main>
    </RequireClub>
  );
}
