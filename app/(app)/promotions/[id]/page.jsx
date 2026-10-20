'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';
import {
  PHOTO_CRITERIA_MIN,
  PHOTO_CRITERIA_MAX,
  PHOTO_CRITERIA_EXCLUDE_MAX,
  isPhotoMission,
  photoCriteriaFields,
  parsePhotoCriteriaError,
  assertLevelsSaved,
} from '@/lib/photoCriteria';
import {
  MISSION_TYPE_GROUPS,
  DEFAULT_UNIT_BY_TYPE,
  FALLBACK_REWARD_TYPES,
  LEVEL_STATUS_OPTIONS,
  REWARD_VALUE_MIN,
  REWARD_VALUE_MAX,
  REWARD_TITLE_MAX,
  missionTypeName,
  missionTypeStyle,
  isKnownMissionType,
  unitOptions,
  formatTarget,
  rewardToForm,
  rewardFromForm,
  rewardDisplayTitle,
  autoRewardTitle,
  validateRewardForm,
  levelStatusValue,
  levelStatusLabel,
  missionIdentityFields,
  sanitizeTargetInput,
  validateMission,
  describePromotionsError,
} from '@/lib/promotionsCatalog';
import useUnsavedChangesGuard from '@/lib/useUnsavedChangesGuard';
import { confirmDialog } from '@/components/Toast';
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

  // 'draft' y 'paused' son lo mismo en el backend (active: false)
  return {
    background: 'rgba(250,204,21,0.10)',
    border: '1px solid rgba(250,204,21,0.20)',
    color: '#fde68a',
  };
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
          validation: getValidationLabel(mission),
          details: mission.description || '',
          // Texto mientras se edita: puede quedar vacío sin saltar a 1.
          target: String(Number.isFinite(Number(mission.target)) && Number(mission.target) > 0 ? mission.target : 1),
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
    reward: rewardFromForm(form.rewardForm, level.reward),
    status: form.status,
    active: form.status === 'active',
    visibleInApp: typeof level.visibleInApp === 'boolean' ? level.visibleInApp : true,
    version: Number(level.version || 1),
    missions: (form.missions || []).map((mission, idx) => ({
      // _id y missionKey: el progreso de los clientes y sus fotos dependen de ellos.
      // Las misiones creadas en el editor llevan un id local ("mission-…"), que no se envía.
      ...missionIdentityFields(mission),
      type: mission.type,
      title: (mission.title || '').trim(),
      description: (mission.details || '').trim(),
      target: Number(mission.target),
      unit: String(mission.unit || '').trim(),
      params: mission.params && typeof mission.params === 'object' ? mission.params : {},
      validationType: mission.validationType || getValidationTypeFromLabel(mission.validation),
      requiresApproval: (mission.validationType || getValidationTypeFromLabel(mission.validation)) === 'manual',
      order: Number.isFinite(Number(mission.order)) ? Number(mission.order) : idx + 1,
      active: typeof mission.active === 'boolean' ? mission.active : true,
      ...photoCriteriaFields(mission),
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
  const [noticeError, setNoticeError] = useState(false);
  // { [missionId]: mensaje } — misiones que no se pueden guardar tal como están.
  const [missionErrors, setMissionErrors] = useState({});
  const [rewardError, setRewardError] = useState('');
  const [rewardTypes, setRewardTypes] = useState(FALLBACK_REWARD_TYPES);

  const level = useMemo(() => {
    if (!id) return null;
    const found = levels.find((item) => String(item.levelNumber) === String(id));
    return normalizeLevelForEditor(found || null);
  }, [levels, id]);

  const [levelNumber, setLevelNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [rewardForm, setRewardForm] = useState({ type: 'custom', value: '1', title: '' });
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('paused');
  const [missions, setMissions] = useState([]);
  const [editingMissionId, setEditingMissionId] = useState('');
  // Foto del formulario tal como se cargó, para detectar cambios sin guardar.
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const currentSnapshot = JSON.stringify({ title, rewardForm, description, status, missions });
  const dirty = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;
  const confirmLeave = useUnsavedChangesGuard(dirty);

  async function goBack() {
    if (await confirmLeave()) router.push('/promotions');
  }

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const resolvedClubId = extractClubId();
      setClubId(resolvedClubId);

      if (!resolvedClubId) {
        if (!cancelled) {
          setNotice('No se ha podido identificar tu local. Vuelve a iniciar sesión.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const data = await apiJson(`${API_BASE}/api/promotions/clubs/${resolvedClubId}/levels`);
        if (!cancelled) {
          if (Array.isArray(data?.rewardTypes) && data.rewardTypes.length) setRewardTypes(data.rewardTypes);
          setLevels(Array.isArray(data?.levels) ? data.levels : []);
        }
      } catch (e) {
        if (!cancelled) {
          setNoticeError(true);
          setNotice(describePromotionsError(e, 'No se ha podido cargar el nivel. Inténtalo de nuevo.'));
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
    const nextTitle = level.title || '';
    const nextReward = rewardToForm(level.reward, rewardTypes);
    const nextDescription = level.description || '';
    const nextStatus = levelStatusValue(level.status);
    const nextMissions = level.missions || [];
    setLevelNumber(level.levelNumber || 1);
    setTitle(nextTitle);
    setRewardForm(nextReward);
    setDescription(nextDescription);
    setStatus(nextStatus);
    setMissions(nextMissions);
    setEditingMissionId(nextMissions[0]?.id || '');
    setMissionErrors({});
    setRewardError('');
    setInitialSnapshot(
      JSON.stringify({ title: nextTitle, rewardForm: nextReward, description: nextDescription, status: nextStatus, missions: nextMissions })
    );
  }, [level, rewardTypes]);

  function updateRewardForm(changes) {
    setRewardForm((prev) => ({ ...prev, ...changes }));
    setRewardError('');
  }

  async function removeMission(mission) {
    const ok = await confirmDialog({
      title: '¿Eliminar esta misión?',
      message: `Se quitará «${(mission.title || '').trim() || 'Misión sin título'}» de este nivel cuando guardes los cambios.`,
      confirmText: 'Eliminar misión',
      danger: true,
    });
    if (!ok) return;
    setMissions((prev) => {
      const next = prev
        .filter((item) => item.id !== mission.id)
        .map((item, idx) => ({ ...item, order: idx + 1 }));
      if (editingMissionId === mission.id) setEditingMissionId(next[0]?.id || '');
      return next;
    });
    setMissionErrors((prev) => {
      if (!prev[mission.id]) return prev;
      const next = { ...prev };
      delete next[mission.id];
      return next;
    });
  }

  function updateMission(missionId, changes) {
    setMissions((prev) => prev.map((mission) => (mission.id === missionId ? { ...mission, ...changes } : mission)));
  }

  function updateMissionCriteria(missionId, changes) {
    updateMission(missionId, changes);
    setMissionErrors((prev) => {
      if (!prev[missionId]) return prev;
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  }

  const pageStyle = {
    padding: '28px 24px 44px',
    color: '#e5e7eb',
    background: 'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), var(--nv-bg)',
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

  const panelStyle = {
    background: 'var(--nv-surface)',
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

    // Validación previa: nada vacío ni fuera de rango llega al servidor.
    const clientErrors = {};
    missions.forEach((mission) => {
      const problem = validateMission(mission);
      if (problem) clientErrors[mission.id] = problem;
    });
    const failingIds = Object.keys(clientErrors);
    const rewardProblem = validateRewardForm(rewardForm);
    setRewardError(rewardProblem);
    setMissionErrors(clientErrors);
    if (rewardProblem || failingIds.length) {
      if (failingIds.length) setEditingMissionId(failingIds[0]);
      setSaved(false);
      setNoticeError(true);
      const parts = [];
      if (rewardProblem) parts.push('el premio');
      if (failingIds.length === 1) parts.push('una misión');
      if (failingIds.length > 1) parts.push(`${failingIds.length} misiones`);
      setNotice(`No se ha guardado nada: revisa ${parts.join(' y ')} (marcado en rojo).`);
      return;
    }

    try {
      setNoticeError(false);
      setNotice('Guardando cambios del nivel...');
      const nextLevels = levels.map((item) => {
        if (String(item.levelNumber) !== String(id)) return item;
        return serializeLevelForSave(item, {
          levelNumber,
          title,
          rewardForm,
          description,
          status,
          missions,
        });
      });

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels: nextLevels }),
      });

      const savedLevels = assertLevelsSaved(data, nextLevels);
      if (Array.isArray(data?.rewardTypes) && data.rewardTypes.length) setRewardTypes(data.rewardTypes);
      setLevels(savedLevels);
      setNoticeError(false);
      setSaved(true);
      setNotice('Cambios guardados.');
      router.replace(`/promotions/${levelNumber}`);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setNoticeError(true);
      const criteriaError = parsePhotoCriteriaError(e);
      if (!criteriaError) {
        setNotice(`No se han guardado los cambios. ${describePromotionsError(e)}`);
        return;
      }
      const isThisLevel = String(criteriaError.levelNumber) === String(level.levelNumber);
      const target = isThisLevel
        ? missions.find(
            (mission) =>
              (!criteriaError.type || mission.type === criteriaError.type) &&
              (mission.title || '').trim() === criteriaError.title.trim()
          )
        : null;
      if (target) {
        setMissionErrors({ [target.id]: criteriaError.message });
        setEditingMissionId(target.id);
        setNotice(`No se han guardado los cambios. ${criteriaError.message}`);
      } else {
        setNotice(
          `No se han guardado los cambios. ${criteriaError.message}` +
            (isThisLevel ? '' : ' Corrígelo desde la edición de ese nivel y vuelve a guardar este.')
        );
      }
    }
  }

  if (loading) {
    return (
      <RequireClub>
        <main style={pageStyle}>
          <div style={shellStyle}>
            <section style={{ ...panelStyle, display: 'grid', gap: 12 }}>
              <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '40%' }} />
              <div className="nv-skeleton" style={{ height: 56, borderRadius: 14 }} />
              <div className="nv-skeleton" style={{ height: 120, borderRadius: 14 }} />
            </section>
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
                Este nivel no existe o se ha eliminado.
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
                Edita el premio, el estado del nivel y las misiones que lo componen. Los cambios se aplican al pulsar «Guardar cambios».
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={goBack} style={buttonGhost}>
                Volver
              </button>
              <button type="button" onClick={handleSave} style={buttonPrimary}>
                {dirty ? 'Guardar cambios •' : 'Guardar cambios'}
              </button>
            </div>
          </section>

          {notice && (
            <section
              style={{
                ...panelStyle,
                border: saved
                  ? '1px solid rgba(34,197,94,0.26)'
                  : noticeError
                    ? '1px solid rgba(244,63,94,0.32)'
                    : '1px solid rgba(0,229,255,0.14)',
                background: saved ? 'rgba(34,197,94,0.08)' : noticeError ? 'rgba(244,63,94,0.08)' : 'rgba(0,229,255,0.05)',
                color: saved ? '#dcfce7' : noticeError ? '#ffe4e6' : '#dff9ff',
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
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Número de nivel</div>
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
                {levelStatusLabel(status)}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 10 }}>Visibilidad actual del nivel</div>
            </article>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
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

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    border: rewardError ? '1px solid rgba(244,63,94,0.55)' : '1px solid rgba(255,255,255,0.08)',
                    background: rewardError ? 'rgba(244,63,94,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 700 }}>Premio al completar el nivel</div>
                  {rewardError && (
                    <div role="alert" style={{ color: '#fda4af', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                      {rewardError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <label style={smallLabelStyle}>
                      Tipo de premio
                      <select
                        value={rewardForm.type}
                        onChange={(e) => updateRewardForm({ type: e.target.value })}
                        style={inputStyle}
                      >
                        {rewardTypes.map((r) => (
                          <option key={r.type} value={r.type}>{r.label}</option>
                        ))}
                      </select>
                    </label>
                    {rewardForm.type !== 'custom' && (
                      <label style={smallLabelStyle}>
                        Cantidad
                        <input
                          type="text"
                          inputMode="numeric"
                          value={rewardForm.value}
                          onChange={(e) => updateRewardForm({ value: sanitizeTargetInput(e.target.value).slice(0, 3) })}
                          aria-describedby="reward-value-help"
                          style={inputStyle}
                        />
                        <span id="reward-value-help" style={{ ...helperStyle, fontWeight: 400 }}>
                          De {REWARD_VALUE_MIN} a {REWARD_VALUE_MAX}
                        </span>
                      </label>
                    )}
                  </div>
                  <label style={smallLabelStyle}>
                    {rewardForm.type === 'custom' ? 'Nombre del premio (obligatorio)' : 'Nombre del premio (opcional)'}
                    <input
                      value={rewardForm.title}
                      maxLength={REWARD_TITLE_MAX}
                      onChange={(e) => updateRewardForm({ title: e.target.value })}
                      placeholder={
                        rewardForm.type === 'custom'
                          ? 'Ej.: Camiseta del local'
                          : autoRewardTitle(rewardForm.type, Number(rewardForm.value))
                      }
                      style={inputStyle}
                    />
                    {rewardForm.type !== 'custom' && (
                      <span style={{ ...helperStyle, fontWeight: 400 }}>
                        Si lo dejas vacío se mostrará «{autoRewardTitle(rewardForm.type, Number(rewardForm.value))}».
                      </span>
                    )}
                  </label>
                </div>

                <label style={labelStyle}>
                  Estado del nivel
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                    {LEVEL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
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
                  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>Premio</div>
                  <div style={{ color: '#e5e7eb', fontSize: 15, fontWeight: 800 }}>{rewardDisplayTitle(rewardForm) || 'Pendiente de definir'}</div>
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
                    {levelStatusLabel(status)}
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
                    validationType: 'automatic',
                    validation: 'Automática',
                    details: 'Define aquí la condición concreta de esta misión.',
                    description: 'Define aquí la condición concreta de esta misión.',
                    target: '1',
                    unit: DEFAULT_UNIT_BY_TYPE.stamps_competition,
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <article style={{ display: 'grid', gap: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Editor de misión</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  Los cambios de la misión se guardan junto con el nivel, al pulsar «Guardar cambios».
                </div>

                {missionErrors[editingMission.id] && (
                  <div role="alert" style={{ color: '#fda4af', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                    {missionErrors[editingMission.id]}
                  </div>
                )}

                <label style={smallLabelStyle}>
                  Título de la misión
                  <input
                    value={editingMission.title}
                    onChange={(e) => updateMissionCriteria(editingMission.id, { title: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={smallLabelStyle}>
                    Tipo de misión
                    <select
                      value={editingMission.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        const prevDefaultUnit = DEFAULT_UNIT_BY_TYPE[editingMission.type];
                        const keepUnit = editingMission.unit && editingMission.unit !== prevDefaultUnit;
                        // isPhotoMission venía del GET para el tipo anterior: ya no vale.
                        updateMissionCriteria(editingMission.id, {
                          type,
                          isPhotoMission: undefined,
                          unit: keepUnit ? editingMission.unit : DEFAULT_UNIT_BY_TYPE[type] || editingMission.unit,
                        });
                      }}
                      style={inputStyle}
                    >
                      {!isKnownMissionType(editingMission.type) && (
                        <option value={editingMission.type}>Tipo desconocido ({editingMission.type})</option>
                      )}
                      {MISSION_TYPE_GROUPS.map(({ group, types }) => (
                        <optgroup key={group} label={group}>
                          {types.map((t) => (
                            <option key={t.type} value={t.type}>{t.label}</option>
                          ))}
                        </optgroup>
                      ))}
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
                      type="text"
                      inputMode="numeric"
                      value={editingMission.target ?? ''}
                      onChange={(e) => updateMissionCriteria(editingMission.id, { target: sanitizeTargetInput(e.target.value) })}
                      style={inputStyle}
                    />
                  </label>

                  <label style={smallLabelStyle}>
                    Unidad
                    <select
                      value={editingMission.unit || ''}
                      onChange={(e) => updateMission(editingMission.id, { unit: e.target.value })}
                      style={inputStyle}
                    >
                      {!editingMission.unit && <option value="">Sin unidad</option>}
                      {unitOptions(editingMission.unit).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
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

                {isPhotoMission(editingMission) && (() => {
                  const criteria = editingMission.photoCriteria || '';
                  const exclude = editingMission.photoCriteriaExclude || '';
                  const criteriaLen = criteria.trim().length;
                  const criteriaBad = criteriaLen < PHOTO_CRITERIA_MIN || criteriaLen > PHOTO_CRITERIA_MAX;
                  const missionError = missionErrors[editingMission.id];
                  const errorBorder = '1px solid rgba(244,63,94,0.55)';
                  return (
                    <div
                      style={{
                        display: 'grid',
                        gap: 14,
                        padding: 14,
                        borderRadius: 14,
                        border: missionError ? errorBorder : '1px solid rgba(0,229,255,0.14)',
                        background: missionError ? 'rgba(244,63,94,0.06)' : 'rgba(0,229,255,0.04)',
                      }}
                    >
                      <label style={smallLabelStyle}>
                        <span>
                          Qué debe verse en la foto <span style={{ color: '#fda4af' }}>*</span>
                        </span>
                        <textarea
                          value={criteria}
                          maxLength={PHOTO_CRITERIA_MAX}
                          required
                          aria-invalid={!!missionError}
                          onChange={(e) => updateMissionCriteria(editingMission.id, { photoCriteria: e.target.value })}
                          style={{ ...textareaStyle, minHeight: 96, ...(missionError ? { border: errorBorder } : {}) }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ ...helperStyle, fontWeight: 400 }}>
                            Descríbelo de forma que se pueda comprobar mirando la imagen. Sirve: &lsquo;al menos tres
                            personas juntas dentro del local&rsquo;. No sirve: &lsquo;una foto guapa de la noche&rsquo;.
                          </span>
                          <span
                            style={{
                              ...helperStyle,
                              whiteSpace: 'nowrap',
                              color: criteriaBad ? '#fda4af' : '#94a3b8',
                            }}
                          >
                            {criteriaLen}/{PHOTO_CRITERIA_MAX}
                            {criteriaLen < PHOTO_CRITERIA_MIN ? ` · mín. ${PHOTO_CRITERIA_MIN}` : ''}
                          </span>
                        </div>
                      </label>

                      <label style={smallLabelStyle}>
                        Qué no vale <span style={{ ...helperStyle, fontWeight: 400 }}>(opcional)</span>
                        <textarea
                          value={exclude}
                          maxLength={PHOTO_CRITERIA_EXCLUDE_MAX}
                          onChange={(e) => updateMissionCriteria(editingMission.id, { photoCriteriaExclude: e.target.value })}
                          style={{ ...textareaStyle, minHeight: 72 }}
                        />
                        <div style={{ ...helperStyle, textAlign: 'right' }}>
                          {exclude.trim().length}/{PHOTO_CRITERIA_EXCLUDE_MAX}
                        </div>
                      </label>
                    </div>
                  );
                })()}
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
                        ...missionTypeStyle(editingMission.type),
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 28,
                        padding: '0 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      {missionTypeName(editingMission.type)}
                    </span>
                  </div>
                  <div style={helperStyle}>{editingMission.details || 'Añade una explicación para esta misión.'}</div>
                  <div style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 700 }}>
                    Objetivo: {formatTarget(editingMission.target, editingMission.unit)}
                  </div>
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
              const typeStyle = missionTypeStyle(mission.type);
              const missionError = missionErrors[mission.id];
              return (
                <article
                  key={mission.id}
                  style={{
                    ...panelStyle,
                    ...(missionError ? { border: '1px solid rgba(244,63,94,0.55)' } : {}),
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

                    <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 14, lineHeight: 1.65 }}>
                      {mission.details || mission.description}
                    </div>

                    {missionError && (
                      <div style={{ marginTop: 10, color: '#fda4af', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                        {missionError}
                      </div>
                    )}

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
                      onClick={() => removeMission(mission)}
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
