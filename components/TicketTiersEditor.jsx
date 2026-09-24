'use client';
import { parsePriceInput, formatEUR } from '@/lib/price';

/* ====== Utilidades ====== */
const normName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const soldOf = (t) => Number(t?.sold) || 0;
const reservedOf = (t) => Number(t?.reserved) || 0;
const isZeroQty = (t) => String(t?.quantity ?? '').trim() === '0';
// "Sin límite" solo se activa con la casilla (`_unlimited`). Las tandas que
// llegan del servidor con quantity 0 ya eran ilimitadas.
const isUnlimited = (t) => (t?._unlimited !== undefined ? t._unlimited : isZeroQty(t));
// Cantidad 0 escrita a mano: la tanda no se vende (se envía pausada).
const isZeroLimited = (t) => !isUnlimited(t) && isZeroQty(t);
const isSellable = (t) => t?.active !== false && !isZeroLimited(t);

let keySeq = 0;
const newKey = () => `tier-${Date.now()}-${keySeq++}`;
const rowKey = (t, i) => t._key || t.tierId || `idx-${i}`;

/* Fila vacía nueva */
export function emptyTier(extra = {}) {
  return { _key: newKey(), name: '', priceEUR: '', quantity: '', active: true, _unlimited: false, ...extra };
}

/* Precio más bajo entre las tandas que se venden (o null) */
export function minTierPrice(tiers) {
  const prices = (Array.isArray(tiers) ? tiers : [])
    .filter(isSellable)
    .map(t => parsePriceInput(t?.priceEUR))
    .filter(n => n !== null);
  return prices.length ? Math.min(...prices) : null;
}

/* Devuelve un string de error o null */
export function validateTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 'Añade al menos una tanda de entradas.';
  }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const name = String(t?.name ?? '').trim();
    if (!name) return `La tanda ${i + 1} no tiene nombre.`;

    const price = parsePriceInput(t?.priceEUR);
    if (price === null) return `El precio de "${name}" no es válido. Usa un número como 12,50.`;
    if (price > 999999) return `El precio de "${name}" es demasiado alto.`;

    const rawQty = String(t?.quantity ?? '').trim();
    const qty = Number(rawQty);
    if (rawQty === '' || !Number.isInteger(qty) || qty < 0) {
      return `La cantidad de "${name}" debe ser un número entero (0 = sin límite).`;
    }
    const locked = soldOf(t) + reservedOf(t);
    if (qty > 0 && qty < locked) {
      return `La cantidad de "${name}" no puede ser menor que ${locked} (entradas ya vendidas o reservadas).`;
    }
  }
  return null;
}

/* Prepara las tandas para enviarlas al backend: números normalizados,
   `order` por posición y sin los campos que gestiona el servidor. */
export function serializeTiers(tiers) {
  return (Array.isArray(tiers) ? tiers : []).map((t, i) => {
    // eslint-disable-next-line no-unused-vars
    const { sold, reserved, _key, _unlimited, ...rest } = t;
    return {
      ...rest,
      name: String(t.name ?? '').trim(),
      priceEUR: parsePriceInput(t.priceEUR),
      quantity: Number(String(t.quantity ?? '').trim()),
      order: i,
      // El backend lee quantity 0 como ilimitado: una tanda a 0 sin la
      // casilla marcada se envía pausada para que no se venda.
      active: t.active !== false && !isZeroLimited(t),
    };
  });
}

export default function TicketTiersEditor({ value = [], onChange, capacity, mode }) {
  const tiers = Array.isArray(value) ? value : [];
  const isEdit = mode === 'edit';

  // En creación no hay ventas; en edición, lo vendido/reservado bloquea.
  const lockedOf = (t) => (isEdit ? soldOf(t) + reservedOf(t) : 0);

  function emit(next) {
    onChange?.(next.map((t, i) => ({ ...t, order: i })));
  }

  function patch(idx, changes) {
    emit(tiers.map((t, i) => (i === idx ? { ...t, ...changes } : t)));
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[idx], next[j]] = [next[j], next[idx]];
    emit(next);
  }

  function remove(idx) {
    emit(tiers.filter((_, i) => i !== idx));
  }

  function addRow() {
    emit([...tiers, emptyTier()]);
  }

  function toggleUnlimited(idx, checked) {
    const locked = lockedOf(tiers[idx]);
    patch(idx, { _unlimited: checked, quantity: checked ? 0 : (locked > 0 ? locked : '') });
  }

  function onQtyBlur(idx) {
    const t = tiers[idx];
    const locked = lockedOf(t);
    const raw = String(t.quantity ?? '').trim();
    if (raw === '' || isUnlimited(t)) return;
    const n = Number(raw);
    if (locked > 0 && Number.isFinite(n) && n < locked) patch(idx, { quantity: locked });
  }

  // Etiquetas "Tanda N" para nombres repetidos
  const counts = new Map();
  tiers.forEach(t => {
    const k = normName(t.name);
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  });
  const seen = new Map();
  const tandaLabels = tiers.map(t => {
    const k = normName(t.name);
    if (!k || counts.get(k) < 2) return null;
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return `Tanda ${n}`;
  });

  // Resumen
  const activeTiers = tiers.filter(t => t.active !== false);
  const anyUnlimited = activeTiers.some(isUnlimited);
  const totalQty = activeTiers.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  const minPrice = minTierPrice(tiers);
  const cap = Number(capacity) || 0;
  const overCapacity = cap > 0 && !anyUnlimited && totalQty > cap;

  return (
    <div style={sx.wrap}>
      <div style={sx.summary}>
        Aforo configurado: {anyUnlimited ? 'sin límite' : `${totalQty} entradas`}
        {minPrice !== null && <> · Desde {formatEUR(minPrice)}</>}
      </div>

      {overCapacity && (
        <div role="status" style={sx.warnBox}>
          Has configurado {totalQty} entradas en tandas, pero el aforo del evento es {cap}.
          Se venderán como máximo {cap}.
        </div>
      )}

      <div style={sx.rows}>
        {tiers.map((t, idx) => {
          const locked = lockedOf(t);
          const hasSales = locked > 0;
          const unlimited = isUnlimited(t);
          const sold = soldOf(t);
          const label = tandaLabels[idx];

          return (
            <div key={rowKey(t, idx)} style={sx.row(t.active === false)}>
              <label style={{ ...sx.label, ...sx.colName }}>
                <span style={sx.labelLine}>
                  Nombre <span style={sx.req}>*</span>
                  {label && <span style={sx.tandaBadge}>{label}</span>}
                </span>
                <input
                  value={t.name ?? ''}
                  onChange={e => patch(idx, { name: e.target.value })}
                  placeholder="p.ej. General"
                  maxLength={80}
                  style={sx.input}
                />
                {isEdit && hasSales && (
                  <span style={sx.helperText}>
                    {unlimited ? `${sold} vendidas` : `${sold} de ${Number(t.quantity) || 0} vendidas`}
                  </span>
                )}
              </label>

              <label style={{ ...sx.label, ...sx.colPrice }}>
                Precio (€)
                <input
                  type="text"
                  inputMode="decimal"
                  value={t.priceEUR ?? ''}
                  onChange={e => patch(idx, { priceEUR: e.target.value })}
                  placeholder="12,50"
                  style={sx.input}
                />
              </label>

              <div style={{ ...sx.label, ...sx.colQty }}>
                Cantidad
                {unlimited ? (
                  <input type="text" value="Sin límite" disabled style={{ ...sx.input, opacity: .6 }} />
                ) : (
                  <input
                    type="number"
                    min={locked}
                    step="1"
                    inputMode="numeric"
                    value={t.quantity ?? ''}
                    onChange={e => patch(idx, { quantity: e.target.value, _unlimited: false })}
                    onBlur={() => onQtyBlur(idx)}
                    placeholder="100"
                    style={sx.input}
                  />
                )}
                {isZeroLimited(t) && (
                  <span style={sx.warnText}>
                    Con 0 entradas esta tanda no se venderá. Marca &apos;Sin límite&apos; si quieres venta ilimitada.
                  </span>
                )}
                <label style={sx.checkLine}>
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={e => toggleUnlimited(idx, e.target.checked)}
                  />
                  Sin límite
                </label>
              </div>

              <div style={sx.actions}>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  title="Subir"
                  aria-label="Subir"
                  style={sx.iconBtn(idx === 0)}
                >↑</button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === tiers.length - 1}
                  title="Bajar"
                  aria-label="Bajar"
                  style={sx.iconBtn(idx === tiers.length - 1)}
                >↓</button>
                <button
                  type="button"
                  onClick={() => patch(idx, { active: t.active === false })}
                  aria-pressed={t.active !== false}
                  title="Pausa o reactiva la venta de esta tanda"
                  style={sx.toggle(t.active !== false)}
                >
                  {t.active !== false ? 'Activa' : 'Pausada'}
                </button>
                {!(isEdit && hasSales) && (
                  <button type="button" onClick={() => remove(idx)} style={sx.ghostDanger}>
                    Eliminar
                  </button>
                )}
              </div>

              {isEdit && hasSales && (
                <div style={{ ...sx.helperText, flexBasis: '100%' }}>
                  No se puede eliminar una tanda con entradas vendidas. Puedes pausarla para dejar de venderla.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={sx.helperText}>
        Repite el mismo nombre para crear tandas: se venderán en orden y, al
        agotarse una, se activará la siguiente automáticamente.
      </p>

      <div>
        <button type="button" onClick={addRow} style={sx.ghost}>+ Añadir tanda</button>
      </div>
    </div>
  );
}

/* ====== estilos inline (mismos tokens que EventForm) ====== */
const sx = {
  wrap: { display:'grid', gap:12 },
  summary: {
    padding:12,
    borderRadius:14,
    background:'rgba(255,255,255,0.03)',
    border:'1px solid rgba(255,255,255,0.06)',
    color:'#e5e7eb',
    fontSize:14,
    fontWeight:700,
  },
  warnBox: {
    background:'rgba(250,204,21,0.06)',
    border:'1px solid rgba(250,204,21,0.30)',
    color:'#fde68a',
    padding:12,
    borderRadius:10,
    fontSize:13,
    lineHeight:1.55,
  },
  rows: { display:'grid', gap:10 },
  row: (paused) => ({
    display:'flex',
    flexWrap:'wrap',
    alignItems:'flex-start',
    gap:12,
    padding:12,
    borderRadius:14,
    border:'1px solid #243044',
    background:'#0d1526',
    opacity: paused ? .65 : 1,
  }),
  colName: { flex:'2 1 200px', minWidth:0 },
  colPrice: { flex:'1 1 110px', minWidth:0 },
  colQty: { flex:'1 1 150px', minWidth:0 },
  label: { display:'grid', gap:6, fontSize:14 },
  labelLine: { display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' },
  req: { color:'#00e5ff', fontWeight:800 },
  input: {
    width:'100%',
    padding:'12px 14px',
    borderRadius:12,
    border:'1px solid #243044',
    background:'#0b1220',
    color:'#e5e7eb',
    outline:'none',
    minHeight:48,
  },
  checkLine: { display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#cbd5e1', cursor:'pointer' },
  tandaBadge: {
    border:'1px solid rgba(0,229,255,0.18)',
    background:'rgba(0,229,255,0.08)',
    color:'#baf6ff',
    padding:'2px 8px',
    borderRadius:999,
    fontSize:11,
    fontWeight:800,
  },
  helperText: { opacity:.78, fontSize:12, color:'#94a3b8', margin:0, lineHeight:1.55 },
  warnText: { fontSize:12, color:'#fde68a', lineHeight:1.55 },
  actions: { display:'flex', alignItems:'center', gap:6, alignSelf:'center', flexWrap:'wrap' },
  iconBtn: (disabled) => ({
    background:'#0b1220',
    color:'#cbd5e1',
    width:40,
    height:40,
    borderRadius:10,
    fontWeight:800,
    border:'1px solid #243044',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? .4 : 1,
  }),
  toggle: (on) => ({
    background: on ? '#08222a' : '#111827',
    color: on ? '#c3f3fb' : '#94a3b8',
    padding:'10px 12px',
    borderRadius:999,
    fontWeight:800,
    border:'1px solid ' + (on ? '#00b9d1' : '#243044'),
    cursor:'pointer',
    minWidth:92,
  }),
  ghost: {
    background:'#0d1526',
    color:'#cbd5e1',
    padding:'10px 12px',
    borderRadius:10,
    fontWeight:700,
    border:'1px solid #243044',
    cursor:'pointer',
  },
  ghostDanger: {
    background:'#111827',
    color:'#f87171',
    padding:'10px 12px',
    borderRadius:10,
    fontWeight:800,
    border:'1px solid #7f1d1d',
    cursor:'pointer',
  },
};
