'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';
import { confirmDialog } from '@/components/Toast';
import { photoCriteriaFields, parsePhotoCriteriaError, assertLevelsSaved, isPhotoMission } from '@/lib/photoCriteria';
import {
  missionTypeName,
  missionTypeStyle,
  formatTarget,
  levelStatusLabel,
  missionIdentityFields,
  describePromotionsError,
} from '@/lib/promotionsCatalog';
import { API_BASE } from '@/lib/apiBase';


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

  // 'draft' y 'paused' son lo mismo en el backend (active: false)
  return {
    background: 'rgba(250,204,21,0.10)',
    border: '1px solid rgba(250,204,21,0.20)',
    color: '#fde68a',
  };
}

function getDifficultyLabel(difficulty) {
  if (difficulty === 'easy') return 'Fácil';
  if (difficulty === 'hard') return 'Difícil';
  if (difficulty === 'extreme') return 'Extrema';
  return 'Media';
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
  const [deletingLevelNumber, setDeletingLevelNumber] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const resolvedClubId = extractClubId();
      setClubId(resolvedClubId);

      if (!resolvedClubId) {
        if (!cancelled) {
          setLoading(false);
          setNotice('No se ha podido identificar tu local. Vuelve a iniciar sesión.');
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
          setNotice(describePromotionsError(e, 'No se han podido cargar las promociones. Inténtalo de nuevo.'));
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

  async function handleDeleteLevel(levelNumber) {
    if (!clubId) {
      setNotice('No se ha podido identificar tu local. Vuelve a iniciar sesión.');
      return;
    }

    const confirmed = await confirmDialog({
      title: `Eliminar nivel ${levelNumber}`,
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      setDeletingLevelNumber(String(levelNumber));
      setNotice('Eliminando nivel...');

      const nextLevels = levels
        .filter((level) => Number(level.levelNumber) !== Number(levelNumber))
        // Por número de nivel: así `order` vuelve a coincidir con `levelNumber`.
        .sort((a, b) => Number(a.levelNumber || 0) - Number(b.levelNumber || 0))
        .map((level, idx) => ({
          levelNumber: Number(level.levelNumber),
          order: idx + 1,
          title: level.title || `Nivel ${idx + 1}`,
          description: level.description || '',
          difficulty: level.difficulty || 'medium',
          reward: {
            type: level.reward?.type || 'custom',
            title: level.reward?.title || '',
            description: level.reward?.description || '',
            value:
              typeof level.reward?.value === 'number'
                ? level.reward.value
                : (typeof level.reward?.value === 'string' && level.reward.value.trim() !== '' && !Number.isNaN(Number(level.reward.value)))
                  ? Number(level.reward.value)
                  : null,
            active: level.reward?.active !== false,
          },
          status: level.status || (level.active ? 'active' : 'paused') || 'draft',
          active: typeof level.active === 'boolean' ? level.active : level.status === 'active',
          visibleInApp: level.visibleInApp !== false,
          version: Number(level.version || 1),
          missions: Array.isArray(level.missions)
            ? level.missions.map((mission, missionIdx) => ({
                type: mission.type || 'stamps_competition',
                title: mission.title || `Misión ${missionIdx + 1}`,
                description: mission.description || '',
                target: Number.isFinite(Number(mission.target)) ? Number(mission.target) : 1,
                unit: mission.unit || '',
                params: mission.params && typeof mission.params === 'object' ? mission.params : {},
                validationType:
                  mission.validationType || (mission.requiresApproval ? 'manual' : 'automatic') || 'automatic',
                requiresApproval:
                  typeof mission.requiresApproval === 'boolean'
                    ? mission.requiresApproval
                    : mission.validationType === 'manual',
                order: Number.isFinite(Number(mission.order)) ? Number(mission.order) : missionIdx + 1,
                ...missionIdentityFields(mission),
                active: mission.active !== false,
                ...photoCriteriaFields(mission),
              }))
            : [],
        }));

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels: nextLevels }),
      });

      setLevels(assertLevelsSaved(data, nextLevels));
      setNotice('Nivel eliminado correctamente.');
    } catch (e) {
      const criteriaError = parsePhotoCriteriaError(e);
      setNotice(
        `No se ha podido eliminar el nivel. ${describePromotionsError(e)}` +
          (criteriaError ? ' Corrígelo desde la edición de ese nivel.' : '')
      );
    } finally {
      setDeletingLevelNumber('');
    }
  }

  
  const totalMissions = levels.reduce((acc, level) => acc + (Array.isArray(level.missions) ? level.missions.length : 0), 0);
  const activeLevels = levels.filter((level) => level.status === 'active').length;
  const photoMissions = levels.reduce(
    (acc, level) =>
      acc +
      (Array.isArray(level.missions)
        ? level.missions.filter((mission) => isPhotoMission(mission)).length
        : 0),
    0
  );

  const pageStyle = {
    padding: '28px 24px 44px',
    color: '#e5e7eb',
    background:
      'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), var(--nv-bg)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
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
    background: 'var(--nv-surface)',
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
                que el cliente consigue al completarlo.
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
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Niveles configurados en tu local</div>
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
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Misiones de foto</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{photoMissions}</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Las revisa la IA y, si duda, tu equipo</div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Niveles del club</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Cada tarjeta es un nivel. Desde aquí puedes revisar el premio, la dificultad y las misiones antes de editarlo.
                </div>
              </div>
            </div>
          </section>

          <section style={listStyle}>
            {loading ? (
              <section style={{ ...panelStyle, display: 'grid', gap: 12 }}>
                <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '30%' }} />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="nv-skeleton" style={{ height: 64, borderRadius: 14 }} />
                ))}
              </section>
            ) : levels.length === 0 ? (
              <section style={panelStyle}>
                <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No hay niveles disponibles</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Todavía no hay niveles para tu local. Crea el primero con «+ Crear nivel».
                </div>
              </section>
            ) : (
              [...levels]
                // Por número de nivel: es el orden en que avanzan los clientes.
                .sort((a, b) => Number(a.levelNumber || 0) - Number(b.levelNumber || 0))
                .map((level) => {
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
                          {levelStatusLabel(level.status)}
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
                        Nivel {level.levelNumber}
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        {(level.missions || []).map((mission) => {
                          const typeStyle = missionTypeStyle(mission.type);
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
                                    ...typeStyle,
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
                                  {missionTypeName(mission.type)}
                                </span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.55 }}>
                                Objetivo: {formatTarget(mission.target, mission.unit)}
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
                        href={`/promotions/${level.levelNumber}`}
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
                        onClick={() => handleDeleteLevel(level.levelNumber)}
                        disabled={deletingLevelNumber === String(level.levelNumber)}
                        style={{
                          minHeight: 44,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(244,63,94,0.18)',
                          background: 'rgba(244,63,94,0.06)',
                          color: '#fda4af',
                          fontWeight: 700,
                          cursor:
                            deletingLevelNumber === String(level.levelNumber)
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            deletingLevelNumber === String(level.levelNumber)
                              ? 0.7
                              : 1,
                        }}
                      >
                        {deletingLevelNumber === String(level.levelNumber) ? 'Eliminando...' : 'Eliminar nivel'}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
