'use client';

import { useEffect, useState } from 'react';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';
import { confirmDialog } from '@/components/Toast';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://api.nightvibe.life';

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

function getStatusBadge(status) {
  if (status === 'active') return 'nv-badge-success';
  if (status === 'paused') return 'nv-badge-warn';
  return 'nv-badge-neutral';
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

function getMissionTypeBadge(typeLabel) {
  if (typeLabel === 'Contenido') return 'nv-badge';
  if (typeLabel === 'Difusión') return 'nv-badge-indigo';
  if (typeLabel === 'Asistencia') return 'nv-badge-success';
  if (typeLabel === 'QR') return 'nv-badge-warn';
  return 'nv-badge-neutral';
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
  const [noticeKind, setNoticeKind] = useState('info');
  const [deletingLevelNumber, setDeletingLevelNumber] = useState('');
  const [reorderingLevelNumber, setReorderingLevelNumber] = useState('');

  function flash(message, kind = 'info') {
    setNotice(message);
    setNoticeKind(kind);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const resolvedClubId = extractClubId();
      setClubId(resolvedClubId);

      if (!resolvedClubId) {
        if (!cancelled) {
          setLoading(false);
          flash('No se ha podido resolver el club actual para cargar promociones.', 'error');
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
          flash(e?.message || 'No se pudo cargar la configuración de promociones.', 'error');
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
      flash('No se ha podido resolver el club actual.', 'error');
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
      flash('Eliminando nivel...', 'info');

      const nextLevels = levels
        .filter((level) => Number(level.levelNumber) !== Number(levelNumber))
        .sort((a, b) => Number(a.order || a.levelNumber || 0) - Number(b.order || b.levelNumber || 0))
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
                active: mission.active !== false,
              }))
            : [],
        }));

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels: nextLevels }),
      });

      setLevels(Array.isArray(data?.levels) ? data.levels : []);
      flash('Nivel eliminado correctamente.', 'success');
    } catch (e) {
      flash(e?.message || 'No se pudo eliminar el nivel.', 'error');
    } finally {
      setDeletingLevelNumber('');
    }
  }


  async function handleMoveLevel(levelNumber, direction) {
    if (!clubId) {
      flash('No se ha podido resolver el club actual.', 'error');
      return;
    }

    const sortedLevels = [...levels].sort(
      (a, b) => Number(a.order || a.levelNumber || 0) - Number(b.order || b.levelNumber || 0)
    );

    const currentIndex = sortedLevels.findIndex(
      (level) => Number(level.levelNumber) === Number(levelNumber)
    );
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedLevels.length) return;

    const swapped = [...sortedLevels];
    const temp = swapped[currentIndex];
    swapped[currentIndex] = swapped[targetIndex];
    swapped[targetIndex] = temp;

    const payloadLevels = swapped.map((level, idx) => ({
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
            : (typeof level.reward?.value === 'string' &&
                level.reward.value.trim() !== '' &&
                !Number.isNaN(Number(level.reward.value)))
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
            active: mission.active !== false,
          }))
        : [],
    }));

    try {
      setReorderingLevelNumber(String(levelNumber));
      flash(direction === 'up' ? 'Subiendo nivel...' : 'Bajando nivel...', 'info');

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels: payloadLevels }),
      });

      setLevels(Array.isArray(data?.levels) ? data.levels : []);
      flash('Orden de niveles actualizado correctamente.', 'success');
    } catch (e) {
      flash(e?.message || 'No se pudo reordenar el nivel.', 'error');
    } finally {
      setReorderingLevelNumber('');
    }
  }

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

  const kpis = [
    { label: 'Niveles', value: levels.length, help: 'Configuración cargada del club' },
    { label: 'Activos', value: activeLevels, help: 'Visibles en la app' },
    { label: 'Misiones', value: totalMissions, help: 'Repartidas entre los niveles' },
    { label: 'Revisión manual', value: manualReviewMissions, help: 'Misiones que valida el club' },
  ];

  const orderedLevels = [...levels].sort(
    (a, b) => Number(a.order || a.levelNumber || 0) - Number(b.order || b.levelNumber || 0)
  );

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Sistema de niveles</span>
            <h1 className="nv-h1" style={{ marginTop: 10 }}>Promociones</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 620 }}>
              Cada promoción es un nivel con sus misiones y una recompensa que el usuario
              desbloquea al completarlo.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a href="/promotions/new" className="nv-btn nv-btn-primary">+ Crear nivel</a>
          </div>
        </section>

        {notice && (
          <div className={`nv-notice nv-notice-${noticeKind}`} role={noticeKind === 'error' ? 'alert' : 'status'}>
            {notice}
          </div>
        )}

        <section className="nv-grid-auto nv-stagger">
          {kpis.map((item) => (
            <article key={item.label} className="nv-kpi">
              <div className="nv-kpi-label">{item.label}</div>
              {loading ? (
                <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '40%', marginTop: 0 }} />
              ) : (
                <div className="nv-kpi-value">{item.value}</div>
              )}
              <div className="nv-kpi-help">{item.help}</div>
            </article>
          ))}
        </section>

        {loading ? (
          <section className="nv-card" style={{ display: 'grid', gap: 12 }}>
            <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '30%', marginTop: 0 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="nv-skeleton" style={{ height: 72, borderRadius: 16 }} />
            ))}
          </section>
        ) : orderedLevels.length === 0 ? (
          <section className="nv-card">
            <div className="nv-empty">
              <div className="nv-empty-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="8" width="14" height="12" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2M12 12v4" />
                </svg>
              </div>
              <div className="nv-empty-title">Aún no hay niveles</div>
              <div className="nv-empty-text">
                Crea tu primer nivel para empezar a construir el sistema de promociones del club.
              </div>
              <a href="/promotions/new" className="nv-btn nv-btn-primary" style={{ marginTop: 6 }}>+ Crear nivel</a>
            </div>
          </section>
        ) : (
          <section className="nv-stagger" style={{ display: 'grid', gap: 16 }}>
            {orderedLevels.map((level, index) => {
              const levelKey = String(level.levelNumber);
              const busy = deletingLevelNumber === levelKey || reorderingLevelNumber === levelKey;

              return (
                <article key={level.id || levelKey} className="nv-card" style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="nv-row" style={{ gap: 12 }}>
                      <span className="nv-index">{index + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="nv-row" style={{ gap: 8 }}>
                          <h2 className="nv-h3 nv-truncate" style={{ fontSize: 20, minWidth: 0 }}>{level.title || `Nivel ${index + 1}`}</h2>
                          <span className={getStatusBadge(level.status)}>{getStatusLabel(level.status)}</span>
                          <span className="nv-badge-neutral nv-badge">{getDifficultyLabel(level.difficulty)}</span>
                        </div>
                        <div className="nv-small nv-muted" style={{ marginTop: 6 }}>
                          Visible en app: {level.visibleInApp ? 'Sí' : 'No'}
                        </div>
                      </div>
                    </div>

                    <div className="nv-notice nv-notice-info" style={{ marginTop: 14 }}>
                      <strong>Recompensa:</strong> {level.reward?.title || 'Sin recompensa definida'}
                    </div>

                    {Array.isArray(level.missions) && level.missions.length > 0 && (
                      <ul className="nv-list" style={{ marginTop: 14 }}>
                        {level.missions.map((mission) => {
                          const typeLabel = getMissionTypeLabel(mission.type);
                          return (
                            <li key={mission.id || `${mission.type}-${mission.order}`} className="nv-item">
                              <div className="nv-row" style={{ gap: 10 }}>
                                <span className="nv-h4" style={{ fontSize: 15 }}>{mission.title}</span>
                                <span className={getMissionTypeBadge(typeLabel)}>{typeLabel}</span>
                              </div>
                              <div className="nv-small nv-muted">
                                Validación: {getMissionValidationLabel(mission)} · Objetivo: {mission.target || 1} {mission.unit || ''}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="nv-event-actions" style={{ minWidth: 150 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleMoveLevel(level.levelNumber, 'up')}
                        disabled={index === 0 || busy}
                        className="nv-btn nv-btn-ghost nv-btn-icon"
                        aria-label="Subir nivel"
                        title="Subir"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => handleMoveLevel(level.levelNumber, 'down')}
                        disabled={index === orderedLevels.length - 1 || busy}
                        className="nv-btn nv-btn-ghost nv-btn-icon"
                        aria-label="Bajar nivel"
                        title="Bajar"
                      >↓</button>
                    </div>
                    <a href={`/promotions/${level.levelNumber}`} className="nv-btn nv-btn-secondary">Ver / Editar</a>
                    <button
                      type="button"
                      onClick={() => handleDeleteLevel(level.levelNumber)}
                      disabled={busy}
                      className="nv-btn nv-btn-danger"
                    >
                      {deletingLevelNumber === levelKey ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </RequireClub>
  );
}
