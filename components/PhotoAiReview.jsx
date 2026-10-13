// components/PhotoAiReview.jsx
// Piezas de la moderación de fotos con IA (ver lib/photoAi.js).
import { AI_STATUS, getAiStatus, formatAiConfidence } from '@/lib/photoAi';

// Etiqueta de la IA + motivo + confianza.
export function AiVerdict({ photo, size = 'sm' }) {
  const status = getAiStatus(photo);
  const meta = AI_STATUS[status];
  const reason = String(photo?.aiReason || '').trim();
  const confidence = status === 'not_run' ? '' : formatAiConfidence(photo?.aiConfidence);
  const fontSize = size === 'lg' ? 13 : 12;

  return (
    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <span className={`nv-badge ${meta.badge}`} style={{ width: 'fit-content', fontSize }}>
        {meta.label}
      </span>
      {reason && (
        <div style={{ color: 'var(--nv-text-soft)', fontSize, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
          {reason}
        </div>
      )}
      {confidence && (
        <div style={{ color: 'var(--nv-muted)', fontSize: fontSize - 1, fontWeight: 700 }}>{confidence}</div>
      )}
    </div>
  );
}

// Sustituye a la imagen de una foto bloqueada por moderación (el archivo se ha borrado).
export function BlockedPhotoPlaceholder({ style }) {
  return (
    <div
      role="img"
      aria-label="Contenido no permitido. La imagen se ha eliminado automáticamente."
      style={{
        width: '100%',
        height: '100%',
        minHeight: 160,
        display: 'grid',
        placeItems: 'center',
        alignContent: 'center',
        gap: 10,
        padding: 16,
        textAlign: 'center',
        background: 'var(--nv-ink)',
        color: 'var(--nv-muted)',
        fontSize: 13,
        lineHeight: 1.5,
        ...style,
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M5.6 5.6 18.4 18.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>Contenido no permitido. La imagen se ha eliminado automáticamente.</div>
    </div>
  );
}

// Aviso discreto para la cabecera de las pantallas de moderación.
export function AiReviewNotice({ text, style }) {
  return (
    <p
      style={{
        margin: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        color: 'var(--nv-muted)',
        fontSize: 13,
        lineHeight: 1.55,
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>{text}</span>
    </p>
  );
}
