'use client';

import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { useRouter } from 'next/navigation';

export default function NewEventPage() {
  const router = useRouter();

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Nuevo evento</span>
            <h1 className="nv-h1" style={{ marginTop: 10 }}>Crear evento</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 640 }}>
              Prepara el evento de tu club. Al guardar, entrarás directamente a su pantalla de edición.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.push('/events')} className="nv-btn nv-btn-ghost">
              Volver a eventos
            </button>
          </div>
        </section>

        <EventForm
          mode="create"
          onSaved={(ev) => router.push(`/events/${ev._id || ev.id}`)}
        />
      </div>
    </RequireClub>
  );
}
