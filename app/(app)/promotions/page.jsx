

'use client';

import RequireClub from '@/components/RequireClub';

const levels = [
  {
    id: 'level-1',
    level: 1,
    title: 'Nivel 1',
    reward: 'Shot gratis',
    status: 'active',
    statusLabel: 'Activo',
    missions: [
      { id: 'l1-m1', title: 'Asistir a 1 evento', type: 'Asistencia', validation: 'Automática' },
      { id: 'l1-m2', title: 'Subir 1 foto válida', type: 'Contenido', validation: 'Manual por el club' },
      { id: 'l1-m3', title: 'Compartir 1 evento', type: 'Difusión', validation: 'Link único por usuario' },
    ],
  },
  {
    id: 'level-2',
    level: 2,
    title: 'Nivel 2',
    reward: 'Descuento en entrada',
    status: 'active',
    statusLabel: 'Activo',
    missions: [
      { id: 'l2-m1', title: 'Asistir a 2 eventos', type: 'Asistencia', validation: 'Automática' },
      { id: 'l2-m2', title: 'Subir 2 fotos correctas', type: 'Contenido', validation: 'Manual por el club' },
      { id: 'l2-m3', title: 'Conseguir 5 clicks en tu link', type: 'Difusión', validation: 'Clicks atribuidos' },
    ],
  },
  {
    id: 'level-3',
    level: 3,
    title: 'Nivel 3',
    reward: 'Acceso prioritario o VIP',
    status: 'draft',
    statusLabel: 'Borrador',
    missions: [
      { id: 'l3-m1', title: 'Asistir a 3 eventos', type: 'Asistencia', validation: 'Automática' },
      { id: 'l3-m2', title: 'Subir foto temática aprobada', type: 'Contenido', validation: 'Manual por misión' },
      { id: 'l3-m3', title: 'Traer usuarios con tu link', type: 'Difusión', validation: 'Clicks y usuarios únicos' },
      { id: 'l3-m4', title: 'Completar reto especial del club', type: 'Misión especial', validation: 'Según configuración' },
    ],
  },
];

const roadmap = [
  {
    title: '10 niveles por defecto',
    description:
      'Cada club tendrá una estructura inicial de 10 niveles. Después podrá modificar nombre, recompensa, misiones y condiciones de cada uno.',
  },
  {
    title: 'Premio al completar el nivel',
    description:
      'La recompensa no se entrega por una misión suelta. El usuario la obtiene cuando completa todas las misiones del nivel.',
  },
  {
    title: 'Misiones con validación distinta',
    description:
      'Habrá misiones automáticas como asistencia o clicks, y otras manuales como fotos que tendrán que ser revisadas por el club.',
  },
  {
    title: 'Links únicos por usuario y evento',
    description:
      'Cada usuario tendrá un enlace exclusivo para compartir cada evento. Así podrás atribuir tráfico, usuarios únicos, asistencias y compras.',
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

function getMissionTypeStyle(type) {
  if (type === 'Contenido') {
    return {
      background: 'rgba(0,229,255,0.08)',
      border: '1px solid rgba(0,229,255,0.18)',
      color: '#8be9f7',
    };
  }

  if (type === 'Difusión') {
    return {
      background: 'rgba(168,85,247,0.12)',
      border: '1px solid rgba(168,85,247,0.20)',
      color: '#d8b4fe',
    };
  }

  if (type === 'Asistencia') {
    return {
      background: 'rgba(34,197,94,0.10)',
      border: '1px solid rgba(34,197,94,0.18)',
      color: '#86efac',
    };
  }

  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#cbd5e1',
  };
}

export default function PromotionsPage() {
  const totalMissions = levels.reduce((acc, level) => acc + level.missions.length, 0);
  const activeLevels = levels.filter((level) => level.status === 'active').length;
  const manualReviewMissions = levels.reduce(
    (acc, level) => acc + level.missions.filter((mission) => mission.validation.toLowerCase().includes('manual')).length,
    0
  );

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
                Sistema de niveles del club
              </div>
              <h1 style={titleStyle}>Promociones</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                En NightVibe cada promoción es un nivel. Cada nivel tiene sus misiones y una recompensa final
                que el usuario desbloquea al completarlo. Aquí prepararemos la estructura para niveles,
                validación de fotos y difusión mediante links únicos por usuario.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/promotions/new" style={primaryBtn}>
                + Crear nivel
              </a>
            </div>
          </section>

          <section style={statGridStyle}>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Niveles visibles</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{levels.length}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Mock inicial del sistema por niveles</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Niveles activos</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{activeLevels}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Listos para estar visibles en el club</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Misiones</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{totalMissions}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Tareas repartidas dentro de los niveles</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Revisión manual</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{manualReviewMissions}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Misiones que requerirán validar contenido</div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Niveles del club</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Cada tarjeta representa un nivel-promoción. Dentro verás su recompensa final y las misiones necesarias para completarlo.
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Más adelante cada club tendrá 10 niveles por defecto</div>
            </div>
          </section>

          <section style={listStyle}>
            {levels.map((level) => {
              const statusStyle = getStatusStyles(level.status);

              return (
                <article
                  key={level.id}
                  style={{
                    ...panelStyle,
                    padding: 18,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 18,
                    alignItems: 'start',
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
                        {level.title}
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
                        {level.statusLabel}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
                      Recompensa final: <strong>{level.reward}</strong>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      {level.missions.map((mission) => {
                        const missionTypeStyle = getMissionTypeStyle(mission.type);
                        return (
                          <div
                            key={mission.id}
                            style={{
                              padding: '14px 14px',
                              borderRadius: 16,
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              display: 'grid',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: 15 }}>{mission.title}</div>
                              <span
                                style={{
                                  ...missionTypeStyle,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  minHeight: 28,
                                  padding: '0 10px',
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {mission.type}
                              </span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.55 }}>
                              Validación: {mission.validation}
                            </div>
                          </div>
                        );
                      })}
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
                      href={`/promotions/${level.id}`}
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
                      Reordenar después
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
                Esta pantalla ya queda alineada con la lógica real del sistema de promociones por niveles.
              </div>

              <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                {roadmap.map((item) => (
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
                El club podrá decidir no activar el sistema de niveles, pero en el evento seguirá apareciendo una referencia sutil para dejar preparada esa capa de engagement.
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
                  Este evento no tiene niveles activos por el momento. El club puede activarlos más adelante para desbloquear recompensas, misiones y campañas de difusión.
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
