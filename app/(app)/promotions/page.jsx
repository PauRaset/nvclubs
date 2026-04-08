'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';

const API_BASE = 'https://api.nightvibe.life';

const roadmap = [
  {
    title: '10 niveles por defecto',
    description:
      'Cada club parte de una estructura inicial y luego puede personalizar nombre, dificultad, recompensa, orden y misiones.',
  },
  {
    title: 'Premio al completar el nivel',
    description:
      'La recompensa se desbloquea cuando el usuario completa todo el nivel, no al terminar una misión suelta.',
  },
  {
    title: 'Misiones con validación distinta',
    description:
      'Habrá misiones automáticas, manuales y ligadas a tracking, para que el sistema sea entendible tanto en panel como en app.',
  },
  {
    title: 'Sistema editable por club',
    description:
      'El club podrá ajustar su propio sistema de promociones y la app leerá esa configuración real desde backend.',
  },
];

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('nv_token') ||
    localStorage.getItem('authToken') ||
    '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...getAuthHeaders(),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && data.error) ||
      (data && data.message) ||
      (typeof data === 'string' && data) ||
      `Error (HTTP ${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

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

function getStatusLabel(status) {
  if (status === 'active') return 'Activo';
  if (status === 'paused') return 'Pausado';
  return 'Borrador';
}

function getDifficultyLabel(difficulty) {
  if (difficulty === 'easy') return 'Fácil';
  if (difficulty === 'hard') return 'Difícil';
  if (difficulty === 'extreme') return 'Extremo';
  return 'Media';
}

function getMissionTypeLabel(type) {
  const map = {
    attend_event: 'Asistencia',
    upload_event_photo: 'Contenido',
    approved_event_photo: 'Contenido',
    follow_users: 'Social',
    group_photo_with_followed: 'Contenido',
    scan_qr: 'QR',
    theme_photo: 'Contenido',
    photocall_photo: 'Contenido',
    show_prizes_photo: 'Contenido',
    stamps_competition: 'Misión especial',
    share_event: 'Difusión',
    link_clicks: 'Difusión',
    unique_visits: 'Difusión',
    referred_purchases: 'Difusión',
  };
  return map[type] || 'Misión';
}

function getMissionValidationLabel(mission) {
  const validation = mission?.validationType || (mission?.requiresApproval ? 'manual' : 'automatic');
  if (validation === 'manual') return 'Manual por el club';
  if (validation === 'link_tracking') return 'Tracking de enlace';
  if (validation === 'hybrid') return 'Híbrida';
  return 'Automática';
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

  if (type === 'QR') {
    return {
      background: 'rgba(249,115,22,0.10)',
      border: '1px solid rgba(249,115,22,0.18)',
      color: '#fdba74',
    };
  }

  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#cbd5e1',
  };
}

function extractClubId() {
  const user = getUser?.() || null;
  return (
    user?._id ||
    user?.id ||
    user?.clubId ||
    user?.club?._id ||
    user?.club?.id ||
    ''
  );
}

export default function PromotionsPage() {
  const [clubId, setClubId] = useState('');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const resolvedClubId = extractClubId();
      setClubId(resolvedClubId);

      if (!resolvedClubId) {
        if (!cancelled) {
          setLoading(false);
          setNotice('No se ha podido resolver el club actual para cargar promociones.');
        }
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const data = await apiJson(`${API_BASE}/api/promotions/clubs/${resolvedClubId}/levels`);
        if (!cancelled) {
          setLevels(Array.isArray(data?.levels) ? data.levels : []);
        }
      } catch (e) {
        if (!cancelled) {
          setLevels([]);
          setNotice(e?.message || 'No se pudo cargar la configuración de promociones.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalMissions = levels.reduce((acc, level) => acc + (Array.isArray(level.missions) ? level.missions.length : 0), 0);
  const activeLevels = levels.filter((level) => level.status === 'active').length;
  const manualReviewMissions = levels.reduce(
    (acc, level) =>
      acc +
      (Array.isArray(level.missions)
        ? level.missions.filter((mission) => getMissionValidationLabel(mission).toLowerCase().includes('manual')).length
        : 0),
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
                que el usuario desbloquea al completarlo. Esta vista ya carga la configuración real del club desde backend.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/promotions/new" style={primaryBtn}>
                + Crear nivel
              </a>
            </div>
          </section>

          {notice && (
            <section
              style={{
                ...panelStyle,
                border: '1px solid rgba(0,229,255,0.14)',
                background: 'rgba(0,229,255,0.05)',
                color: '#dff9ff',
              }}
            >
              {notice}
            </section>
          )}

          <section style={statGridStyle}>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Niveles visibles</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{levels.length}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Configuración real cargada para este club</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Niveles activos</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{activeLevels}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Listos para estar visibles en la app</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Misiones</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{totalMissions}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Tareas repartidas dentro de los niveles</div>
            </article>
            <article style={statCardStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Revisión manual</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{manualReviewMissions}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Misiones que requieren validación manual</div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Niveles del club</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Cada tarjeta representa un nivel-promoción real del club. Desde aquí puedes revisar recompensa, dificultad y misiones antes de editarlo.
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>
                {clubId ? `Club actual: ${clubId}` : 'Club no resuelto'}
              </div>
            </div>
          </section>

          <section style={listStyle}>
            {loading ? (
              <section style={panelStyle}>Cargando niveles del club...</section>
            ) : levels.length === 0 ? (
              <section style={panelStyle}>
                <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No hay niveles disponibles</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Cuando el backend genere o guarde la configuración del club, aparecerá aquí el sistema completo de promociones por niveles.
                </div>
              </section>
            ) : (
              levels.map((level) => {
                const statusStyle = getStatusStyles(level.status);

                return (
                  <article
                    key={level.id || `${level.levelNumber}`}
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
                          {getStatusLabel(level.status)}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 32,
                            padding: '0 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#cbd5e1',
                          }}
                        >
                          {getDifficultyLabel(level.difficulty)}
                        </span>
                      </div>

                      <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
                        Recompensa final: <strong>{level.reward?.title || 'Sin recompensa definida'}</strong>
                      </div>

                      <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 13.5, lineHeight: 1.55 }}>
                        Orden: {level.order} · Nivel: {level.levelNumber} · Visible en app: {level.visibleInApp ? 'Sí' : 'No'}
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        {(level.missions || []).map((mission) => {
                          const missionTypeLabel = getMissionTypeLabel(mission.type);
                          const missionTypeStyle = getMissionTypeStyle(missionTypeLabel);
                          return (
                            <div
                              key={mission.id || `${mission.type}-${mission.order}`}
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
                                  {missionTypeLabel}
                                </span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.55 }}>
                                Validación: {getMissionValidationLabel(mission)} · Objetivo: {mission.target || 1} {mission.unit || ''}
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
                        href={`/promotions/${level.id || level.levelNumber}`}
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
              })
            )}
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
                Esta pantalla ya queda conectada a la lógica real del sistema de promociones por niveles del club.
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
