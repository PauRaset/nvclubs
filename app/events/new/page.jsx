'use client';
import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { useRouter } from 'next/navigation';

export default function NewEventPage() {
  const router = useRouter();

  return (
    <RequireClub>
      <main style={{ padding:24, color:'#e5e7eb', background:'#0b0f19', minHeight:'100vh' }}>
        <h1 style={{ fontSize:24, marginBottom:16 }}>Crear evento</h1>
        <EventForm
          mode="create"
          onSaved={(ev) => router.push(`/events/${ev._id || ev.id}`)}
        />
      </main>
    </RequireClub>
  );
}