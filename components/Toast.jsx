'use client';

import { useEffect, useState, useCallback } from 'react';

/* ------------------------------------------------------------------
   API imperativa (usable desde cualquier componente cliente):
     import { toast, confirmDialog } from '@/components/Toast';
     toast.success('Guardado');
     const ok = await confirmDialog({ title: '¿Eliminar?', danger: true });
   El <ToastHost/> se monta una sola vez en el layout raíz.
------------------------------------------------------------------- */

function emit(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function toast(message, type = 'info', opts = {}) {
  emit('nv:toast', { message, type, duration: opts.duration ?? 3500 });
}
toast.success = (m, o) => toast(m, 'success', o);
toast.error = (m, o) => toast(m, 'error', o);
toast.info = (m, o) => toast(m, 'info', o);

export function confirmDialog(options = {}) {
  return new Promise((resolve) => {
    emit('nv:confirm', { options, resolve });
  });
}

let idSeq = 0;

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const remove = useCallback((id) => {
    setToasts((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 220);
  }, []);

  useEffect(() => {
    function onToast(e) {
      const id = ++idSeq;
      const { message, type = 'info', duration = 3500 } = e.detail || {};
      setToasts((list) => [...list, { id, message, type }]);
      if (duration > 0) setTimeout(() => remove(id), duration);
    }
    function onConfirm(e) {
      const { options = {}, resolve } = e.detail || {};
      setConfirmState({ options, resolve });
    }
    window.addEventListener('nv:toast', onToast);
    window.addEventListener('nv:confirm', onConfirm);
    return () => {
      window.removeEventListener('nv:toast', onToast);
      window.removeEventListener('nv:confirm', onConfirm);
    };
  }, [remove]);

  function resolveConfirm(value) {
    if (confirmState?.resolve) confirmState.resolve(value);
    setConfirmState(null);
  }

  useEffect(() => {
    if (!confirmState) return;
    function onKey(e) {
      if (e.key === 'Escape') resolveConfirm(false);
      if (e.key === 'Enter') resolveConfirm(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState]);

  const opt = confirmState?.options || {};

  return (
    <>
      <div className="nv-toast-host" role="region" aria-label="Notificaciones">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`nv-toast ${t.type} ${t.leaving ? 'leaving' : ''}`}
            role="status"
            aria-live="polite"
          >
            <span className="nv-toast-dot" aria-hidden="true" />
            <div className="nv-toast-body">{t.message}</div>
            <button
              type="button"
              className="nv-toast-close"
              aria-label="Cerrar notificación"
              onClick={() => remove(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="nv-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={opt.title || 'Confirmar acción'}
          onClick={() => resolveConfirm(false)}
        >
          <div className="nv-confirm" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="nv-h3">{opt.title || '¿Confirmar acción?'}</h2>
              {opt.message && (
                <p className="nv-lead nv-small" style={{ marginTop: 8 }}>
                  {opt.message}
                </p>
              )}
            </div>
            <div className="nv-confirm-actions">
              <button
                type="button"
                className="nv-btn nv-btn-ghost"
                onClick={() => resolveConfirm(false)}
              >
                {opt.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                autoFocus
                className={`nv-btn ${opt.danger ? 'nv-btn-danger' : 'nv-btn-primary'}`}
                onClick={() => resolveConfirm(true)}
              >
                {opt.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
