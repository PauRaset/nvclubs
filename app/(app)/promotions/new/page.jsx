

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireClub from '@/components/RequireClub';
import { getUser } from '@/lib/apiClient';
import { photoCriteriaFields, assertLevelsSaved } from '@/lib/photoCriteria';
import {
  FALLBACK_REWARD_TYPES,
  LEVEL_STATUS_OPTIONS,
  REWARD_VALUE_MIN,
  REWARD_VALUE_MAX,
  REWARD_TITLE_MAX,
  missionTypeName,
  unitOptions,
  rewardFromForm,
  rewardDisplayTitle,
  autoRewardTitle,
  validateRewardForm,
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

function buildMissionFromTemplate(typeLabel, index = 1) {
  const map = {
    Asistencia: {
      type: 'attend_event',
      title: 'Asistir a eventos',
      details: 'El usuario deberá asistir al número de eventos indicado.',
      validationType: 'automatic',
      validation: 'Automática',
      unit: 'events',
      target: 1,
    },
    Contenido: {
      type: 'upload_event_photo',
      title: 'Subir contenido',
      details: 'El usuario deberá subir contenido válido relacionado con el evento.',
      validationType: 'manual',
      validation: 'Manual por el club',
      unit: 'photos',
      target: 1,
      // Mismo texto que DEFAULT_PHOTO_CRITERIA del backend (utils/photoMissions.js).
      photoCriteria: 'Una foto tomada dentro del local durante el evento, donde se vea el ambiente de la noche.',
    },
    Difusión: {
      type: 'share_event',
      title: 'Difundir el evento',
      details: 'El usuario deberá compartir el evento y generar interacción con su enlace.',
      validationType: 'link_tracking',
      validation: 'Tracking de enlace',
      unit: 'clicks',
      target: 5,
    },
    QR: {
      type: 'scan_qr',
      title: 'Escanear QR',
      details: 'El usuario deberá escanear el QR del local o del evento.',
      validationType: 'automatic',
      validation: 'Automática',
      unit: 'scans',
      target: 1,
    },
    'Misión especial': {
      type: 'stamps_competition',
      title: 'Completar misión especial',
      details: 'Define una misión especial personalizada para este nivel.',
      validationType: 'hybrid',
      validation: 'Híbrida',
      unit: 'photos',
      target: 1,
      // Competición de sellos es misión de foto: el backend exige criterio.
      photoCriteria: 'Una foto de la cara de la persona donde se vean claramente los sellos conseguidos durante el evento.',
    },
  };

  const base = map[typeLabel] || map['Misión especial'];
  return {
    id: `mission-${Date.now()}-${index}`,
    type: base.type,
    typeLabel,
    title: base.title,
    details: base.details,
    description: base.details,
    validationType: base.validationType,
    validation: base.validation,
    unit: base.unit,
    target: String(base.target),
    params: {},
    order: index,
    active: true,
    photoCriteria: base.photoCriteria || '',
    photoCriteriaExclude: base.photoCriteriaExclude || '',
  };
}

export default function NewPromotionPage() {
  const router = useRouter();

  const [title, setTitle] = useState('Nuevo nivel');
  const [rewardForm, setRewardForm] = useState({ type: 'shot', value: '1', title: '' });
  const [rewardTypes, setRewardTypes] = useState(FALLBACK_REWARD_TYPES);
  const [rewardError, setRewardError] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [status, setStatus] = useState('paused');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [missions, setMissions] = useState(() => [
    buildMissionFromTemplate('Asistencia', 1),
    buildMissionFromTemplate('Contenido', 2),
  ]);
  const [editingMissionId, setEditingMissionId] = useState(missions[0]?.id || '');
  const [missionErrors, setMissionErrors] = useState({});

  // Cambios sin guardar: cualquier diferencia con el formulario inicial.
  const snapshot = JSON.stringify({ title, rewardForm, description, difficulty, status, missions });
  const [initialSnapshot] = useState(snapshot);
  const [created, setCreated] = useState(false);
  const confirmLeave = useUnsavedChangesGuard(!created && snapshot !== initialSnapshot);

  // Tipos de premio del backend (si falla, se usa la lista local).
  useEffect(() => {
    const clubId = extractClubId();
    if (!clubId) return;
    let cancelled = false;
    apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.rewardTypes) && data.rewardTypes.length) setRewardTypes(data.rewardTypes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function updateMission(missionId, changes) {
    setMissions((prev) => prev.map((mission) => (mission.id === missionId ? { ...mission, ...changes } : mission)));
    setMissionErrors((prev) => {
      if (!prev[missionId]) return prev;
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  }

  function updateRewardForm(changes) {
    setRewardForm((prev) => ({ ...prev, ...changes }));
    setRewardError('');
  }

  async function goBack() {
    if (await confirmLeave()) router.push('/promotions');
  }

  async function removeMission(mission) {
    const ok = await confirmDialog({
      title: '¿Eliminar esta misión?',
      message: `Se quitará «${(mission.title || '').trim() || 'Misión sin título'}» del nivel.`,
      confirmText: 'Eliminar misión',
      danger: true,
    });
    if (!ok) return;
    const remaining = missions
      .filter((item) => item.id !== mission.id)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    setMissions(remaining);
    if (editingMissionId === mission.id) setEditingMissionId(remaining[0]?.id || '');
  }

  const editingMission = missions.find((mission) => mission.id === editingMissionId) || missions[0] || null;

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

  const helperStyle = {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 1.55,
  };

  async function handleCreate() {
    const clubId = extractClubId();
    if (!clubId) {
      setNotice('No se ha podido identificar tu local. Vuelve a iniciar sesión.');
      return;
    }

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
      const parts = [];
      if (rewardProblem) parts.push('el premio');
      if (failingIds.length === 1) parts.push('una misión');
      if (failingIds.length > 1) parts.push(`${failingIds.length} misiones`);
      setNotice(`No se ha creado el nivel: revisa ${parts.join(' y ')} (marcado en rojo).`);
      return;
    }

    try {
      setSaving(true);
      setNotice('Creando nivel...');

      const data = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`);
      const currentLevels = Array.isArray(data?.levels) ? data.levels : [];

      const usedNumbers = currentLevels
        .map((level) => Number(level.levelNumber || 0))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      let nextLevelNumber = 1;
      while (usedNumbers.includes(nextLevelNumber)) nextLevelNumber += 1;

      const nextLevel = {
        levelNumber: nextLevelNumber,
        order: currentLevels.length + 1,
        title: title.trim() || `Nivel ${nextLevelNumber}`,
        description: description.trim(),
        difficulty,
        reward: rewardFromForm(rewardForm, { description: '', active: true }),
        status,
        active: status === 'active',
        visibleInApp: true,
        version: 1,
        missions: missions.map((mission, idx) => ({
          type: mission.type,
          title: (mission.title || '').trim(),
          description: (mission.details || '').trim(),
          target: Number(mission.target),
          unit: String(mission.unit || '').trim(),
          params: mission.params && typeof mission.params === 'object' ? mission.params : {},
          validationType: mission.validationType || 'automatic',
          requiresApproval: mission.validationType === 'manual',
          order: idx + 1,
          active: mission.active !== false,
          ...photoCriteriaFields(mission),
        })),
      };

      const payload = {
        levels: [...currentLevels, nextLevel],
      };

      const saved = await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      assertLevelsSaved(saved, [nextLevel]);

      setCreated(true);
      setNotice('Nivel creado.');
      router.push(`/promotions/${nextLevelNumber}`);
    } catch (e) {
      setNotice(`No se ha creado el nivel. ${describePromotionsError(e)}`);
    } finally {
      setSaving(false);
    }
  }

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
                Nuevo nivel
              </div>
              <h1 style={titleStyle}>Crear promoción / nivel</h1>
              <p style={{ ...mutedStyle, margin: '12px 0 0', maxWidth: 760 }}>
                Crea un nuevo nivel para este club. Se guardará únicamente en su configuración y después podrás seguir editándolo desde el detalle.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={goBack} style={buttonGhost}>
                Volver
              </button>
              <button type="button" onClick={handleCreate} disabled={saving} style={buttonPrimary}>
                {saving ? 'Creando...' : 'Crear nivel'}
              </button>
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
                Configuración general
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
                    <label style={labelStyle}>
                      Tipo de premio
                      <select value={rewardForm.type} onChange={(e) => updateRewardForm({ type: e.target.value })} style={inputStyle}>
                        {rewardTypes.map((r) => (
                          <option key={r.type} value={r.type}>{r.label}</option>
                        ))}
                      </select>
                    </label>
                    {rewardForm.type !== 'custom' && (
                      <label style={labelStyle}>
                        Cantidad
                        <input
                          type="text"
                          inputMode="numeric"
                          value={rewardForm.value}
                          onChange={(e) => updateRewardForm({ value: sanitizeTargetInput(e.target.value).slice(0, 3) })}
                          style={inputStyle}
                        />
                        <span style={{ ...helperStyle, fontWeight: 400 }}>De {REWARD_VALUE_MIN} a {REWARD_VALUE_MAX}</span>
                      </label>
                    )}
                  </div>
                  <label style={labelStyle}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={labelStyle}>
                    Dificultad
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
                      <option value="easy">Fácil</option>
                      <option value="medium">Media</option>
                      <option value="hard">Difícil</option>
                      <option value="extreme">Extrema</option>
                    </select>
                  </label>

                  <label style={labelStyle}>
                    Estado inicial
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                      {LEVEL_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label style={labelStyle}>
                  Descripción
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={textareaStyle} />
                </label>
              </div>
            </article>

            <article style={panelStyle}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 12 }}>
                Vista previa del nivel
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
                  Resumen
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
                  {title || 'Nivel sin título'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.65, marginBottom: 14 }}>
                  {description || 'Añade una descripción para explicar qué representa este nivel.'}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>Recompensa final</div>
                  <div style={{ color: '#e5e7eb', fontSize: 15, fontWeight: 800 }}>{rewardDisplayTitle(rewardForm) || 'Pendiente de definir'}</div>
                  <div style={helperStyle}>Misiones iniciales: {missions.length}</div>
                </div>
              </div>
            </article>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Misiones iniciales</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Puedes dejar unas misiones base ahora y luego afinarlas desde la edición del nivel.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['Asistencia', 'Contenido', 'Difusión', 'QR', 'Misión especial'].map((typeLabel) => (
                  <button
                    key={typeLabel}
                    type="button"
                    onClick={() => {
                      const next = buildMissionFromTemplate(typeLabel, missions.length + 1);
                      setMissions((prev) => [...prev, next]);
                      setEditingMissionId(next.id);
                    }}
                    style={buttonGhost}
                  >
                    + {typeLabel}
                  </button>
                ))}
              </div>
            </div>
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
                Lista de misiones
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {missions.map((mission, index) => (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => setEditingMissionId(mission.id)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: 16,
                      border: editingMissionId === mission.id
                        ? '1px solid rgba(0,229,255,0.24)'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: editingMissionId === mission.id
                        ? 'rgba(0,229,255,0.06)'
                        : 'rgba(255,255,255,0.03)',
                      color: '#e5e7eb',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{index + 1}. {mission.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
                      {missionTypeName(mission.type)} · {mission.validation}
                    </div>
                    {missionErrors[mission.id] && (
                      <div style={{ color: '#fda4af', fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>{missionErrors[mission.id]}</div>
                    )}
                  </button>
                ))}
              </div>
            </article>

            {editingMission && (
              <article style={panelStyle}>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 14 }}>
                  Editar misión seleccionada
                </div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={labelStyle}>
                    Título
                    <input
                      value={editingMission.title}
                      onChange={(e) => updateMission(editingMission.id, { title: e.target.value })}
                      style={inputStyle}
                    />
                  </label>

                  {missionErrors[editingMission.id] && (
                    <div role="alert" style={{ color: '#fda4af', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                      {missionErrors[editingMission.id]}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <label style={labelStyle}>
                      Objetivo
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingMission.target ?? ''}
                        onChange={(e) => updateMission(editingMission.id, { target: sanitizeTargetInput(e.target.value) })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
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

                  <label style={labelStyle}>
                    Detalles
                    <textarea
                      value={editingMission.details}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMissions((prev) => prev.map((mission) => (
                          mission.id === editingMission.id
                            ? { ...mission, details: value, description: value }
                            : mission
                        )));
                      }}
                      style={textareaStyle}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removeMission(editingMission)}
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
            )}
          </section>
        </div>
      </main>
    </RequireClub>
  );
}
