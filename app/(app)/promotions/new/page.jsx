'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      unit: '',
      target: 1,
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
    target: base.target,
    params: {},
    order: index,
    active: true,
  };
}

export default function NewPromotionPage() {
  const router = useRouter();

  const [title, setTitle] = useState('Nuevo nivel');
  const [reward, setReward] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [status, setStatus] = useState('draft');
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState('info');
  const [saving, setSaving] = useState(false);

  function flash(message, kind = 'info') {
    setNotice(message);
    setNoticeKind(kind);
  }

  const [missions, setMissions] = useState([
    buildMissionFromTemplate('Asistencia', 1),
    buildMissionFromTemplate('Contenido', 2),
  ]);
  const [editingMissionId, setEditingMissionId] = useState(missions[0]?.id || '');

  const editingMission = missions.find((mission) => mission.id === editingMissionId) || missions[0] || null;

  async function handleCreate() {
    const clubId = extractClubId();
    if (!clubId) {
      flash('No se ha podido resolver el club actual.', 'error');
      return;
    }

    try {
      setSaving(true);
      flash('Creando nivel...', 'info');

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
        reward: {
          type: 'custom',
          title: reward.trim(),
          description: '',
          value: null,
          active: true,
        },
        status,
        active: status === 'active',
        visibleInApp: true,
        version: 1,
        missions: missions.map((mission, idx) => ({
          type: mission.type,
          title: (mission.title || '').trim(),
          description: (mission.details || '').trim(),
          target: Number.isFinite(Number(mission.target)) ? Number(mission.target) : 1,
          unit: String(mission.unit || '').trim(),
          params: mission.params && typeof mission.params === 'object' ? mission.params : {},
          validationType: mission.validationType || 'automatic',
          requiresApproval: mission.validationType === 'manual',
          order: idx + 1,
          active: mission.active !== false,
        })),
      };

      const payload = {
        levels: [...currentLevels, nextLevel],
      };

      await apiJson(`${API_BASE}/api/promotions/clubs/${clubId}/levels`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      flash('Nivel creado correctamente.', 'success');
      router.push(`/promotions/${nextLevelNumber}`);
    } catch (e) {
      flash(e?.message || 'No se pudo crear el nivel.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireClub>
      <div className="nv-views">
        <section className="nv-hero nv-hero-split nv-animate-in">
          <div>
            <span className="nv-eyebrow">Nuevo nivel</span>
            <h1 className="nv-h1" style={{ marginTop: 10 }}>Crear promoción / nivel</h1>
            <p className="nv-lead" style={{ marginTop: 10, maxWidth: 620 }}>
              Crea un nuevo nivel para este club. Se guardará únicamente en su configuración y
              después podrás seguir editándolo desde el detalle.
            </p>
          </div>
          <div className="nv-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.push('/promotions')} className="nv-btn nv-btn-secondary">
              Volver
            </button>
            <button type="button" onClick={handleCreate} disabled={saving} className="nv-btn nv-btn-primary">
              {saving ? 'Creando…' : 'Crear nivel'}
            </button>
          </div>
        </section>

        {notice && (
          <div className={`nv-notice nv-notice-${noticeKind}`} role={noticeKind === 'error' ? 'alert' : 'status'}>
            {notice}
          </div>
        )}

        <section className="nv-grid-auto" style={{ alignItems: 'start' }}>
          <article className="nv-card">
            <h2 className="nv-h3" style={{ marginBottom: 16 }}>Configuración general</h2>

            <div style={{ display: 'grid', gap: 14 }}>
              <div className="nv-field">
                <label className="nv-label">Nombre del nivel</label>
                <input className="nv-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="nv-field">
                <label className="nv-label">Recompensa final</label>
                <input className="nv-input" value={reward} onChange={(e) => setReward(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div className="nv-field">
                  <label className="nv-label">Dificultad</label>
                  <select className="nv-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="easy">Fácil</option>
                    <option value="medium">Media</option>
                    <option value="hard">Difícil</option>
                    <option value="extreme">Extrema</option>
                  </select>
                </div>

                <div className="nv-field">
                  <label className="nv-label">Estado inicial</label>
                  <select className="nv-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
              </div>

              <div className="nv-field">
                <label className="nv-label">Descripción</label>
                <textarea className="nv-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </article>

          <article className="nv-card">
            <h2 className="nv-h3" style={{ marginBottom: 16 }}>Vista previa del nivel</h2>
            <div className="nv-card-soft">
              <div className="nv-eyebrow">Resumen</div>
              <div className="nv-h3" style={{ fontSize: 24, marginTop: 10 }}>
                {title || 'Nivel sin título'}
              </div>
              <p className="nv-lead" style={{ marginTop: 8 }}>
                {description || 'Añade una descripción para explicar qué representa este nivel.'}
              </p>
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <div className="nv-small nv-muted">Recompensa final</div>
                <div className="nv-h4" style={{ fontSize: 15 }}>{reward || 'Pendiente de definir'}</div>
                <div className="nv-small nv-muted">Misiones iniciales: {missions.length}</div>
              </div>
            </div>
          </article>
        </section>

        <section className="nv-card">
          <div className="nv-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="nv-h3">Misiones iniciales</h2>
              <p className="nv-small nv-muted" style={{ marginTop: 8, maxWidth: 520 }}>
                Puedes dejar unas misiones base ahora y luego afinarlas desde la edición del nivel.
              </p>
            </div>
            <div className="nv-row" style={{ justifyContent: 'flex-end' }}>
              {['Asistencia', 'Contenido', 'Difusión', 'QR', 'Misión especial'].map((typeLabel) => (
                <button
                  key={typeLabel}
                  type="button"
                  onClick={() => {
                    const next = buildMissionFromTemplate(typeLabel, missions.length + 1);
                    setMissions((prev) => [...prev, next]);
                    setEditingMissionId(next.id);
                  }}
                  className="nv-btn nv-btn-secondary"
                >
                  + {typeLabel}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="nv-grid-auto" style={{ alignItems: 'start' }}>
          <article className="nv-card">
            <h2 className="nv-h3" style={{ marginBottom: 16 }}>Lista de misiones</h2>
            <ul className="nv-list">
              {missions.map((mission, index) => {
                const isActive = editingMissionId === mission.id;
                return (
                  <li key={mission.id}>
                    <button
                      type="button"
                      onClick={() => setEditingMissionId(mission.id)}
                      className="nv-item"
                      aria-pressed={isActive}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderColor: isActive ? 'var(--nv-accent-border)' : undefined,
                        background: isActive ? 'var(--nv-accent-soft)' : undefined,
                      }}
                    >
                      <div className="nv-h4" style={{ fontSize: 15 }}>{index + 1}. {mission.title}</div>
                      <div className="nv-small nv-muted">
                        {mission.typeLabel} · {mission.validation}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>

          {editingMission && (
            <article className="nv-card">
              <h2 className="nv-h3" style={{ marginBottom: 16 }}>Editar misión seleccionada</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="nv-field">
                  <label className="nv-label">Título</label>
                  <input
                    className="nv-input"
                    value={editingMission.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) => prev.map((mission) => (
                        mission.id === editingMission.id ? { ...mission, title: value } : mission
                      )));
                    }}
                  />
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
                        setMissions((prev) => prev.map((mission) => (
                          mission.id === editingMission.id ? { ...mission, target: value } : mission
                        )));
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
                        setMissions((prev) => prev.map((mission) => (
                          mission.id === editingMission.id ? { ...mission, unit: value } : mission
                        )));
                      }}
                    />
                  </div>
                </div>

                <div className="nv-field">
                  <label className="nv-label">Detalles</label>
                  <textarea
                    className="nv-textarea"
                    value={editingMission.details}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMissions((prev) => prev.map((mission) => (
                        mission.id === editingMission.id
                          ? { ...mission, details: value, description: value }
                          : mission
                      )));
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMissions((prev) => prev
                      .filter((mission) => mission.id !== editingMission.id)
                      .map((mission, idx) => ({ ...mission, order: idx + 1 }))
                    );
                    setEditingMissionId((prevId) => {
                      const remaining = missions.filter((mission) => mission.id !== prevId);
                      return remaining[0]?.id || '';
                    });
                  }}
                  className="nv-btn nv-btn-danger"
                >
                  Eliminar misión
                </button>
              </div>
            </article>
          )}
        </section>
      </div>
    </RequireClub>
  );
}
