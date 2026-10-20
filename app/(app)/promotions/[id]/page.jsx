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
  SELECTABLE_MISSION_TYPE_GROUPS,
  DEFAULT_UNIT_BY_TYPE,
  FALLBACK_REWARD_TYPES,
  LEVEL_STATUS_OPTIONS,
  REWARD_VALUE_MIN,
  REWARD_VALUE_MAX,
  REWARD_TITLE_MAX,
  missionTypeName,
  missionTypeStyle,
  isKnownMissionType,
  isSelectableMissionType,
  missionValidationFields,
  missionValidationText,
  missionValidationWarning,
  unitOptions,
  formatTarget,
  rewardToForm,
  rewardFromForm,
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

function normalizeLevelForEditor(level) {
  if (!level) return null;
  return {
    ...level,
    reward:
      typeof level.reward === 'object' && level.reward !== null
        ? level.reward
        : { title: '', description: '', type: 'custom', value: {}, active: true },
    missions: Array.isArray(level.missions)
      ? [...level.missions]
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .map((mission, index) => ({
            ...mission,
            id: mission.id || mission._id || `mission-${index + 1}`,
            details: mission.description || '',
            // Texto mientras se edita: puede quedar vacío sin saltar a 1.
            target: String(Number.isFinite(Number(mission.target)) && Number(mission.target) > 0 ? mission.target : 1),
          }))
      : [],
  };
}

function serializeLevelForSave(level, form) {
  return {
    levelNumber: Number(level.levelNumber),
    order: Number(level.order || level.levelNumber),
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
      // La validación depende del tipo (ver missionValidationFields)
      ...missionValidationFields(mission),
      // El orden de la lista es el orden de las misiones
      order: idx + 1,
      active: typeof mission.active === 'boolean' ? mission.active : true,
      ...photoCriteriaFields(mission),
    })),
  };
}

// ---------------------------------------------------------------------------
// Estilos (estética del portal)
// ---------------------------------------------------------------------------
const pageStyle = {
  padding: '28px 24px 44px',
  color: '#e5e7eb',
  background: 'radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), var(--nv-bg)',
  minHeight: '100vh',
};

const shellStyle = {
  width: '100%',
  maxWidth: 1080,
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

const buttonDanger = {
  ...buttonGhost,
  color: '#fda4af',
  border: '1px solid rgba(244,63,94,0.18)',
  background: 'rgba(244,63,94,0.06)',
};

const iconButton = {
  ...buttonGhost,
  minHeight: 40,
  minWidth: 40,
  padding: 0,
  fontSize: 16,
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
  minHeight: 110,
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
  fontWeight: 400,
};

const errorBorder = '1px solid rgba(244,63,94,0.55)';

const errorTextStyle = { color: '#fda4af', fontSize: 13, fontWeight: 700, lineHeight: 1.5 };

// ---------------------------------------------------------------------------
// Tarjeta de misión: se despliega en su sitio para editarla.
// Fuera del componente de página para que los campos no pierdan el foco.
// ---------------------------------------------------------------------------
function MissionCard({ mission, index, total, expanded, error, onToggle, onChange, onMove, onRemove }) {
  const typeStyle = missionTypeStyle(mission.type);
  const title = (mission.title || '').trim();
  const photo = isPhotoMission(mission);
  const criteria = mission.photoCriteria || '';
  const exclude = mission.photoCriteriaExclude || '';
  const criteriaLen = criteria.trim().length;
  const criteriaBad = criteriaLen < PHOTO_CRITERIA_MIN || criteriaLen > PHOTO_CRITERIA_MAX;
  const validationText = missionValidationText(mission.type);
  const validationWarning = missionValidationWarning(mission.type);
  const bodyId = `mission-body-${mission.id}`;

  return (
    <article
      style={{
        ...panelStyle,
        padding: 0,
        overflow: 'hidden',
        border: error
          ? errorBorder
          : expanded
            ? '1px solid rgba(0,229,255,0.26)'
            : panelStyle.border,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 14,
          alignItems: 'center',
          padding: 16,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            minWidth: 0,
            padding: 0,
            border: 0,
            background: 'none',
            color: 'inherit',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
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
          </span>
          <span style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: title ? '#e5e7eb' : '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title || 'Misión sin título'}
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  ...typeStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 26,
                  padding: '0 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {missionTypeName(mission.type)}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: 13 }}>
                Objetivo: {formatTarget(mission.target, mission.unit)}
              </span>
            </span>
          </span>
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Subir misión"
            title="Subir misión"
            style={{ ...iconButton, opacity: index === 0 ? 0.4 : 1, cursor: index === 0 ? 'not-allowed' : 'pointer' }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Bajar misión"
            title="Bajar misión"
            style={{
              ...iconButton,
              opacity: index === total - 1 ? 0.4 : 1,
              cursor: index === total - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={bodyId}
            style={{
              ...buttonGhost,
              minHeight: 40,
              ...(expanded ? { border: '1px solid rgba(0,229,255,0.26)', background: 'rgba(0,229,255,0.08)', color: '#7dd3fc' } : {}),
            }}
          >
            {expanded ? 'Cerrar' : 'Editar'}
          </button>
        </div>
      </div>

      {error && !expanded && (
        <div role="alert" style={{ ...errorTextStyle, padding: '0 16px 14px' }}>
          {error}
        </div>
      )}

      {expanded && (
        <div
          id={bodyId}
          style={{
            display: 'grid',
            gap: 14,
            padding: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          {error && (
            <div role="alert" style={errorTextStyle}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
            <label style={smallLabelStyle}>
              Tipo de misión
              <select
                value={mission.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const prevDefaultUnit = DEFAULT_UNIT_BY_TYPE[mission.type];
                  const keepUnit = mission.unit && mission.unit !== prevDefaultUnit;
                  // isPhotoMission venía del GET para el tipo anterior: ya no vale.
                  onChange({
                    type,
                    isPhotoMission: undefined,
                    unit: keepUnit ? mission.unit : DEFAULT_UNIT_BY_TYPE[type] || mission.unit,
                  });
                }}
                style={inputStyle}
              >
                {!isKnownMissionType(mission.type) && (
                  <option value={mission.type}>Tipo desconocido ({mission.type})</option>
                )}
                {/* Misión antigua de un tipo que ya no se ofrece: se muestra, pero no se puede volver a elegir */}
                {isKnownMissionType(mission.type) && !isSelectableMissionType(mission.type) && (
                  <option value={mission.type}>{missionTypeName(mission.type)} (ya no disponible)</option>
                )}
                {SELECTABLE_MISSION_TYPE_GROUPS.map(({ group, types }) => (
                  <optgroup key={group} label={group}>
                    {types.map((t) => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label style={smallLabelStyle}>
              Título de la misión
              <input
                value={mission.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Ej.: Sube una foto con tu grupo"
                autoFocus={Boolean(mission.isNew)}
                style={{ ...inputStyle, ...(error && !title ? { border: errorBorder } : {}) }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 14 }}>
            <label style={smallLabelStyle}>
              Objetivo
              <input
                type="text"
                inputMode="numeric"
                value={mission.target ?? ''}
                onChange={(e) => onChange({ target: sanitizeTargetInput(e.target.value) })}
                placeholder="1"
                style={inputStyle}
              />
            </label>

            <label style={smallLabelStyle}>
              Unidad
              <select
                value={mission.unit || ''}
                onChange={(e) => onChange({ unit: e.target.value })}
                style={inputStyle}
              >
                {!mission.unit && <option value="">Sin unidad</option>}
                {unitOptions(mission.unit).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          {(validationText || validationWarning) && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: validationWarning ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.03)',
                border: validationWarning ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gap: 4,
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800 }}>Cómo se cumple</div>
              {validationText && <div style={{ color: '#e5e7eb', fontSize: 13.5, lineHeight: 1.5 }}>{validationText}</div>}
              {validationWarning && (
                <div style={{ color: '#fcd34d', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{validationWarning}</div>
              )}
            </div>
          )}

          <label style={smallLabelStyle}>
            Explicación para el cliente
            <textarea
              value={mission.details || ''}
              onChange={(e) => onChange({ details: e.target.value, description: e.target.value })}
              placeholder="Ej.: Haz una foto con al menos tres amigos dentro del local y súbela desde la app."
              style={textareaStyle}
            />
          </label>

          {photo && (
            <div
              style={{
                display: 'grid',
                gap: 14,
                padding: 14,
                borderRadius: 14,
                border: error && criteriaBad ? errorBorder : '1px solid rgba(0,229,255,0.14)',
                background: error && criteriaBad ? 'rgba(244,63,94,0.06)' : 'rgba(0,229,255,0.04)',
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
                  aria-invalid={Boolean(error && criteriaBad)}
                  onChange={(e) => onChange({ photoCriteria: e.target.value })}
                  style={{ ...textareaStyle, minHeight: 90, ...(error && criteriaBad ? { border: errorBorder } : {}) }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <span style={helperStyle}>
                    Descríbelo de forma que se pueda comprobar mirando la imagen. Sirve: &lsquo;al menos tres
                    personas juntas dentro del local&rsquo;. No sirve: &lsquo;una foto guapa de la noche&rsquo;.
                  </span>
                  <span style={{ ...helperStyle, whiteSpace: 'nowrap', color: criteriaBad ? '#fda4af' : '#94a3b8' }}>
                    {criteriaLen}/{PHOTO_CRITERIA_MAX}
                    {criteriaLen < PHOTO_CRITERIA_MIN ? ` · mín. ${PHOTO_CRITERIA_MIN}` : ''}
                  </span>
                </div>
              </label>

              <label style={smallLabelStyle}>
                <span>
                  Qué no vale <span style={helperStyle}>(opcional)</span>
                </span>
                <textarea
                  value={exclude}
                  maxLength={PHOTO_CRITERIA_EXCLUDE_MAX}
                  onChange={(e) => onChange({ photoCriteriaExclude: e.target.value })}
                  placeholder="Ej.: Capturas de pantalla o fotos sacadas de internet."
                  style={{ ...textareaStyle, minHeight: 64 }}
                />
                <div style={{ ...helperStyle, textAlign: 'right' }}>
                  {exclude.trim().length}/{PHOTO_CRITERIA_EXCLUDE_MAX}
                </div>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={onRemove} style={buttonDanger}>
              Eliminar misión
            </button>
            <button type="button" onClick={onToggle} style={buttonGhost}>
              Listo
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [clubId, setClubId] = useState('');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const [noticeError, setNoticeError] = useState(false);
  // 409: otra persona guardó este nivel a la vez
  const [conflict, setConflict] = useState(false);
  // { [missionId]: mensaje } — misiones que no se pueden guardar tal como están.
  const [missionErrors, setMissionErrors] = useState({});
  const [rewardError, setRewardError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [rewardTypes, setRewardTypes] = useState(FALLBACK_REWARD_TYPES);

  const level = useMemo(() => {
    if (!id) return null;
    const found = levels.find((item) => String(item.levelNumber) === String(id));
    return normalizeLevelForEditor(found || null);
  }, [levels, id]);

  const [title, setTitle] = useState('');
  const [rewardForm, setRewardForm] = useState({ type: 'custom', value: '1', title: '' });
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('paused');
  const [missions, setMissions] = useState([]);
  const [expandedMissionId, setExpandedMissionId] = useState('');
  // Foto del formulario tal como se cargó, para detectar cambios sin guardar.
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const comparableMissions = missions.map(({ isNew, ...rest }) => rest);
  const currentSnapshot = JSON.stringify({ title, rewardForm, description, status, missions: comparableMissions });
  const dirty = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;
  const confirmLeave = useUnsavedChangesGuard(dirty);

  async function goBack() {
    if (await confirmLeave()) router.push('/promotions');
  }

  async function loadConfig() {
    const resolvedClubId = extractClubId();
    setClubId(resolvedClubId);

    if (!resolvedClubId) {
      setNoticeError(true);
      setNotice('No se ha podido identificar tu local. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${resolvedClubId}/levels`);
      if (Array.isArray(data?.rewardTypes) && data.rewardTypes.length) setRewardTypes(data.rewardTypes);
      setLevels(Array.isArray(data?.levels) ? data.levels : []);
    } catch (e) {
      setNoticeError(true);
      setNotice(describePromotionsError(e, 'No se ha podido cargar el nivel. Inténtalo de nuevo.'));
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadAfterConflict() {
    setConflict(false);
    setNotice('');
    setNoticeError(false);
    await loadConfig();
  }

  useEffect(() => {
    if (!level) return;
    const nextTitle = level.title || '';
    const nextReward = rewardToForm(level.reward, rewardTypes);
    const nextDescription = level.description || '';
    const nextStatus = levelStatusValue(level.status);
    const nextMissions = level.missions || [];
    setTitle(nextTitle);
    setRewardForm(nextReward);
    setDescription(nextDescription);
    setStatus(nextStatus);
    setMissions(nextMissions);
    setExpandedMissionId('');
    setMissionErrors({});
    setRewardError('');
    setTitleError('');
    setInitialSnapshot(
      JSON.stringify({ title: nextTitle, rewardForm: nextReward, description: nextDescription, status: nextStatus, missions: nextMissions })
    );
  }, [level, rewardTypes]);

  function updateRewardForm(changes) {
    setRewardForm((prev) => ({ ...prev, ...changes }));
    setRewardError('');
  }

  function clearMissionError(missionId) {
    setMissionErrors((prev) => {
      if (!prev[missionId]) return prev;
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  }

  function updateMission(missionId, changes) {
    setMissions((prev) => prev.map((mission) => (mission.id === missionId ? { ...mission, ...changes } : mission)));
    clearMissionError(missionId);
  }

  function moveMission(missionId, delta) {
    setMissions((prev) => {
      const from = prev.findIndex((m) => m.id === missionId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next.map((m, idx) => ({ ...m, order: idx + 1 }));
    });
  }

  function addMission() {
    const nextId = `mission-${Date.now()}`;
    const type = 'attend_event';
    setMissions((prev) => [
      ...prev,
      {
        id: nextId,
        isNew: true,
        type,
        title: '',
        details: '',
        description: '',
        target: '1',
        unit: DEFAULT_UNIT_BY_TYPE[type],
        params: {},
        order: prev.length + 1,
        active: true,
        photoCriteria: '',
        photoCriteriaExclude: '',
      },
    ]);
    setExpandedMissionId(nextId);
  }

  async function removeMission(mission) {
    const ok = await confirmDialog({
      title: '¿Eliminar esta misión?',
      message: `Se quitará «${(mission.title || '').trim() || 'Misión sin título'}» de este nivel cuando guardes los cambios.`,
      confirmText: 'Eliminar misión',
      danger: true,
    });
    if (!ok) return;
    setMissions((prev) =>
      prev.filter((item) => item.id !== mission.id).map((item, idx) => ({ ...item, order: idx + 1 }))
    );
    if (expandedMissionId === mission.id) setExpandedMissionId('');
    clearMissionError(mission.id);
  }

  // Errores del servidor que señalan una misión concreta de este nivel.
  function missionErrorsFromServer(err) {
    const out = {};
    const criteria = parsePhotoCriteriaError(err);
    if (criteria) {
      const target = missions.find(
        (m) => (!criteria.type || m.type === criteria.type) && (m.title || '').trim() === criteria.title.trim()
      );
      if (target) out[target.id] = criteria.message;
    }
    const problems = Array.isArray(err?.data?.problems) ? err.data.problems : [];
    for (const p of problems) {
      const match = String(p?.path || '').match(/^missions\.(\d+)\./);
      const mission = match ? missions[Number(match[1])] : null;
      if (mission && !out[mission.id]) out[mission.id] = 'Revisa los datos de esta misión.';
    }
    return out;
  }

  async function handleSave() {
    if (!clubId || !level || saving) return;

    // Validación previa: nada vacío ni fuera de rango llega al servidor.
    const nextTitleError = title.trim() ? '' : 'Escribe el nombre del nivel.';
    const clientErrors = {};
    missions.forEach((mission) => {
      const problem = validateMission(mission);
      if (problem) clientErrors[mission.id] = problem;
    });
    const failingIds = Object.keys(clientErrors);
    const rewardProblem = validateRewardForm(rewardForm);
    setTitleError(nextTitleError);
    setRewardError(rewardProblem);
    setMissionErrors(clientErrors);
    if (nextTitleError || rewardProblem || failingIds.length) {
      if (failingIds.length) setExpandedMissionId(failingIds[0]);
      setSaved(false);
      setNoticeError(true);
      const parts = [];
      if (nextTitleError) parts.push('el nombre');
      if (rewardProblem) parts.push('el premio');
      if (failingIds.length === 1) parts.push('una misión');
      if (failingIds.length > 1) parts.push(`${failingIds.length} misiones`);
      setNotice(`No se ha guardado nada: revisa ${parts.join(', ')} (marcado en rojo).`);
      return;
    }

    const sent = serializeLevelForSave(level, { title, rewardForm, description, status, missions });

    try {
      setSaving(true);
      setConflict(false);
      setNoticeError(false);
      setNotice('Guardando…');

      // Solo este nivel: un problema en otro nivel no impide guardarlo.
      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels/${level.levelNumber}`, {
        method: 'PUT',
        body: JSON.stringify({ level: sent }),
      });

      const [savedLevel] = assertLevelsSaved(
        { ok: data?.ok, levels: data?.level ? [data.level] : null },
        [sent]
      );
      if (Array.isArray(data?.rewardTypes) && data.rewardTypes.length) setRewardTypes(data.rewardTypes);
      const savedNumber = savedLevel?.levelNumber ?? level.levelNumber;
      setLevels((prev) =>
        prev.map((item) => (String(item.levelNumber) === String(savedNumber) ? savedLevel || item : item))
      );
      setNoticeError(false);
      setSaved(true);
      setNotice('Cambios guardados.');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaved(false);
      setNoticeError(true);
      if (e?.status === 409) {
        setConflict(true);
        setNotice(
          'Alguien de tu equipo ha guardado este nivel mientras lo editabas. Recarga para ver la versión más reciente (perderás los cambios que no has guardado).'
        );
        return;
      }
      const fromServer = missionErrorsFromServer(e);
      const ids = Object.keys(fromServer);
      if (ids.length) {
        setMissionErrors(fromServer);
        setExpandedMissionId(ids[0]);
      }
      const code = e?.data?.error || '';
      if (String(e?.data?.field || '').startsWith('reward.') || /reward/.test(code)) {
        setRewardError(describePromotionsError(e));
      }
      if (code === 'level_title_required') setTitleError('Escribe el nombre del nivel.');
      setNotice(`No se han guardado los cambios. ${describePromotionsError(e)}`);
    } finally {
      setSaving(false);
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
            {notice && (
              <section style={{ ...panelStyle, border: '1px solid rgba(244,63,94,0.32)', background: 'rgba(244,63,94,0.08)', color: '#ffe4e6' }}>
                {notice}
              </section>
            )}
            <section style={panelStyle}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Nivel no encontrado</div>
              <div style={{ ...mutedStyle, maxWidth: 680 }}>Este nivel no existe o se ha eliminado.</div>
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
  const autoTitle = autoRewardTitle(rewardForm.type, Number(rewardForm.value));

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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12, color: '#cbd5e1', fontSize: 15 }}>
                <span>Nivel {level.levelNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{missions.length === 1 ? '1 misión' : `${missions.length} misiones`}</span>
                <span aria-hidden="true">·</span>
                <span
                  style={{
                    ...statusStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 28,
                    padding: '0 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {levelStatusLabel(status)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={goBack} style={buttonGhost}>
                Volver
              </button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...buttonPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </section>

          {notice && (
            <section
              role="status"
              aria-live="polite"
              style={{
                ...panelStyle,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                border: saved
                  ? '1px solid rgba(34,197,94,0.26)'
                  : noticeError
                    ? '1px solid rgba(244,63,94,0.32)'
                    : '1px solid rgba(0,229,255,0.14)',
                background: saved ? 'rgba(34,197,94,0.08)' : noticeError ? 'rgba(244,63,94,0.08)' : 'rgba(0,229,255,0.05)',
                color: saved ? '#dcfce7' : noticeError ? '#ffe4e6' : '#dff9ff',
              }}
            >
              <span style={{ flex: '1 1 320px' }}>{notice}</span>
              {conflict && (
                <button type="button" onClick={reloadAfterConflict} style={buttonGhost}>
                  Recargar el nivel
                </button>
              )}
            </section>
          )}

          <section style={panelStyle}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 16 }}>Datos del nivel</div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: 18,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 14 }}>
                <label style={labelStyle}>
                  Nombre del nivel
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError('');
                    }}
                    placeholder="Ej.: Nivel 1 — Primera noche"
                    style={{ ...inputStyle, ...(titleError ? { border: errorBorder } : {}) }}
                  />
                  {titleError && <span style={errorTextStyle}>{titleError}</span>}
                </label>

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
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej.: Tu primera noche en el local: ven, escanea el QR y llévate un chupito."
                    style={textareaStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: rewardError ? errorBorder : '1px solid rgba(255,255,255,0.08)',
                  background: rewardError ? 'rgba(244,63,94,0.06)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 700 }}>Premio al completar el nivel</div>
                {rewardError && (
                  <div role="alert" style={errorTextStyle}>
                    {rewardError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <label style={smallLabelStyle}>
                    Tipo de premio
                    <select value={rewardForm.type} onChange={(e) => updateRewardForm({ type: e.target.value })} style={inputStyle}>
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
                      <span id="reward-value-help" style={helperStyle}>
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
                    placeholder={rewardForm.type === 'custom' ? 'Ej.: Camiseta del local' : autoTitle}
                    style={inputStyle}
                  />
                  {rewardForm.type !== 'custom' && (
                    <span style={helperStyle}>Si lo dejas vacío se mostrará «{autoTitle}».</span>
                  )}
                </label>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '0 4px',
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Misiones del nivel</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                  El cliente consigue el premio cuando completa todas. Pulsa una misión para editarla.
                </div>
              </div>
              <button type="button" onClick={addMission} style={buttonGhost}>
                + Añadir misión
              </button>
            </div>

            {missions.length === 0 ? (
              <div style={{ ...panelStyle, color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                Este nivel no tiene misiones: el cliente lo completará en cuanto llegue a él. Añade una con «+ Añadir misión».
              </div>
            ) : (
              missions.map((mission, index) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  index={index}
                  total={missions.length}
                  expanded={expandedMissionId === mission.id}
                  error={missionErrors[mission.id]}
                  onToggle={() => setExpandedMissionId((cur) => (cur === mission.id ? '' : mission.id))}
                  onChange={(changes) => updateMission(mission.id, changes)}
                  onMove={(delta) => moveMission(mission.id, delta)}
                  onRemove={() => removeMission(mission)}
                />
              ))
            )}
          </section>

          {dirty && (
            <div
              role="region"
              aria-label="Cambios sin guardar"
              style={{
                position: 'sticky',
                bottom: 16,
                zIndex: 20,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                padding: '12px 16px',
                borderRadius: 18,
                border: '1px solid rgba(0,229,255,0.26)',
                background: 'rgba(15,22,41,0.96)',
                boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ color: '#dff9ff', fontWeight: 700 }}>Tienes cambios sin guardar</span>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...buttonPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      </main>
    </RequireClub>
  );
}
