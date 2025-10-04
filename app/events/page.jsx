'use client';
import { useEffect, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { fetchEvents, deleteEvent } from '@/lib/eventsApi';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState('Cargando...');

  async function load() {
    setMsg('Cargando...');
    const r = await fetchEvents();
    if (!r.ok) return setMsg(r.data?.message || `Error (HTTP ${r.status})`);
    setEvents(r.data || []);
    setMsg('');
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    const r = await deleteEvent(id);
    if (!r.ok) return alert(r.data?.message || `Error (HTTP ${r.status})`);
    await load();
  }

  return (
    <RequireClub>
      <main style={{ padding:24, color:'#e5e7eb', background:'#0b0f19', minHeight:'100vh' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24 }}>Tus eventos</h1>
          <a href="/events/new" style={{ padding:10, background:'#00e5ff', color:'#001018', borderRadius:8, fontWeight:600 }}>+ Crear</a>
        </div>

        {msg && <p>{msg}</p>}

        <div style={{ display:'grid', gap:12 }}>
          {(events || []).map(ev => (
            <div key={ev._id || ev.id} style={{ padding:12, border:'1px solid #243044', borderRadius:12 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                {ev.heroImage && <img src={ev.heroImage} alt="" style={{ width:128, height:72, objectFit:'cover', borderRadius:8 }}/>}
                <div style={{ flex:1 }}>
                  <b>{ev.title}</b><br/>
                  <small>
                    {ev.startAt ? new Date(ev.startAt).toLocaleString() : ''} — {ev.endAt ? new Date(ev.endAt).toLocaleString() : ''}
                  </small>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <a href={`/events/${ev._id || ev.id}`} style={{ padding:'8px 10px', border:'1px solid #2f3b55', borderRadius:8 }}>Editar</a>
                  <button onClick={()=>onDelete(ev._id || ev.id)} style={{ padding:'8px 10px', border:'1px solid #5b2530', borderRadius:8, background:'transparent', color:'#ff6b81' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </RequireClub>
  );
}