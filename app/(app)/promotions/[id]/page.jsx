'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';

const API_BASE = 'https://api.nightvibe.life';

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

function extractClubId() {
  const user = getUser?.() || null;
  return user?._id || user?.id || user?.clubId || user?.club?._id || user?.club?.id || '';
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

function getMissionTypeBadge(typeLabel) {
  if (typeLabel === 'Contenido') return 'nv-badge';
  if (typeLabel === 'Difusión') return 'nv-badge-indigo';
  if (typeLabel === 'Asistencia') return 'nv-badge-success';
  if (typeLabel === 'QR') return 'nv-badge-warn';
  return 'nv-badge-neutral';
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
  return map[type] || 'Misión especial';
}

function getMissionTypeValue(label) {
  const map = {
    Asistencia: 'attend_event',
    Contenido: 'upload_event_photo',
    Difusión: 'share_event',
    QR: 'scan_qr',
    'Misión especial': 'stamps_competition',
  };
  return map[label] || 'stamps_competition';
}

function getValidationLabel(mission) {
  const validation = mission?.validationType || (mission?.requiresApproval ? 'manual' : 'automatic');
  if (validation === 'manual') return 'Manual por el club';
  if (validation === 'link_tracking') return 'Tracking de enlace';
  if (validation === 'hybrid') return 'Híbrida';
  return 'Automática';
}

function getValidationTypeFromLabel(label) {
  if (label === 'Manual por el club') return 'manual';
  if (label === 'Tracking de enlace') return 'link_tracking';
  if (label === 'Híbrida') return 'hybrid';
  return 'automatic';
}

function normalizeLevelForEditor(level) {
  if (!level) return null;
  return {
    ...level,
    reward:
      typeof level.reward === 'object' && level.reward !== null
        ? level.reward
        : { title: '', description: '', type: 'custom', value: {}, active: true },
    missions: Array.isArray(level.missions)
      ? level.missions.map((mission, index) => ({
          ...mission,
          id: mission.id || mission._id || `mission-${index + 1}`,
          typeLabel: getMissionTypeLabel(mission.type),
          validation: getValidationLabel(mission),
          details: mission.description || '',
        }))
      : [],
  };
}

function serializeLevelForSave(level, form) {
  return {
    levelNumber: Number(level.levelNumber || form.levelNumber || 1),
    order: Number(level.order || level.levelNumber || form.levelNumber || 1),
    title: form.title.trim(),
    description: form.description.trim(),
    difficulty: level.difficulty || 'medium',
    reward: {
      ...(level.reward || {}),
      title: form.reward.trim(),
    },
    status: form.status,
    active: form.status === 'active',
    visibleInApp: typeof level.visibleInApp === 'boolean' ? level.visibleInApp : true,
    version: Number(level.version || 1),
    missions: (form.missions || []).map((mission, idx) => ({
      ...(mission.id ? { _id: mission.id } : {}),
      type: mission.type || getMissionTypeValue(mission.typeLabel),
      title: (mission.title || '').trim(),
      description: (mission.details || '').trim(),
      target: Number.isFinite(Number(mission.target)) ? Number(mission.target) : 1,
      unit: String(mission.unit || '').trim(),
      params: mission.params && typeof mission.params === 'object' ? mission.params : {},
      validationType: mission.validationType || getValidationTypeFromLabel(mission.validation),
      requiresApproval: (mission.validationType || getValidationTypeFromLabel(mission.validation)) === 'manual',
      order: Number.isFinite(Number(mission.order)) ? Number(mission.order) : idx + 1,
      active: typeof mission.active === 'boolean' ? mission.active : true,
    })),
  };
}

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [clubId, setClubId] = useState('');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState('info');
  const [saved, setSaved] = useState(false);

  function flash(message, kind = 'info') {
    setNotice(message);
    setNoticeKind(kind);
  }

  const level = useMemo(() => {
    if (!id) return null;
    const found = levels.find((item) => String(item.levelNumber) === String(id));
    return normalizeLevelForEditor(found || null);
  }, [levels, id]);

  const [levelNumber, setLevelNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [missions, setMissions] = useState([]);
  const [editingMissionId, setEditingMissionId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const resolvedClubId = extractClubId();
      setClubId(resolvedClubId);

      if (!resolvedClubId) {
        if (!cancelled) {
          flash('No se ha podido resolver el club actual para cargar este nivel.', 'error');
          setLoading(false);
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
          flash(e?.message || 'No se pudo cargar la configuración del nivel.', 'error');
          setLevels([]);
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

  useEffect(() => {
    if (!level) return;
    setLevelNumber(level.levelNumber || 1);
    setTitle(level.title || '');
    setReward(level.reward?.title || '');
    setDescription(level.description || '');
    setStatus(level.status || 'draft');
    setMissions(level.missions || []);
    setEditingMissionId(level.missions?.[0]?.id || '');
  }, [level]);

  async function handleSave() {
    if (!clubId || !level) return;

    try {
      flash('Guardando cambios del nivel...', 'info');
      const nextLevels = levels.map((item) => {
        if (String(item.levelNumber) !== String(id)) return item;
        return serializeLevelForSave(item, {
          levelNumber,
          title,
          reward,
          description,
          status,
          missions,
        });
      });

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels: nextLevels }),
      });

      const savedLevels = Array.isArray(data?.levels) ? data.levels : [];
      setLevels(savedLevels);
      setSaved(true);
      flash('Cambios guardados correctamente en la configuración del club.', 'success');
      router.replace(`/promotions/${levelNumber}`);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      flash(e?.message || 'No se pudieron guardar los cambios del nivel.', 'error');
    }
  }

  if (loading) {
    return (
      <RequireClub>
        <div className="nv-views">
          <section className="nv-card" style={{ display: 'grid', gap: 12 }}>
            <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '40%', marginTop: 0 }} />
            <div className="nv-skeleton" style={{ height: 56, borderRadius: 14 }} />
            <div className="nv-skeleton" style={{ height: 120, borderRadius: 14 }} />
          </section>
        </div>
      </RequireClub>
    );
  }

  if (!level) {
    return (
      <RequireClub>
        <div className="nv-views">
          <section className="nv-card">
            <div className="nv-empty">
              <div className="nv-empty-icon is-error" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="nv-empty-title">Nivel no encontrado</div>
              <div className="nv-empty-text">
                No existe configuración para este nivel dentro del sistema real del club.
              </div>
              <button type="button" onClick={() => router.push('/promotions')} className="nv-btn nv-btn-secondary" style={{ marginTop: 6 }}>
                Volver a promociones
              </button>
            </div>
          </section>
        </div>
      </RequireClub>
    );
  }

  const missionCount = missions.length;
  const manualCount = missions.filter((mission) => getValidationLabel(mission).toLowerCase().includes('manual')).length;
  const editingMission = missions.find((mission) => mission.id === editingMissionId) || missions[0] || null;

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Edición de nivel</span>
            <h1 className="nv-h1 nv-truncate" style={{ marginTop: 10 }}>{title || level.title}</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 620 }}>
              Edita la recompensa final, el estado del nivel y revisa las misiones que lo componen.
              Los cambios se guardan en la configuración del club.
            </p>
          </div>

          <div className="nv-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.push('/promotions')} className="nv-btn nv-btn-secondary">
              Volver
            </button>
            <button type="button" onClick={handleSave} className="nv-btn nv-btn-primary">
              Guardar cambios
            </button>
          </div>
        </section>

        {notice && (
          <div className={`nv-notice nv-notice-${noticeKind}`} role={noticeKind === 'error' ? 'alert' : 'status'}>
            {notice}
          </div>
        )}

        <section className="nv-grid-auto">
          <article className="nv-kpi">
            <div className="nv-kpi-label">Nivel</div>
            <div className="nv-kpi-value">{levelNumber}</div>
            <div className="nv-kpi-help">Posición actual en el sistema</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Misiones</div>
            <div className="nv-kpi-value">{missionCount}</div>
            <div className="nv-kpi-help">Tareas necesarias para completar el nivel</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Revisión manual</div>
            <div className="nv-kpi-value">{manualCount}</div>
            <div className="nv-kpi-help">Misiones que requerirán validar contenido</div>
          </article>
          <article className="nv-kpi">
            <div className="nv-kpi-label">Estado</div>
            <div style={{ marginTop: 4 }}>
              <span className={getStatusBadge(status)}>{getStatusLabel(status)}</span>
            </div>
            <div className="nv-kpi-help">Visibilidad actual del nivel</div>
          </article>
        </section>

        <section className="nv-grid-auto" style={{ alignItems: 'start' }}>
          <article className="nv-card">
            <h2 className="nv-h3" style={{ marginBottom: 16 }}>Configuración general del nivel</h2>

            <div style={{ display: 'grid', gap: 14 }}>
              <div className="nv-field">
                <label className="nv-label">Nombre del nivel</label>
                <input className="nv-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="nv-field">
                <label className="nv-label">Recompensa final</label>
                <input className="nv-input" value={reward} onChange={(e) => setReward(e.target.value)} />
              </div>

              <div className="nv-field">
                <label className="nv-label">Estado del nivel</label>
                <select className="nv-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="draft">Borrador</option>
                  <option value="paused">Pausado</option>
                </select>
              </div>

              <div className="nv-field">
                <label className="nv-label">Descripción</label>
                <textarea className="nv-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </article>

          <article className="nv-card">
            <h2 className="nv-h3" style={{ marginBottom: 16 }}>Vista rápida del nivel</h2>

            <div className="nv-card-soft">
              <div className="nv-eyebrow">Resumen para el club</div>
              <div className="nv-h3" style={{ fontSize: 24, marginTop: 10 }}>
                {title || 'Nivel sin título'}
              </div>
              <p className="nv-lead" style={{ marginTop: 8 }}>
                {description || 'Añade una descripción para entender mejor qué representa este nivel.'}
              </p>
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <div className="nv-small nv-muted">Recompensa final</div>
                <div className="nv-h4" style={{ fontSize: 15 }}>{reward || 'Pendiente de definir'}</div>
                <div style={{ marginTop: 4 }}>
                  <span className={getStatusBadge(status)}>{getStatusLabel(status)}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="nv-card">
          <div className="nv-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="nv-h3">Misiones del nivel</h2>
              <p className="nv-small nv-muted" style={{ marginTop: 8, maxWidth: 620 }}>
                Cada misión representa una condición parcial. El premio solo se entrega cuando el usuario completa todo el nivel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextId = `mission-${Date.now()}`;
                const nextMission = {
                  id: nextId,
                  title: 'Nueva misión',
                  type: 'stamps_competition',
                  typeLabel: 'Misión especial',
                  validationType: 'automatic',
                  validation: 'Automática',
                  details: 'Define aquí la condición concreta de esta misión.',
                  description: 'Define aquí la condición concreta de esta misión.',
                  target: 1,
                  unit: '',
                  params: {},
                  order: missions.length + 1,
                  active: true,
                };
                setMissions((prev) => [...prev, nextMission]);
                setEditingMissionId(nextId);
              }}
              className="nv-btn nv-btn-secondary"
            >
              + Añadir misión
            </button>
          </div>
        </section>

        {editingMission && (
          <section className="nv-card nv-grid-auto" style={{ alignItems: 'start' }}>
              <article style={{ display: 'grid', gap: 14 }}>
                <div>
                  <h2 className="nv-h3">Editor de misión</h2>
                  <p className="nv-small nv-muted" style={{ marginTop: 8 }}>
                    Edita cada misión del nivel y guárdala en la configuración del club.
                  </p>
                </div>

                <div className="nv-field">
                  <label className="nv-label">Título de la misión</label>
                  <input
                    className="nv-input"
                    value={editingMission.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) =>
                        prev.map((mission) =>
                          mission.id === editingMission.id ? { ...mission, title: value } : mission
                        )
                      );
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div className="nv-field">
                    <label className="nv-label">Tipo de misión</label>
                    <select
                      className="nv-select"
                      value={editingMission.typeLabel}
                      onChange={(e) => {
                        const label = e.target.value;
                        const value = getMissionTypeValue(label);
                        setMissions((prev) =>
                          prev.map((mission) =>
                            mission.id === editingMission.id
                              ? { ...mission, typeLabel: label, type: value }
                              : mission
                          )
                        );
                      }}
                    >
                      <option value="Asistencia">Asistencia</option>
                      <option value="Contenido">Contenido</option>
                      <option value="Difusión">Difusión</option>
                      <option value="QR">QR</option>
                      <option value="Misión especial">Misión especial</option>
                    </select>
                  </div>

                  <div className="nv-field">
                    <label className="nv-label">Validación</label>
                    <select
                      className="nv-select"
                      value={editingMission.validation}
                      onChange={(e) => {
                        const label = e.target.value;
                        const validationType = getValidationTypeFromLabel(label);
                        setMissions((prev) =>
                          prev.map((mission) =>
                            mission.id === editingMission.id
                              ? {
                                  ...mission,
                                  validation: label,
                                  validationType,
                                  requiresApproval: validationType === 'manual',
                                }
                              : mission
                          )
                        );
                      }}
                    >
                      <option value="Automática">Automática</option>
                      <option value="Manual por el club">Manual por el club</option>
                      <option value="Tracking de enlace">Tracking de enlace</option>
                      <option value="Híbrida">Híbrida</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div className="nv-field">
                    <label className="nv-label">Objetivo</label>
                    <input
                      className="nv-input"
                      type="number"
                      min="1"
                      value={editingMission.target || 1}
                      onChange={(e) => {
                        const value = Number(e.target.value || 1);
                        setMissions((prev) =>
                          prev.map((mission) =>
                            mission.id === editingMission.id ? { ...mission, target: value } : mission
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="nv-field">
                    <label className="nv-label">Unidad</label>
                    <input
                      className="nv-input"
                      value={editingMission.unit || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMissions((prev) =>
                          prev.map((mission) =>
                            mission.id === editingMission.id ? { ...mission, unit: value } : mission
                          )
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="nv-field">
                  <label className="nv-label">Detalles de la misión</label>
                  <textarea
                    className="nv-textarea"
                    value={editingMission.details}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) =>
                        prev.map((mission) =>
                          mission.id === editingMission.id
                            ? { ...mission, details: value, description: value }
                            : mission
                        )
                      );
                    }}
                  />
                </div>
              </article>

              <article style={{ display: 'grid', gap: 14 }}>
                <h2 className="nv-h3">Vista rápida de la misión</h2>
                <div className="nv-card-soft" style={{ display: 'grid', gap: 12 }}>
                  <div className="nv-small nv-muted">Misión seleccionada</div>
                  <div className="nv-h3" style={{ fontSize: 22 }}>
                    {editingMission.title || 'Misión sin título'}
                  </div>
                  <div>
                    <span className={getMissionTypeBadge(editingMission.typeLabel)}>
                      {editingMission.typeLabel}
                    </span>
                  </div>
                  <div className="nv-small nv-muted">{editingMission.details || 'Añade una explicación para esta misión.'}</div>
                  <div className="nv-notice nv-notice-info">
                    <div className="nv-small nv-muted" style={{ marginBottom: 6 }}>Validación actual</div>
                    <div className="nv-small">{editingMission.validation || 'Pendiente de definir'}</div>
                  </div>
                </div>
              </article>
          </section>
        )}

        <section className="nv-stagger" style={{ display: 'grid', gap: 16 }}>
            {missions.map((mission, index) => {
              const typeLabel = mission.typeLabel || getMissionTypeLabel(mission.type);
              return (
                <article
                  key={mission.id}
                  className="nv-card"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 18,
                    alignItems: 'start',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="nv-row" style={{ gap: 12 }}>
                      <span className="nv-index">{index + 1}</span>
                      <h2 className="nv-h3 nv-truncate" style={{ fontSize: 20, minWidth: 0 }}>
                        {mission.title}
                      </h2>
                      <span className={getMissionTypeBadge(typeLabel)}>
                        {typeLabel}
                      </span>
                    </div>

                    <div className="nv-small nv-muted" style={{ marginTop: 12 }}>
                      {mission.details || mission.description}
                    </div>

                    <div className="nv-notice nv-notice-info" style={{ marginTop: 14 }}>
                      <div className="nv-small nv-muted" style={{ marginBottom: 6 }}>Validación</div>
                      <div className="nv-small">{mission.validation}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10, minWidth: 160 }}>
                    <button
                      type="button"
                      onClick={() => setEditingMissionId(mission.id)}
                      className={`nv-btn ${editingMissionId === mission.id ? 'nv-btn-primary' : 'nv-btn-secondary'}`}
                    >
                      {editingMissionId === mission.id ? 'Editando' : 'Editar misión'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMissions((prev) => {
                          const next = prev
                            .filter((item) => item.id !== mission.id)
                            .map((item, idx) => ({ ...item, order: idx + 1 }));
                          if (editingMissionId === mission.id) {
                            setEditingMissionId(next[0]?.id || '');
                          }
                          return next;
                        });
                      }}
                      className="nv-btn nv-btn-danger"
                    >
                      Eliminar misión
                    </button>
                  </div>
                </article>
              );
            })}
        </section>
      </div>
    </RequireClub>
  );
}
