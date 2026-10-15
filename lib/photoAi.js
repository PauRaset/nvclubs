// lib/photoAi.js
// Revisión de fotos con IA, tal como la devuelve GET /api/events/:id/photos/moderation.
//
// Decisiones que la IA toma sola (reviewSource 'ai'):
//  - aprueba fotos de misión con confianza alta      -> validationResult 'ai_matched'
//  - rechaza las que no cumplen la misión            -> 'ai_not_matched'
//  - bloquea contenido no permitido y borra el archivo -> 'ai_blocked'
// El resto queda pendiente para el club (reviewSource 'club' cuando decide).
// El club puede rectificar cualquier decisión de la IA salvo los bloqueos.

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

export function isAiApproved(photo) {
  return (
    photo?.status === 'approved' &&
    (photo?.reviewSource === 'ai' || (photo?.reviewSource == null && photo?.validationResult === 'ai_matched'))
  );
}

// Estado de la decisión, distinguiendo quién la tomó. Sin reviewSource (fotos anteriores
// a este cambio) no se atribuye.
export function photoStatusLabel(photo) {
  if (photo?.status === 'approved') {
    if (isAiApproved(photo)) return 'Aprobada automáticamente por la IA';
    if (photo?.reviewSource === 'club') return 'Aprobada por el local';
    return 'Aprobada';
  }
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

// Aprobadas por la IA en los últimos `days` días (por fecha de la decisión).
export function countAiApprovedSince(photos, days = 7, now = Date.now()) {
  const since = now - days * 24 * 60 * 60 * 1000;
  return (photos || []).filter((photo) => {
    if (!isAiApproved(photo)) return false;
    const t = new Date(photo.reviewedAt || photo.aiCheckedAt || 0).getTime();
    return Number.isFinite(t) && t >= since;
  }).length;
}

// El umbral (90 %) es PHOTO_REVIEW_AUTO_APPROVE_MIN en el backend: si cambia allí, cambiar aquí.
export const AI_REVIEW_NOTICE =
  'La IA revisa cada foto: aprueba sola las que cumplen la misión con mucha seguridad (90 % o más), ' +
  'rechaza las que no la cumplen y bloquea el contenido no permitido. El resto te espera aquí; ' +
  'empieza por las marcadas como dudosas. Puedes rectificar cualquier decisión de la IA, salvo los bloqueos.';

// Junto al botón de rechazar una foto ya aprobada: qué pasa de verdad con la misión.
export const REJECT_APPROVED_NOTE =
  'El avance de la misión que ya se sumó no se resta al rechazarla.';
