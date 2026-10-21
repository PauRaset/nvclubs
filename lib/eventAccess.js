// lib/eventAccess.js
// Tipo de acceso (accessType) y aforo (capacity) del evento.
// Reglas del backend: utils/accessType.js y parseCapacityInput (routes/eventRoutes.js).

import { parsePriceInput } from '@/lib/price';

export const ACCESS_TYPE_OPTIONS = [
  { value: 'free_open', label: 'Entrada libre', help: 'Cualquiera puede entrar, sin entrada.' },
  { value: 'free_limited', label: 'Gratis con aforo', help: 'Gratis, pero con plazas limitadas.' },
  { value: 'paid', label: 'Entrada de pago', help: 'Se venden entradas.' },
];

const ACCESS_TYPES = ACCESS_TYPE_OPTIONS.map((o) => o.value);

function hasPaidPrice({ price, ticketTiers } = {}) {
  const tiers = Array.isArray(ticketTiers) ? ticketTiers : [];
  if (tiers.length) return tiers.some((t) => (parsePriceInput(t?.priceEUR) || 0) > 0);
  return (parsePriceInput(price) || 0) > 0;
}

// Tipo con el que se abre el formulario: el guardado si existe; en eventos
// anteriores al campo, el que deduce el backend (de pago si tiene precio).
export function initialAccessType(event, mode) {
  const stored = event?.accessType;
  if (ACCESS_TYPES.includes(stored)) return stored;
  if (mode === 'create' || !event) return 'paid';
  return hasPaidPrice(event) ? 'paid' : 'free_open';
}

// Aforo escrito en el formulario: solo dígitos.
export function sanitizeCapacityInput(v) {
  return String(v ?? '').replace(/\D/g, '').slice(0, 7);
}

// Valor inicial del campo: vacío si no hay límite (0).
export function initialCapacityInput(event) {
  const n = Number(event?.capacity);
  return Number.isInteger(n) && n > 0 ? String(n) : '';
}

// Mensaje claro para los errores del backend al guardar un evento.
export function describeEventSaveError(res) {
  const data = res?.data && typeof res.data === 'object' ? res.data : {};
  switch (data.error) {
    case 'invalid_capacity':
      return 'El aforo debe ser un número entero (sin decimales).';
    case 'capacity_below_committed':
      return Number.isFinite(Number(data.committed))
        ? `No puedes poner un aforo menor que ${data.committed}: ya hay ${data.committed} entradas vendidas o reservadas.`
        : 'No puedes poner un aforo menor que las entradas ya vendidas o reservadas.';
    case 'free_limited_requires_capacity':
      return 'Falta el aforo: indica cuántas plazas hay.';
    case 'free_limited_no_tiers':
      return '«Gratis con aforo» no usa tandas: indica solo el aforo.';
    case 'mixed_free_and_paid_tiers':
      return 'No se pueden mezclar tandas gratis y de pago en el mismo evento.';
    case 'paid_requires_price':
      return 'Un evento de pago necesita un precio mayor que 0.';
    case 'free_event_with_price':
      return 'Un evento gratis no puede tener precio ni tandas de pago.';
    case 'invalid_access_type':
      return 'Elige cómo se entra al evento.';
    default:
      if (res?.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
      if (res?.status === 403) return 'No tienes permiso para editar este evento.';
      if (res?.status === 409) {
        return data.message || 'Las ventas de este evento han cambiado mientras editabas. Recarga y vuelve a guardar.';
      }
      if (res?.status >= 500) return 'Ha habido un problema en el servidor. Inténtalo de nuevo en unos minutos.';
      return data.message || `No se ha podido guardar el evento (error ${res?.status ?? 'desconocido'}).`;
  }
}
