'use client';
// Aviso al salir de una pantalla con cambios sin guardar:
//  - cerrar o recargar la pestaña: diálogo del navegador (beforeunload);
//  - enlaces internos del portal (menú, etc.): confirmación propia antes de navegar.
// El botón "atrás" del navegador no se puede interceptar en el App Router.

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { confirmDialog } from '@/components/Toast';

const CONFIRM = {
  title: '¿Salir sin guardar?',
  message: 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
  confirmText: 'Salir sin guardar',
  danger: true,
};

export default function useUnsavedChangesGuard(dirty) {
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = async (e) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      if (await confirmDialog(CONFIRM)) {
        dirtyRef.current = false;
        router.push(url.pathname + url.search + url.hash);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  // Para botones propios ("Volver"): resuelve true si se puede salir.
  return useCallback(async () => {
    if (!dirtyRef.current) return true;
    const ok = await confirmDialog(CONFIRM);
    if (ok) dirtyRef.current = false;
    return ok;
  }, []);
}
