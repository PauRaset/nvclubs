// lib/photoCriteria.js
// Criterios de validación de las misiones de foto (photoCriteria / photoCriteriaExclude).

export const PHOTO_CRITERIA_MIN = 15;
export const PHOTO_CRITERIA_MAX = 300;
export const PHOTO_CRITERIA_EXCLUDE_MAX = 200;

// Solo para misiones nuevas o cuyo tipo se ha cambiado en el editor: lo que manda es
// `isPhotoMission`, que viene del GET de niveles.
const PHOTO_MISSION_TYPES = new Set([
  'upload_event_photo',
  'approved_event_photo',
  'group_photo_with_followed',
  'theme_photo',
  'photocall_photo',
  'show_prizes_photo',
]);

export function isPhotoMission(mission) {
  if (typeof mission?.isPhotoMission === 'boolean') return mission.isPhotoMission;
  return PHOTO_MISSION_TYPES.has(mission?.type);
}

// Campos a incluir al serializar una misión para el PUT de niveles.
export function photoCriteriaFields(mission) {
  return {
    photoCriteria: String(mission?.photoCriteria ?? '').trim(),
    photoCriteriaExclude: String(mission?.photoCriteriaExclude ?? '').trim(),
  };
}

// Devuelve el problema de la misión o '' si es válida.
export function validatePhotoCriteria(mission) {
  if (!isPhotoMission(mission)) return '';
  const { photoCriteria, photoCriteriaExclude } = photoCriteriaFields(mission);
  if (photoCriteria.length < PHOTO_CRITERIA_MIN) {
    return `Describe qué debe verse en la foto (mínimo ${PHOTO_CRITERIA_MIN} caracteres).`;
  }
  if (photoCriteria.length > PHOTO_CRITERIA_MAX) {
    return `"Qué debe verse en la foto" admite como máximo ${PHOTO_CRITERIA_MAX} caracteres.`;
  }
  if (photoCriteriaExclude.length > PHOTO_CRITERIA_EXCLUDE_MAX) {
    return `"Qué no vale" admite como máximo ${PHOTO_CRITERIA_EXCLUDE_MAX} caracteres.`;
  }
  return '';
}

const BACKEND_ERRORS = {
  photo_criteria_required: (d) =>
    `falta describir qué debe verse en la foto (mínimo ${d.minLength || PHOTO_CRITERIA_MIN} caracteres).`,
  photo_criteria_too_long: (d) =>
    `"Qué debe verse en la foto" es demasiado largo (máximo ${d.maxLength || PHOTO_CRITERIA_MAX} caracteres).`,
  photo_criteria_exclude_too_long: (d) =>
    `"Qué no vale" es demasiado largo (máximo ${d.maxLength || PHOTO_CRITERIA_EXCLUDE_MAX} caracteres).`,
};

// Traduce un error del PUT de niveles a { levelNumber, type, title, message }, o null si no es
// un error de criterios de foto.
export function parsePhotoCriteriaError(err) {
  const data = err?.data;
  const code = data && typeof data === 'object' ? data.error : '';
  const describe = BACKEND_ERRORS[code];
  if (!describe) return null;
  const where = [
    data.levelNumber != null ? `Nivel ${data.levelNumber}` : '',
    data.title ? `misión «${data.title}»` : 'una misión de foto',
  ].filter(Boolean).join(', ');
  return {
    levelNumber: data.levelNumber,
    type: data.type || '',
    title: data.title || '',
    missionKey: data.missionKey || '',
    message: `${where}: ${describe(data)}`,
  };
}
