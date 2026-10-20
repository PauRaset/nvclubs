// lib/promotionsCatalog.js
// Textos, catálogos y validaciones de la sección de promociones (niveles y misiones).
// Lo que se guarda en el backend no cambia: aquí solo se traduce y se valida.

import { validatePhotoCriteria, parsePhotoCriteriaError } from '@/lib/photoCriteria';

// ---------------------------------------------------------------------------
// Tipos de misión: los 14 de MISSION_TYPES (models/PromotionLevelTemplate.js).
// ---------------------------------------------------------------------------
export const MISSION_TYPE_GROUPS = [
  {
    group: 'Asistencia',
    types: [
      { type: 'attend_event', label: 'Asistir a eventos' },
      { type: 'scan_qr', label: 'Escanear el QR del local' },
    ],
  },
  {
    group: 'Fotos',
    types: [
      { type: 'upload_event_photo', label: 'Subir foto del evento' },
      { type: 'approved_event_photo', label: 'Foto aprobada' },
      { type: 'group_photo_with_followed', label: 'Foto de grupo' },
      { type: 'theme_photo', label: 'Foto con la temática' },
      { type: 'photocall_photo', label: 'Foto en el photocall' },
      { type: 'show_prizes_photo', label: 'Foto mostrando premios' },
      { type: 'stamps_competition', label: 'Competición de sellos' },
    ],
  },
  {
    group: 'Social',
    types: [{ type: 'follow_users', label: 'Seguir a usuarios' }],
  },
  {
    group: 'Difusión',
    types: [
      { type: 'share_event', label: 'Compartir un evento' },
      { type: 'link_clicks', label: 'Clics en tu enlace' },
      // El backend lo admite pero no lo cuenta en ningún sitio: solo se reconoce
      // para misiones antiguas, no se puede elegir (link_clicks cubre lo mismo).
      { type: 'unique_visits', label: 'Visitas únicas', selectable: false },
      { type: 'referred_purchases', label: 'Compras por tu enlace' },
    ],
  },
];

const TYPE_INFO = new Map(
  MISSION_TYPE_GROUPS.flatMap(({ group, types }) => types.map((t) => [t.type, { ...t, group }]))
);

export function missionTypeName(type) {
  return TYPE_INFO.get(type)?.label || 'Tipo desconocido';
}

export function missionTypeGroup(type) {
  return TYPE_INFO.get(type)?.group || 'Otros';
}

export function isKnownMissionType(type) {
  return TYPE_INFO.has(type);
}

// Tipos que se pueden elegir en el selector.
export const SELECTABLE_MISSION_TYPE_GROUPS = MISSION_TYPE_GROUPS.map(({ group, types }) => ({
  group,
  types: types.filter((t) => t.selectable !== false),
})).filter(({ types }) => types.length);

export function isSelectableMissionType(type) {
  return TYPE_INFO.has(type) && TYPE_INFO.get(type).selectable !== false;
}

const GROUP_STYLES = {
  Asistencia: { background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.18)', color: '#86efac' },
  Fotos: { background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.18)', color: '#8be9f7' },
  Social: { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.18)', color: '#fdba74' },
  Difusión: { background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.20)', color: '#d8b4fe' },
  Otros: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' },
};

export function missionTypeStyle(type) {
  return GROUP_STYLES[missionTypeGroup(type)] || GROUP_STYLES.Otros;
}

// ---------------------------------------------------------------------------
// Validación: la decide el tipo, no el club. Así cuenta el backend cada tipo:
//  - asistencia, QR y seguir: se calculan solos a partir de los datos;
//  - difusión: por el enlace personal del cliente (referidos);
//  - fotos: la IA revisa y, si duda, el club (igual que las plantillas, 'hybrid'
//    con requiresApproval true).
// ---------------------------------------------------------------------------
const AUTOMATIC = { validationType: 'automatic', requiresApproval: false };
const LINK = { validationType: 'link_tracking', requiresApproval: false };
const PHOTO = { validationType: 'hybrid', requiresApproval: true };
const PHOTO_TEXT = 'El cliente sube una foto. La IA la revisa y, si tiene dudas, la revisas tú en «Validación de fotos».';
const LINK_TEXT = 'Se cuenta sola con el enlace personal que comparte el cliente.';

const MISSION_VALIDATION = {
  attend_event: { ...AUTOMATIC, text: 'Se cuenta sola cuando el cliente está marcado como asistente al evento.' },
  scan_qr: { ...AUTOMATIC, text: 'Se cuenta sola al escanear el QR del local (una vez por evento).' },
  follow_users: { ...AUTOMATIC, text: 'Se cuenta sola con las personas que sigue el cliente en NightVibe.' },
  share_event: { ...LINK, text: LINK_TEXT },
  link_clicks: { ...LINK, text: LINK_TEXT },
  referred_purchases: { ...LINK, text: LINK_TEXT },
  // El backend aún no cuenta las visitas únicas: la misión no avanza.
  unique_visits: {
    ...LINK,
    text: LINK_TEXT,
    warning:
      'Las visitas únicas no se cuentan: una misión de este tipo no avanzará. Cámbiala a «Clics en tu enlace», que sí funciona.',
  },
  upload_event_photo: { ...PHOTO, text: PHOTO_TEXT },
  approved_event_photo: { ...PHOTO, text: PHOTO_TEXT },
  group_photo_with_followed: { ...PHOTO, text: PHOTO_TEXT },
  theme_photo: { ...PHOTO, text: PHOTO_TEXT },
  photocall_photo: { ...PHOTO, text: PHOTO_TEXT },
  show_prizes_photo: { ...PHOTO, text: PHOTO_TEXT },
  stamps_competition: { ...PHOTO, text: PHOTO_TEXT },
};

// { validationType, requiresApproval } para guardar; un tipo desconocido conserva lo que tenía.
export function missionValidationFields(mission) {
  const rule = MISSION_VALIDATION[mission?.type];
  if (rule) return { validationType: rule.validationType, requiresApproval: rule.requiresApproval };
  const validationType = mission?.validationType || (mission?.requiresApproval ? 'manual' : 'automatic');
  return {
    validationType,
    requiresApproval: typeof mission?.requiresApproval === 'boolean' ? mission.requiresApproval : validationType === 'manual',
  };
}

// Explicación para el club de cómo se cumple la misión.
export function missionValidationText(type) {
  return MISSION_VALIDATION[type]?.text || '';
}

export function missionValidationWarning(type) {
  return MISSION_VALIDATION[type]?.warning || '';
}

// ---------------------------------------------------------------------------
// Unidades: se guardan en inglés (como en las plantillas del backend) y se
// muestran en español.
// ---------------------------------------------------------------------------
const UNIT_LABELS = {
  events: ['evento', 'eventos'],
  photos: ['foto', 'fotos'],
  scans: ['escaneo', 'escaneos'],
  users: ['usuario', 'usuarios'],
  shares: ['vez compartido', 'veces compartido'],
  clicks: ['clic', 'clics'],
  visits: ['visita', 'visitas'],
  purchases: ['compra', 'compras'],
};

// Unidad por defecto de cada tipo (la que usan las plantillas del backend).
export const DEFAULT_UNIT_BY_TYPE = {
  attend_event: 'events',
  scan_qr: 'scans',
  upload_event_photo: 'photos',
  approved_event_photo: 'photos',
  group_photo_with_followed: 'photos',
  theme_photo: 'photos',
  photocall_photo: 'photos',
  show_prizes_photo: 'photos',
  stamps_competition: 'photos',
  follow_users: 'users',
  share_event: 'shares',
  link_clicks: 'clicks',
  unique_visits: 'visits',
  referred_purchases: 'purchases',
};

export function unitLabel(unit, count = 2) {
  const key = String(unit || '').trim();
  const labels = UNIT_LABELS[key.toLowerCase()];
  if (!labels) return key;
  return Number(count) === 1 ? labels[0] : labels[1];
}

// Opciones del selector de unidad; incluye la actual aunque no sea conocida.
export function unitOptions(currentUnit) {
  const opts = Object.keys(UNIT_LABELS).map((value) => ({ value, label: UNIT_LABELS[value][1] }));
  const cur = String(currentUnit || '').trim();
  if (cur && !UNIT_LABELS[cur.toLowerCase()]) opts.push({ value: cur, label: cur });
  return opts;
}

// "3 fotos", "1 evento".
export function formatTarget(target, unit) {
  const n = Number(target);
  const count = Number.isFinite(n) && n > 0 ? n : 1;
  const u = unitLabel(unit, count);
  return u ? `${count} ${u}` : String(count);
}

// ---------------------------------------------------------------------------
// Premio del nivel. Réplica de utils/rewardTypes.js del backend para la vista
// previa del título autogenerado: si cambia allí, cambiar aquí.
// ---------------------------------------------------------------------------
export const REWARD_VALUE_MIN = 1;
export const REWARD_VALUE_MAX = 100;
export const REWARD_TITLE_MAX = 80;

// Solo si el backend no manda `rewardTypes`.
export const FALLBACK_REWARD_TYPES = [
  { type: 'shot', label: 'Chupito' },
  { type: 'drink', label: 'Copa' },
  { type: 'free_entry', label: 'Entrada gratis' },
  { type: 'skip_line', label: 'Sin cola' },
  { type: 'bottle', label: 'Botella / mesa' },
  { type: 'custom', label: 'Otro (texto libre)' },
];

const REWARD_TITLES = {
  shot: { one: '1 chupito', many: 'chupitos' },
  drink: { one: 'Copa gratis', many: 'copas gratis' },
  free_entry: { one: 'Entrada gratis', many: 'entradas gratis' },
  skip_line: { one: 'Sin cola una noche', many: 'noches sin cola' },
  bottle: { one: 'Botella', many: 'botellas' },
};

export function autoRewardTitle(type, value) {
  const t = REWARD_TITLES[type];
  if (!t) return '';
  const n = Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1;
  return n === 1 ? t.one : `${n} ${t.many}`;
}

// Normaliza el premio guardado para el formulario. `title` queda vacío si era el
// autogenerado, para que siga generándose al cambiar tipo o cantidad.
export function rewardToForm(reward, rewardTypes = FALLBACK_REWARD_TYPES) {
  const known = new Set(rewardTypes.map((r) => r.type));
  const rawType = String(reward?.type || '').trim();
  const type = known.has(rawType) ? rawType : 'custom';
  const value = Number.isInteger(Number(reward?.value)) && Number(reward?.value) > 0 ? String(reward.value) : '1';
  const title = String(reward?.title || '').trim();
  const isAuto = type !== 'custom' && (!title || title === autoRewardTitle(type, Number(value)));
  return { type, value, title: isAuto ? '' : title };
}

// Premio listo para enviar; con título vacío el backend lo autogenera.
export function rewardFromForm(form, previous = {}) {
  const isCustom = form.type === 'custom';
  const value = Number(form.value);
  return {
    ...(previous || {}),
    type: form.type,
    title: String(form.title || '').trim(),
    value: isCustom ? (previous?.value ?? null) : value,
  };
}

// Texto del premio tal como se verá.
export function rewardDisplayTitle(form) {
  const title = String(form?.title || '').trim();
  if (title) return title;
  return form?.type === 'custom' ? '' : autoRewardTitle(form?.type, Number(form?.value));
}

export function validateRewardForm(form) {
  const title = String(form?.title || '').trim();
  if (form?.type === 'custom' && !title) {
    return 'Escribe el nombre del premio (con el tipo "Otro" es obligatorio).';
  }
  if (title.length > REWARD_TITLE_MAX) {
    return `El nombre del premio no puede pasar de ${REWARD_TITLE_MAX} caracteres.`;
  }
  if (form?.type !== 'custom') {
    const v = Number(form?.value);
    if (!String(form?.value ?? '').trim() || !Number.isInteger(v) || v < REWARD_VALUE_MIN || v > REWARD_VALUE_MAX) {
      return `La cantidad del premio debe ser un número entero entre ${REWARD_VALUE_MIN} y ${REWARD_VALUE_MAX}.`;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Estado del nivel. En el backend 'draft' y 'paused' solo significan
// active: false, así que en pantalla son una sola opción.
// ---------------------------------------------------------------------------
export const LEVEL_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
];

export function levelStatusValue(status) {
  return status === 'active' ? 'active' : 'paused';
}

export function levelStatusLabel(status) {
  return status === 'active' ? 'Activo' : 'Pausado';
}

// ---------------------------------------------------------------------------
// Misiones
// ---------------------------------------------------------------------------

// Campos que identifican la misión en el backend: sin ellos el progreso de los
// clientes y sus fotos pueden perder el vínculo con la misión.
export function missionIdentityFields(mission) {
  const id = String(mission?._id || mission?.id || '');
  return {
    ...(/^[a-f0-9]{24}$/i.test(id) ? { _id: id } : {}),
    ...(mission?.missionKey ? { missionKey: String(mission.missionKey) } : {}),
  };
}

// Valor del campo "Objetivo" mientras se escribe: solo dígitos, puede quedar vacío.
export function sanitizeTargetInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6);
}

// Problema de la misión, o '' si se puede guardar.
export function validateMission(mission) {
  if (!String(mission?.title || '').trim()) return 'Escribe el título de la misión.';
  const target = Number(mission?.target);
  if (String(mission?.target ?? '').trim() === '' || !Number.isInteger(target) || target < 1) {
    return 'El objetivo tiene que ser un número entero, 1 o más.';
  }
  return validatePhotoCriteria(mission);
}

// ---------------------------------------------------------------------------
// Errores del servidor -> mensajes en español
// ---------------------------------------------------------------------------
const FIELD_NAMES = {
  title: 'el nombre',
  description: 'la descripción',
  difficulty: 'la dificultad',
  status: 'el estado',
  'reward.title': 'el nombre del premio',
  'reward.type': 'el tipo de premio',
  'reward.value': 'la cantidad del premio',
  type: 'el tipo',
  target: 'el objetivo',
  unit: 'la unidad',
};

function describeProblem(problem) {
  const level = problem?.levelNumber != null ? `Nivel ${problem.levelNumber}: ` : '';
  const path = String(problem?.path || '');
  const m = path.match(/^missions\.(\d+)\.(.+)$/);
  if (m) {
    const field = m[2] === 'title' ? 'el título' : FIELD_NAMES[m[2]] || 'un dato';
    return `${level}revisa ${field} de la misión ${Number(m[1]) + 1}.`;
  }
  if (path === 'levelNumber') return `${level}hay dos niveles con el mismo número.`;
  const field = FIELD_NAMES[path];
  return field ? `${level}revisa ${field}.` : `${level}hay un dato que no es válido.`;
}

const REWARD_ERRORS = new Set([
  'invalid_reward_type',
  'reward_title_required',
  'reward_title_too_long',
  'reward_description_too_long',
  'invalid_reward_value',
]);

// Mensaje en español para un error de las llamadas de promociones.
export function describePromotionsError(err, fallback = 'No se han podido guardar los cambios. Inténtalo de nuevo.') {
  if (err instanceof TypeError) {
    return 'No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }

  const data = err?.data && typeof err.data === 'object' ? err.data : null;
  const code = data?.error || '';

  const criteria = parsePhotoCriteriaError(err);
  if (criteria) return criteria.message;

  if (REWARD_ERRORS.has(code)) {
    const level = data.levelNumber != null ? `Nivel ${data.levelNumber}: ` : '';
    return `${level}${data.message || 'el premio no es válido.'}`;
  }
  if (code === 'invalid_levels' && Array.isArray(data.problems) && data.problems.length) {
    const first = describeProblem(data.problems[0]);
    const more = data.problems.length - 1;
    return more > 0 ? `${first} (y ${more} problema${more === 1 ? '' : 's'} más)` : first;
  }
  if (code === 'no_levels' || code === 'Missing levels array') return 'Tiene que haber al menos un nivel.';
  // Errores de la ruta de un nivel que ya traen el mensaje en español.
  if (['level_title_required', 'conflict', 'invalid_level_number', 'level_number_mismatch'].includes(code) && data.message) {
    return data.message;
  }
  if (code === 'level_title_required') return 'El nivel necesita un nombre.';
  if (code === 'save_failed' && data.message) return data.message;
  if (err?.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  if (err?.status === 403 || code === 'Forbidden') {
    return 'No tienes permiso para cambiar las promociones de este local.';
  }
  if (code === 'Invalid clubId') return 'No se ha podido identificar tu local. Vuelve a iniciar sesión.';
  if (err?.status >= 500) return 'Ha habido un problema en el servidor. Inténtalo de nuevo en unos minutos.';

  // Mensajes propios del portal (p. ej. assertLevelsSaved, sin status HTTP), ya en español.
  if (!err?.status && err?.message && !/^(Error \(HTTP|HTTP \d)/.test(err.message)) return err.message;
  return fallback;
}
