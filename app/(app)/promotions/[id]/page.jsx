// REPLACED WITH NEW IMPLEMENTATION
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
  const [saved, setSaved] = useState(false);

  const level = useMemo(() => {
    if (!id) return null;
    const found = levels.find((item) => String(item.id || item.levelNumber) === String(id));
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
          setNotice('No se ha podido resolver el club actual para cargar este nivel.');
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
          setNotice(e?.message || 'No se pudo cargar la configuración del nivel.');
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

  const pageStyle = {
    padding: '28px 24px 44px',
    color: '#e5e7eb',
    background: 'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), #0b0f19',
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

  async function handleSave() {
    if (!clubId || !level) return;

    try {
      setNotice('Guardando cambios del nivel...');
      const nextLevels = levels.map((item) => {
        if (String(item.id || item.levelNumber) !== String(id)) return item;
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
      setNotice('Cambios guardados correctamente en la configuración del club.');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setNotice(e?.message || 'No se pudieron guardar los cambios del nivel.');
    }
  }

  if (loading) {
    return (
      <RequireClub>
        <main style={pageStyle}>
          <div style={shellStyle}>
            <section style={panelStyle}>Cargando nivel...</section>
          </div>
        </main>
      </RequireClub>
    );
  }

  if (!level) {
    return (
      <RequireClub>
        <main style={pageStyle}>
          <div style={shellStyle}>
            <section style={panelStyle}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Nivel no encontrado</div>
              <div style={{ ...mutedStyle, maxWidth: 680 }}>
                No existe configuración para este nivel dentro del sistema real del club.
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
  const manualCount = missions.filter((mission) => getValidationLabel(mission).toLowerCase().includes('manual')).length;
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
              <h1 style={titleStyle}>{title || level.title}</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Edita la recompensa final, el estado del nivel y revisa las misiones que lo componen. Esta pantalla ya guarda cambios reales en backend para el club actual.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => router.push('/promotions')} style={buttonGhost}>
                Volver
              </button>
              <button type="button" onClick={handleSave} style={buttonPrimary}>
                Guardar cambios
              </button>
            </div>
          </section>

          {notice && (
            <section
              style={{
                ...panelStyle,
                border: saved ? '1px solid rgba(34,197,94,0.26)' : '1px solid rgba(0,229,255,0.14)',
                background: saved ? 'rgba(34,197,94,0.08)' : 'rgba(0,229,255,0.05)',
                color: saved ? '#dcfce7' : '#dff9ff',
              }}
            >
              {notice}
            </section>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <article style={panelStyle}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Nivel</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{levelNumber}</div>
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
                  Aquí ya puedes editar visualmente cada misión del nivel y guardarla en el backend del club.
                </div>

                <label style={smallLabelStyle}>
                  Título de la misión
                  <input
                    value={editingMission.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) =>
                        prev.map((mission) =>
                          mission.id === editingMission.id ? { ...mission, title: value } : mission
                        )
                      );
                    }}
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={smallLabelStyle}>
                    Tipo de misión
                    <select
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
                      style={inputStyle}
                    >
                      <option value="Asistencia">Asistencia</option>
                      <option value="Contenido">Contenido</option>
                      <option value="Difusión">Difusión</option>
                      <option value="QR">QR</option>
                      <option value="Misión especial">Misión especial</option>
                    </select>
                  </label>

                  <label style={smallLabelStyle}>
                    Validación
                    <select
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
                      style={inputStyle}
                    >
                      <option value="Automática">Automática</option>
                      <option value="Manual por el club">Manual por el club</option>
                      <option value="Tracking de enlace">Tracking de enlace</option>
                      <option value="Híbrida">Híbrida</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={smallLabelStyle}>
                    Objetivo
                    <input
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
                      style={inputStyle}
                    />
                  </label>

                  <label style={smallLabelStyle}>
                    Unidad
                    <input
                      value={editingMission.unit || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMissions((prev) =>
                          prev.map((mission) =>
                            mission.id === editingMission.id ? { ...mission, unit: value } : mission
                          )
                        );
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
                      setMissions((prev) =>
                        prev.map((mission) =>
                          mission.id === editingMission.id
                            ? { ...mission, details: value, description: value }
                            : mission
                        )
                      );
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
                        ...getMissionTypeStyle(editingMission.typeLabel),
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 28,
                        padding: '0 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      {editingMission.typeLabel}
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
              const missionTypeStyle = getMissionTypeStyle(mission.typeLabel || getMissionTypeLabel(mission.type));
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
                        {mission.typeLabel || getMissionTypeLabel(mission.type)}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 14, lineHeight: 1.65 }}>
                      {mission.details || mission.description}
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
                        border:
                          editingMissionId === mission.id
                            ? '1px solid rgba(0,229,255,0.26)'
                            : buttonGhost.border,
                        background:
                          editingMissionId === mission.id
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
                          const next = prev
                            .filter((item) => item.id !== mission.id)
                            .map((item, idx) => ({ ...item, order: idx + 1 }));
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
