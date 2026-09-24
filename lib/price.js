// Precio con decimales: aceptamos coma o punto y redondeamos a
// céntimos, nunca a euros enteros.
export function parsePriceInput(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;   // 2 decimales
}

// 12.5 -> "12,50 €", 15 -> "15 €"
export function formatEUR(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}
