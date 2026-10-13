// lib/photoAi.js
// Revisión de fotos con IA, tal como la devuelve GET /api/events/:id/photos/moderation.
//
// La IA solo ORIENTA en las misiones: la decisión final es `status`, que toma el club.
// Lo único que aplica sola es la moderación de contenido (validationResult 'ai_blocked'),
// y en ese caso el backend borra el archivo.

export const AI_STATUS = {
  approved:     { label: 'IA: cumple',          badge: 'nv-badge-success' },
  rejected:     { label: 'IA: no cumple',       badge: 'nv-badge-danger' },
  needs_review: { label: 'IA: dudosa, revisar', badge: 'nv-badge-warn' },
  not_run:      { label: 'IA: sin revisar',     badge: 'nv-badge-neutral' },
};

export function getAiStatus(photo) {
  const s = String(photo?.aiStatus || 'not_run');
  return Object.prototype.hasOwnProperty.call(AI_STATUS, s) ? s : 'not_run';
}

// Bloqueada por moderación de contenido: el archivo ya no existe y no hay nada que decidir.
export function isAiBlocked(photo) {
  return photo?.validationResult === 'ai_blocked';
}

// Fotos en las que el club debe fijarse: la IA duda o aún no la ha revisado.
export function needsClubReview(photo) {
  const s = getAiStatus(photo);
  return s === 'needs_review' || s === 'not_run';
}

export function formatAiConfidence(value) {
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) return '';
  const pct = Math.round(Math.min(Math.max(n, 0), 1) * 100);
  return `${pct}% de confianza`;
}

// Estado de la decisión, distinguiendo quién rechazó.
export function photoStatusLabel(photo) {
  if (photo?.status === 'approved') return 'Aprobada';
  if (photo?.status === 'rejected') {
    if (isAiBlocked(photo)) return 'Bloqueada por la IA';
    if (photo?.validationResult === 'ai_not_matched') return 'Rechazada por la IA';
    return 'Rechazada por el club';
  }
  return 'Pendiente';
}

const REVIEW_PRIORITY = { needs_review: 0, not_run: 1 };

const uploadedTime = (photo) => {
  const t = photo?.uploadedAt ? new Date(photo.uploadedAt).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

// Primero las dudosas, luego las no revisadas, después el resto; dentro de cada grupo,
// las más recientes primero.
export function sortPhotosForReview(photos) {
  return [...photos].sort((a, b) => {
    const pa = REVIEW_PRIORITY[getAiStatus(a)] ?? 2;
    const pb = REVIEW_PRIORITY[getAiStatus(b)] ?? 2;
    if (pa !== pb) return pa - pb;
    return uploadedTime(b) - uploadedTime(a);
  });
}

export const AI_REVIEW_NOTICE =
  'La IA revisa las fotos automáticamente, pero la decisión final es tuya. ' +
  'Las marcadas como dudosas son las que más necesitan tu revisión.';
