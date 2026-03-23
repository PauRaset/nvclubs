'use client';

import RequireClub from '@/components/RequireClub';
import EventForm from '@/components/EventForm';
import { useRouter } from 'next/navigation';

export default function NewEventPage() {
  const router = useRouter();

  const pageStyle = {
    padding: '28px 24px 44px',
    color: '#e5e7eb',
    background:
      'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), #0b0f19',
    minHeight: '100vh',
  };

  const shellStyle = {
    width: '100%',
    maxWidth: 1280,
    margin: '0 auto',
    display: 'grid',
    gap: 22,
  };

  const heroStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) auto',
    gap: 18,
    alignItems: 'center',
    padding: 26,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(15,22,41,0.96))',
    border: '1px solid rgba(0,229,255,0.18)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
  };

  const titleStyle = {
    margin: 0,
    fontSize: 'clamp(28px, 4vw, 42px)',
    lineHeight: 1.02,
    letterSpacing: '-0.03em',
    fontWeight: 900,
  };

  const mutedStyle = {
    color: '#cbd5e1',
    lineHeight: 1.65,
    fontSize: 15,
  };

  const backBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    padding: '0 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb',
    textDecoration: 'none',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const panelStyle = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 22,
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  };

  const infoGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  };

  const infoCardStyle = {
    padding: 16,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  };

  return (
    <RequireClub>
      <main style={pageStyle}>
        <div style={shellStyle}>
          <section style={heroStyle}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,229,255,0.2)',
                  background: 'rgba(0,229,255,0.08)',
                  color: '#7dd3fc',
                  fontWeight: 800,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                Nuevo evento
              </div>
              <h1 style={titleStyle}>Crear evento</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Prepara el evento de tu club con una vista más clara y profesional. Esta base ya
                queda lista para crecer después con promociones, QR, ventas, misiones y analítica.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => router.push('/events')} style={backBtnStyle}>
                Volver a eventos
              </button>
            </div>
          </section>

          <section style={infoGridStyle}>
            <article style={infoCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Paso 1</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Información principal</div>
              <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                Define título, fecha, ubicación e imagen principal del evento.
              </div>
            </article>

            <article style={infoCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Paso 2</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Configuración visual</div>
              <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                Prepara una presentación más atractiva para que el evento se vea premium.
              </div>
            </article>

            <article style={infoCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Paso 3</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Base para crecimiento</div>
              <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                Más adelante aquí podremos conectar promociones, QR, venta de entradas y misiones.
              </div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>
                Formulario del evento
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                Completa los datos del evento. Cuando guardes, entrarás directamente a su pantalla de edición.
              </div>
            </div>

            <EventForm
              mode="create"
              onSaved={(ev) => router.push(`/events/${ev._id || ev.id}`)}
            />
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
