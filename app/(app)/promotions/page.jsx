

'use client';

import RequireClub from '@/components/RequireClub';

const promotions = [
  {
    id: 'promo-early-access',
    name: 'Early access',
    type: 'Entrada anticipada',
    reward: 'Acceso preferente hasta la 01:00',
    event: 'Asignable a cualquier evento',
    status: 'active',
    statusLabel: 'Activa',
    mission: 'Llegar antes de la hora límite',
    validation: 'Automática por horario',
  },
  {
    id: 'promo-photo-mission',
    name: 'Misión foto validada',
    type: 'Misión con contenido',
    reward: 'Consumición gratis o subida de nivel',
    event: 'Eventos seleccionados',
    status: 'draft',
    statusLabel: 'Borrador',
    mission: 'Subir foto correcta durante el evento',
    validation: 'Manual por el club',
  },
  {
    id: 'promo-share-ranking',
    name: 'Top compartidores',
    type: 'Difusión / referidos',
    reward: 'VIP, descuento o acceso prioritario',
    event: 'Campañas especiales',
    status: 'paused',
    statusLabel: 'Pausada',
    mission: 'Traer tráfico con link único por usuario',
    validation: 'Según clicks y conversiones',
  },
];

const upcomingModules = [
  {
    title: 'Sin promociones activas',
    description:
      'El club podrá decidir no usar promociones, pero en sus eventos seguirá apareciendo una referencia sutil para activar esta funcionalidad más adelante.',
  },
  {
    title: 'Promociones por misión',
    description:
      'Cada promoción podrá vincularse a una misión concreta: asistencia, foto validada, compartir evento o traer usuarios nuevos.',
  },
  {
    title: 'Validación de fotos',
    description:
      'Las fotos se revisarán según el tipo de misión. El club podrá aprobar, rechazar y dejar motivo de rechazo para cada envío.',
  },
  {
    title: 'Links únicos por usuario',
    description:
      'Cada usuario tendrá un enlace propio para compartir un evento. Así podrás medir clicks, usuarios únicos, asistencias y compras generadas por cada uno.',
  },
];

function getStatusStyles(status) {
  if (status === 'active') {
    return {
      background: 'rgba(34,197,94,0.12)',
      border: '1px solid rgba(34,197,94,0.24)',
      color: '#86efac',
    };
  }

  if (status === 'paused') {
    return {
      background: 'rgba(250,204,21,0.10)',
      border: '1px solid rgba(250,204,21,0.20)',
      color: '#fde68a',
    };
  }

  return {
    background: 'rgba(148,163,184,0.10)',
    border: '1px solid rgba(148,163,184,0.20)',
    color: '#cbd5e1',
  };
}

export default function PromotionsPage() {
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

  const primaryBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '0 18px',
    borderRadius: 14,
    background: '#00e5ff',
    color: '#001018',
    fontWeight: 800,
    textDecoration: 'none',
    border: '1px solid #00d4eb',
    boxShadow: '0 12px 32px rgba(0,229,255,0.22)',
    whiteSpace: 'nowrap',
  };

  const panelStyle = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  };

  const statGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  };

  const statCardStyle = {
    padding: 16,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  };

  const listStyle = {
    display: 'grid',
    gap: 16,
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
                Promociones del club
              </div>
              <h1 style={titleStyle}>Promociones</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Diseña recompensas, misiones y campañas especiales para tus eventos. Esta primera
                pantalla deja preparada toda la estructura para promociones, validación de fotos y
                difusión con links únicos por usuario.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/promotions/new" style={primaryBtn}>
                + Crear promoción
              </a>
            </div>
          </section>

          <section style={statGridStyle}>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Promociones</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>3</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Estructura inicial visible</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Activas</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>1</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Preparadas para impulsar eventos</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Validación</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>Manual</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Fotos y misiones revisables</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Difusión</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>Links</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Cada usuario tendrá el suyo</div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Promociones creadas</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Vista inicial de cómo se organizarán las promociones, las misiones y la validación.
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Base visual lista para conectar backend después</div>
            </div>
          </section>

          <section style={listStyle}>
            {promotions.map((promo) => {
              const statusStyle = getStatusStyles(promo.status);

              return (
                <article
                  key={promo.id}
                  style={{
                    ...panelStyle,
                    padding: 18,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 18,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 24,
                          fontWeight: 900,
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {promo.name}
                      </h2>
                      <span
                        style={{
                          ...statusStyle,
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 32,
                          padding: '0 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {promo.statusLabel}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
                      {promo.type} · {promo.reward}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Evento</div>
                        <div style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>{promo.event}</div>
                      </div>

                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Misión</div>
                        <div style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>{promo.mission}</div>
                      </div>

                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Validación</div>
                        <div style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>{promo.validation}</div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      justifyItems: 'stretch',
                      minWidth: 180,
                    }}
                  >
                    <a
                      href={`/promotions/${promo.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 44,
                        padding: '0 14px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#e5e7eb',
                        textDecoration: 'none',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      Ver / Editar
                    </a>
                    <button
                      type="button"
                      style={{
                        minHeight: 44,
                        padding: '0 14px',
                        borderRadius: 12,
                        border: '1px solid rgba(0,229,255,0.20)',
                        background: 'rgba(0,229,255,0.06)',
                        color: '#7dd3fc',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Activar después
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)',
              gap: 20,
            }}
          >
            <article style={panelStyle}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Qué prepararemos aquí</div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                Esta sección ya queda lista para crecer hacia todo lo que definimos para el panel de clubs.
              </div>

              <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                {upcomingModules.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{item.description}</div>
                  </div>
                ))}
              </div>
            </article>

            <article style={panelStyle}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Sin promociones activas</div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                El club podrá decidir no usar promociones, pero el sistema seguirá mostrando la función de forma sutil dentro del evento para que siempre exista una vía de activación futura.
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,229,255,0.04))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Vista prevista en el evento</div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Promociones no activadas
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                  Este evento no tiene promociones disponibles por el momento. El club puede activarlas más adelante para desbloquear recompensas, misiones y campañas de difusión.
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
