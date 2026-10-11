// lib/apiBase.js
// ÚNICA fuente de la URL del backend para todo el portal.
//
// No hay valor por defecto a propósito: si NEXT_PUBLIC_API_BASE no está definida, el
// portal debe fallar de forma visible, nunca hablar con producción sin avisar.
// next.config.mjs hace la misma comprobación y para la compilación.
//
// Las variables NEXT_PUBLIC_* se incrustan al compilar: tras cambiarla en Vercel hay
// que volver a desplegar. Tiene que leerse con el nombre literal para que Next la incruste.

function resolveApiBase(value) {
  const base = String(value || '').trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error(
      '[apiBase] Falta NEXT_PUBLIC_API_BASE. Defínela en .env.local (desarrollo) o en Vercel, y vuelve a compilar.'
    );
  }
  let url;
  try {
    url = new URL(base);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new Error(`[apiBase] NEXT_PUBLIC_API_BASE no es una URL http(s) válida: "${base}"`);
  }
  return base;
}

export const API_BASE = resolveApiBase(process.env.NEXT_PUBLIC_API_BASE);

export const API_HOST = new URL(API_BASE).host;

// Solo para comparar en el aviso de entorno; nunca se usa como valor por defecto.
export const PRODUCTION_API_HOST = 'api.nightvibe.life';

export const IS_PRODUCTION_API = API_HOST === PRODUCTION_API_HOST;
