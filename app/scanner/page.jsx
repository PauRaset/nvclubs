'use client';

import { useCallback, useEffect, useState } from 'react';
import ScannerCheckin from '@/components/ScannerCheckin';

const KEY_STORAGE = 'nv_scanner_key';
const EVENT_STORAGE = 'nv_scanner_event';
// Caché del título para poder mostrarlo aunque la lista de eventos no cargue.
const EVENT_TITLE_STORAGE = 'nv_scanner_event_title';

const lsGet = (k) => { try { return window.localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch {} };
const lsDel = (k) => { try { window.localStorage.removeItem(k); } catch {} };

// "jue 1 oct · 12:00"
const dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const toDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};
const fmtDay = (dt) => {
  const p = Object.fromEntries(dayFmt.formatToParts(dt).map(({ type, value }) => [type, value.replace(/\.$/, '')]));
  return `${p.weekday} ${p.day} ${p.month}`;
};
const fmtDate = (d) => {
  const dt = toDate(d);
  return dt ? `${fmtDay(dt)} · ${timeFmt.format(dt)}` : '';
};
// Si acaba el mismo día solo se muestra la hora de fin: "jue 1 oct · 12:00 – 19:00"
const fmtRange = (start, end) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s) return '';
  if (!e) return fmtDate(s);
  return `${fmtDate(s)} – ${s.toDateString() === e.toDateString() ? timeFmt.format(e) : fmtDate(e)}`;
};

export default function ScannerPage() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://api.nightvibe.life';
  const apiBase = backend.replace(/\/+$/, '');

  // loading | setup | events | scan
  const [phase, setPhase] = useState('loading');
  const [key, setKey] = useState('');
  const [keyInput, setKeyInput] = useState('');

  // Selección de evento
  const [events, setEvents] = useState([]);
  const [eventsState, setEventsState] = useState('idle'); // idle | loading | ok | missing | unauthorized | error
  const [event, setEvent] = useState(null); // { _id, title } | null (null = sin evento fijado)

  const loadEvents = useCallback(async (scannerKey) => {
    setEventsState('loading');
    try {
      const r = await fetch(`${apiBase}/api/checkin/events`, { headers: { 'x-scanner-key': scannerKey } });
      if (r.status === 404) { setEventsState('missing'); return null; }
      if (r.status === 401 || r.status === 403) { setEventsState('unauthorized'); return null; }
      if (!r.ok) { setEventsState('error'); return null; }
      const data = await r.json().catch(() => null);
      console.log('NVS eventos recibidos', data);
      // Formato real: { ok: true, events: [...] }. Se acepta también un array directo.
      const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : null;
      if (!list || data?.ok === false) { setEventsState('error'); return null; }
      setEvents(list);
      setEventsState('ok');
      return list;
    } catch {
      setEventsState('error');
      return null;
    }
  }, [apiBase]);

  // Arranque: clave desde ?k= o localStorage, y evento guardado.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = (url.searchParams.get('k') || '').trim();
    if (fromUrl) {
      // Clave nueva (posiblemente de otro club): el evento guardado ya no vale.
      if (fromUrl !== lsGet(KEY_STORAGE)) { lsDel(EVENT_STORAGE); lsDel(EVENT_TITLE_STORAGE); }
      lsSet(KEY_STORAGE, fromUrl);
      url.searchParams.delete('k');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }

    const stored = fromUrl || lsGet(KEY_STORAGE);
    if (!stored) { setPhase('setup'); return; }
    setKey(stored);

    const savedId = lsGet(EVENT_STORAGE);
    if (!savedId) { setPhase('events'); loadEvents(stored); return; }

    // Hay evento guardado: lo usamos y refrescamos el título si la lista carga.
    setEvent({ _id: savedId, title: lsGet(EVENT_TITLE_STORAGE) });
    setPhase('scan');
    loadEvents(stored).then((list) => {
      if (!list) return;
      const found = list.find((e) => String(e._id) === savedId);
      if (found) {
        setEvent({ _id: savedId, title: found.title || '' });
        lsSet(EVENT_TITLE_STORAGE, found.title || '');
      } else {
        // El evento ya no está vigente: volver a elegir.
        lsDel(EVENT_STORAGE); lsDel(EVENT_TITLE_STORAGE);
        setEvent(null);
        setPhase('events');
      }
    });
  }, [loadEvents]);

  const saveKey = (e) => {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    lsSet(KEY_STORAGE, k);
    lsDel(EVENT_STORAGE); lsDel(EVENT_TITLE_STORAGE);
    setKey(k);
    setKeyInput('');
    setEvent(null);
    setPhase('events');
    loadEvents(k);
  };

  const changeKey = () => {
    lsDel(KEY_STORAGE); lsDel(EVENT_STORAGE); lsDel(EVENT_TITLE_STORAGE);
    setKey('');
    setEvent(null);
    setEvents([]);
    setEventsState('idle');
    setPhase('setup');
  };

  const pickEvent = (ev) => {
    const id = String(ev._id);
    lsSet(EVENT_STORAGE, id);
    lsSet(EVENT_TITLE_STORAGE, ev.title || '');
    setEvent({ _id: id, title: ev.title || '' });
    setPhase('scan');
  };

  const skipEvent = () => {
    // No se guarda: en la próxima carga se vuelve a pedir el evento.
    lsDel(EVENT_STORAGE); lsDel(EVENT_TITLE_STORAGE);
    setEvent(null);
    setPhase('scan');
  };

  const changeEvent = () => {
    setPhase('events');
    loadEvents(key);
  };

  const ready = phase === 'scan' && !!key;

  return (
    <main className="nv-page">
      <div className="nv-shell" style={{ maxWidth: 720 }}>
        <div className="nv-row" style={{ justifyContent: 'space-between' }}>
          <a href="/dashboard" className="nv-link-accent">← Volver al panel</a>
          <span className={`nv-badge ${ready ? 'nv-badge-success' : 'nv-badge-warn'}`}>
            {ready ? 'Escáner listo' : key ? 'Elige evento' : 'Falta clave de escáner'}
          </span>
        </div>

        <section className="nv-hero">
          <div className="nv-badge">Control de acceso</div>
          <h1 className="nv-h1" style={{ marginTop: 14 }}>Escáner de entradas</h1>
          <p className="nv-lead" style={{ marginTop: 12 }}>
            Apunta la cámara al código QR de la entrada para validar el acceso en tiempo real.
          </p>
        </section>

        {phase === 'loading' && (
          <div className="nv-card" style={{ padding: 14 }}>Cargando…</div>
        )}

        {phase === 'setup' && (
          <form className="nv-card" style={{ padding: 18, display: 'grid', gap: 12 }} onSubmit={saveKey}>
            <label htmlFor="scanner-key" style={{ fontWeight: 700 }}>Clave del escáner</label>
            <input
              id="scanner-key"
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Pega aquí la clave"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#0b0f19', color: '#e5e7eb', fontSize: 16 }}
            />
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
              Pide la clave al responsable del local. La encontrará en Ajustes del panel.
            </p>
            <div>
              <button
                type="submit"
                disabled={!keyInput.trim()}
                style={{ padding: '10px 16px', borderRadius: 10, background: '#0ea5e9', color: '#001015', border: 0, fontWeight: 900, opacity: keyInput.trim() ? 1 : 0.6 }}
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {phase === 'events' && (
          <div className="nv-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ fontWeight: 800 }}>¿Qué evento vas a escanear?</div>

            {eventsState === 'loading' && <div style={{ opacity: 0.8 }}>Cargando eventos…</div>}

            {eventsState === 'ok' && events.length === 0 && (
              <div style={{ opacity: 0.8 }}>No hay eventos vigentes para este local.</div>
            )}

            {eventsState === 'ok' && events.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {events.map((ev) => (
                  <button
                    key={ev._id}
                    type="button"
                    onClick={() => pickEvent(ev)}
                    style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: '1px solid #334155', background: '#0b0f19', color: '#e5e7eb', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 800 }}>{ev.title || 'Evento sin título'}</div>
                    {ev.startAt && (
                      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
                        {fmtRange(ev.startAt, ev.endAt)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {eventsState === 'missing' && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px dashed #f59e0b', fontSize: 14 }}>
                Pendiente de endpoint: el servidor todavía no ofrece la lista de eventos
                (GET /api/checkin/events). Puedes escanear sin evento fijado.
              </div>
            )}

            {eventsState === 'unauthorized' && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid #ef4444', fontSize: 14 }}>
                La clave no es válida o se ha regenerado. Pide la clave actual al responsable del local.
              </div>
            )}

            {eventsState === 'error' && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid #ef4444', fontSize: 14 }}>
                No se pudieron cargar los eventos. Comprueba la conexión.{' '}
                <button type="button" onClick={() => loadEvents(key)} className="nv-link-accent" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                  Reintentar
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {(eventsState === 'missing' || eventsState === 'error') && (
                <button
                  type="button"
                  onClick={skipEvent}
                  style={{ padding: '8px 12px', borderRadius: 8, background: '#f59e0b', color: '#001015', border: 0, fontWeight: 800 }}
                >
                  Escanear sin evento fijado
                </button>
              )}
              <button type="button" onClick={changeKey} style={{ background: 'none', border: 0, padding: 0, fontSize: 13, opacity: 0.7, textDecoration: 'underline', color: 'inherit', cursor: 'pointer' }}>
                Cambiar clave
              </button>
            </div>
          </div>
        )}

        {phase === 'scan' && key && (
          <>
            <div className="nv-card" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {event
                  ? <>Escaneando: {event.title || 'evento seleccionado'}</>
                  : <span style={{ color: '#f59e0b' }}>Sin evento fijado</span>}
              </div>
              <button
                type="button"
                onClick={changeEvent}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: 'inherit', fontSize: 13, cursor: 'pointer' }}
              >
                {event ? 'Cambiar evento' : 'Elegir evento'}
              </button>
            </div>

            <div className="nv-card" style={{ padding: 14 }}>
              <ScannerCheckin backendBase={backend} scannerKey={key} eventId={event?._id || ''} />
            </div>

            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button type="button" onClick={changeKey} style={{ background: 'none', border: 0, padding: 0, fontSize: 13, opacity: 0.6, textDecoration: 'underline', color: 'inherit', cursor: 'pointer' }}>
                Cambiar clave
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
