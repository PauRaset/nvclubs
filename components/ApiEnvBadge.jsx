'use client';

import { useEffect, useState } from 'react';
import { API_HOST, IS_PRODUCTION_API } from '@/lib/apiBase';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/*
  Aviso fijo del backend al que habla este portal.
  - API que no es la de producción: etiqueta índigo con el host.
  - Portal en local apuntando a la API de producción: aviso ámbar.
  - Producción contra producción: no se muestra nada.
*/
export default function ApiEnvBadge() {
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(LOCAL_HOSTS.has(window.location.hostname));
  }, []);

  if (IS_PRODUCTION_API && !isLocal) return null;

  const danger = IS_PRODUCTION_API;
  return (
    <div
      role="status"
      title={`Este portal usa la API ${API_HOST}`}
      style={{
        position: 'fixed',
        left: 'max(12px, env(safe-area-inset-left))',
        bottom: 'max(12px, env(safe-area-inset-bottom))',
        zIndex: 900,
        maxWidth: 'calc(100vw - 24px)',
        padding: '6px 12px',
        borderRadius: 'var(--nv-r-pill)',
        border: `1px solid ${danger ? 'rgba(245,158,11,0.55)' : 'var(--nv-indigo-border)'}`,
        background: danger ? 'rgba(245,158,11,0.18)' : 'rgba(99,102,241,0.22)',
        color: danger ? '#fde68a' : '#c7ccff',
        backdropFilter: 'blur(6px)',
        fontSize: 'var(--nv-fs-xs)',
        fontWeight: 800,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {danger ? '⚠ Local contra la API de PRODUCCIÓN' : 'API de pruebas'} · <span className="nv-mono">{API_HOST}</span>
    </div>
  );
}
