

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';

const mockLevels = {
  'level-1': {
    id: 'level-1',
    level: 1,
    title: 'Nivel 1',
    reward: 'Shot gratis',
    status: 'active',
    statusLabel: 'Activo',
    description:
      'Primer nivel del club para activar a los usuarios nuevos con una recompensa simple y fácil de desbloquear.',
    missions: [
      {
        id: 'l1-m1',
        title: 'Asistir a 1 evento',
        type: 'Asistencia',
        validation: 'Automática',
        details: 'La asistencia se valida cuando el usuario hace check-in o queda marcada correctamente en el evento.',
      },
      {
        id: 'l1-m2',
        title: 'Subir 1 foto válida',
        type: 'Contenido',
        validation: 'Manual por el club',
        details: 'La foto debe corresponder a la misión activa y puede ser aprobada o rechazada desde la bandeja de revisión.',
      },
      {
        id: 'l1-m3',
        title: 'Compartir 1 evento',
        type: 'Difusión',
        validation: 'Link único por usuario',
        details: 'Cada usuario comparte su propio enlace único para que el club pueda medir clicks y accesos.',
      },
    ],
  },
  'level-2': {
    id: 'level-2',
    level: 2,
    title: 'Nivel 2',
    reward: 'Descuento en entrada',
    status: 'active',
    statusLabel: 'Activo',
    description:
      'Nivel pensado para reforzar repetición de asistencia y una participación más clara dentro de la comunidad del club.',
    missions: [
      {
        id: 'l2-m1',
        title: 'Asistir a 2 eventos',
        type: 'Asistencia',
        validation: 'Automática',
        details: 'El sistema sumará eventos asistidos para avanzar automáticamente en esta misión.',
      },
      {
        id: 'l2-m2',
        title: 'Subir 2 fotos correctas',
        type: 'Contenido',
        validation: 'Manual por el club',
        details: 'El club podrá revisar si las fotos cumplen la misión concreta y rechazarlas si no encajan.',
      },
      {
        id: 'l2-m3',
        title: 'Conseguir 5 clicks en tu link',
        type: 'Difusión',
        validation: 'Clicks atribuidos',
        details: 'Los clicks deben venir del enlace único del usuario para poder atribuir el avance correctamente.',
      },
    ],
  },
  'level-3': {
    id: 'level-3',
    level: 3,
    title: 'Nivel 3',
    reward: 'Acceso prioritario o VIP',
    status: 'draft',
    statusLabel: 'Borrador',
    description:
      'Nivel más avanzado pensado para usuarios que ya generan movimiento real para el club.',
    missions: [
      {
        id: 'l3-m1',
        title: 'Asistir a 3 eventos',
        type: 'Asistencia',
        validation: 'Automática',
        details: 'Se validará automáticamente cuando el usuario acumule la asistencia requerida.',
      },
      {
        id: 'l3-m2',
        title: 'Subir foto temática aprobada',
        type: 'Contenido',
        validation: 'Manual por misión',
        details: 'La foto deberá corresponder a la consigna concreta del nivel y revisarse manualmente.',
      },
      {
        id: 'l3-m3',
        title: 'Traer usuarios con tu link',
        type: 'Difusión',
        validation: 'Clicks y usuarios únicos',
        details: 'El progreso se basará en el enlace exclusivo del usuario y en el tráfico atribuido a ese enlace.',
      },
      {
        id: 'l3-m4',
        title: 'Completar reto especial del club',
        type: 'Misión especial',
        validation: 'Según configuración',
        details: 'El club podrá personalizar misiones más concretas para eventos o campañas determinadas.',
      },
    ],
  },
};

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

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const level = useMemo(() => {
    if (!id) return null;
    return mockLevels[id] || null;
  }, [id]);

  const [title, setTitle] = useState(level?.title || '');
  const [reward, setReward] = useState(level?.reward || '');
  const [description, setDescription] = useState(level?.description || '');
  const [status, setStatus] = useState(level?.status || 'draft');
  const [saved, setSaved] = useState(false);
  const [missions, setMissions] = useState(level?.missions || []);
  const [editingMissionId, setEditingMissionId] = useState(level?.missions?.[0]?.id || '');
  
  useEffect(() => {
    if (!level) return;
    setTitle(level.title || '');
    setReward(level.reward || '');
    setDescription(level.description || '');
    setStatus(level.status || 'draft');
    setMissions(level.missions || []);
    setEditingMissionId(level.missions?.[0]?.id || '');
  }, [level]);

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

  const panelStyle = {
    background: '#0f1629',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  };

  const buttonPrimary = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    padding: '0 16px',
    borderRadius: 14,
    background: '#00e5ff',
    color: '#001018',
    fontWeight: 800,
    border: '1px solid #00d4eb',
    cursor: 'pointer',
    boxShadow: '0 12px 32px rgba(0,229,255,0.22)',
    whiteSpace: 'nowrap',
  };

  const buttonGhost = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    padding: '0 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const inputStyle = {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb',
    padding: '0 14px',
    outline: 'none',
    fontSize: 14,
  };

  const textareaStyle = {
    width: '100%',
    minHeight: 132,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb',
    padding: '12px 14px',
    outline: 'none',
    fontSize: 14,
    resize: 'vertical',
  };

  const labelStyle = {
    display: 'grid',
    gap: 8,
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 700,
  };
  const smallLabelStyle = {
    display: 'grid',
    gap: 8,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 700,
  };
  
  const helperStyle = {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 1.55,
  };

  if (!level) {
    return (
      <RequireClub>
        <main style={pageStyle}>
          <div style={shellStyle}>
            <section style={panelStyle}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Nivel no encontrado</div>
              <div style={{ ...mutedStyle, maxWidth: 680 }}>
                Todavía no existe configuración para este nivel en el mock del panel. Más adelante esta pantalla se conectará al backend real.
              </div>
              <div style={{ marginTop: 18 }}>
                <button type="button" onClick={() => router.push('/promotions')} style={buttonGhost}>
                  Volver a promociones
                </button>
              </div>
            </section>
          </div>
        </main>
      </RequireClub>
    );
  }

  const statusStyle = getStatusStyles(status);
  const missionCount = missions.length;
  const manualCount = missions.filter((mission) => mission.validation.toLowerCase().includes('manual')).length;
  const editingMission = missions.find((mission) => mission.id === editingMissionId) || missions[0] || null;
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
                Edición de nivel
              </div>
              <h1 style={titleStyle}>{level.title}</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Edita la recompensa final, el estado del nivel y revisa las misiones que lo componen. Más adelante esta pantalla permitirá guardar cambios reales y reordenar misiones.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => router.push('/promotions')} style={buttonGhost}>
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                style={buttonPrimary}
              >
                Guardar cambios
              </button>
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <article style={panelStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Nivel</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{level.level}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Posición actual en el sistema</div>
            </article>
            <article style={panelStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Misiones</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{missionCount}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Tareas necesarias para completar el nivel</div>
            </article>
            <article style={panelStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Revisión manual</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{manualCount}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Misiones que requerirán validar contenido</div>
            </article>
            <article style={panelStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Estado</div>
              <div
                style={{
                  ...statusStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 34,
                  padding: '0 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {status === 'active' ? 'Activo' : status === 'paused' ? 'Pausado' : 'Borrador'}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Visibilidad actual del nivel</div>
            </article>
          </section>

          {saved && (
            <section style={{ ...panelStyle, border: '1px solid rgba(34,197,94,0.26)', background: 'rgba(34,197,94,0.08)' }}>
              <div style={{ color: '#bbf7d0', fontWeight: 800 }}>Guardado visual completado</div>
              <div style={{ color: '#dcfce7', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                Esta confirmación es visual. Cuando conectemos backend, aquí guardaremos el nivel real del club.
              </div>
            </section>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <article style={panelStyle}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 14 }}>
                Configuración general del nivel
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <label style={labelStyle}>
                  Nombre del nivel
                  <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Recompensa final
                  <input value={reward} onChange={(e) => setReward(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Estado del nivel
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                    <option value="active">Activo</option>
                    <option value="draft">Borrador</option>
                    <option value="paused">Pausado</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Descripción
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={textareaStyle} />
                </label>
              </div>
            </article>

            <article style={panelStyle}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 12 }}>
                Vista rápida del nivel
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,229,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                  Resumen para el club
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
                  {title || 'Nivel sin título'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.65, marginBottom: 14 }}>
                  {description || 'Añade una descripción para entender mejor qué representa este nivel.'}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>Recompensa final</div>
                  <div style={{ color: '#e5e7eb', fontSize: 15, fontWeight: 800 }}>{reward || 'Pendiente de definir'}</div>
                  <div
                    style={{
                      ...statusStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      width: 'fit-content',
                      minHeight: 32,
                      padding: '0 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      marginTop: 6,
                    }}
                  >
                    {status === 'active' ? 'Activo' : status === 'paused' ? 'Pausado' : 'Borrador'}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Misiones del nivel</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Cada misión representa una condición parcial. El premio solo se entrega cuando el usuario completa todo el nivel.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                    const nextId = `mission-${Date.now()}`;
                    const nextMission = {
                    id: nextId,
                    title: 'Nueva misión',
                    type: 'Misión especial',
                    validation: 'Según configuración',
                    details: 'Define aquí la condición concreta de esta misión.',
                    };
                    setMissions((prev) => [...prev, nextMission]);
                    setEditingMissionId(nextId);
                }}
                style={buttonGhost}
                >
                + Añadir misión
                </button>
            </div>
          </section>

          {editingMission && (
            <section
              style={{
                ...panelStyle,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <article style={{ display: 'grid', gap: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Editor de misión</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Aquí ya puedes editar visualmente cada misión del nivel. Más adelante lo conectaremos al backend real.
                </div>

                <label style={smallLabelStyle}>
                  Título de la misión
                  <input
                    value={editingMission.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) => prev.map((mission) => (
                        mission.id === editingMission.id ? { ...mission, title: value } : mission
                      )));
                    }}
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={smallLabelStyle}>
                    Tipo de misión
                    <select
                      value={editingMission.type}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMissions((prev) => prev.map((mission) => (
                          mission.id === editingMission.id ? { ...mission, type: value } : mission
                        )));
                      }}
                      style={inputStyle}
                    >
                      <option value="Asistencia">Asistencia</option>
                      <option value="Contenido">Contenido</option>
                      <option value="Difusión">Difusión</option>
                      <option value="Misión especial">Misión especial</option>
                    </select>
                  </label>

                  <label style={smallLabelStyle}>
                    Validación
                    <input
                      value={editingMission.validation}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMissions((prev) => prev.map((mission) => (
                          mission.id === editingMission.id ? { ...mission, validation: value } : mission
                        )));
                      }}
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={smallLabelStyle}>
                  Detalles de la misión
                  <textarea
                    value={editingMission.details}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) => prev.map((mission) => (
                        mission.id === editingMission.id ? { ...mission, details: value } : mission
                      )));
                    }}
                    style={textareaStyle}
                  />
                </label>
              </article>

              <article style={{ display: 'grid', gap: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Vista rápida de la misión</div>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,229,255,0.05))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>Misión seleccionada</div>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>
                    {editingMission.title || 'Misión sin título'}
                  </div>
                  <div>
                    <span
                      style={{
                        ...getMissionTypeStyle(editingMission.type),
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 28,
                        padding: '0 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      {editingMission.type}
                    </span>
                  </div>
                  <div style={helperStyle}>{editingMission.details || 'Añade una explicación para esta misión.'}</div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Validación actual</div>
                    <div style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>
                      {editingMission.validation || 'Pendiente de definir'}
                    </div>
                  </div>
                </div>
              </article>
            </section>
          )}
          <section style={{ display: 'grid', gap: 16 }}>
            {missions.map((mission, index) => {
              const missionTypeStyle = getMissionTypeStyle(mission.type);
              return (
                <article
                  key={mission.id}
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
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 34,
                          height: 34,
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontWeight: 900,
                          fontSize: 13,
                          color: '#cbd5e1',
                        }}
                      >
                        {index + 1}
                      </div>
                      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>
                        {mission.title}
                      </h2>
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

                    <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 14, lineHeight: 1.65 }}>
                      {mission.details}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Validación</div>
                      <div style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>{mission.validation}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10, minWidth: 180 }}>
                    <button
                      type="button"
                      onClick={() => setEditingMissionId(mission.id)}
                      style={{
                        ...buttonGhost,
                        border: editingMissionId === mission.id
                          ? '1px solid rgba(0,229,255,0.26)'
                          : buttonGhost.border,
                        background: editingMissionId === mission.id
                          ? 'rgba(0,229,255,0.08)'
                          : buttonGhost.background,
                        color: editingMissionId === mission.id ? '#7dd3fc' : buttonGhost.color,
                      }}
                    >
                      {editingMissionId === mission.id ? 'Editando' : 'Editar misión'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMissions((prev) => {
                          const next = prev.filter((item) => item.id !== mission.id);
                          if (editingMissionId === mission.id) {
                            setEditingMissionId(next[0]?.id || '');
                          }
                          return next;
                        });
                      }}
                      style={{
                        ...buttonGhost,
                        color: '#fda4af',
                        border: '1px solid rgba(244,63,94,0.18)',
                        background: 'rgba(244,63,94,0.06)',
                      }}
                    >
                      Eliminar misión
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
