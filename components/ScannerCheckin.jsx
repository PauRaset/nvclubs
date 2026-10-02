// components/ScannerCheckin.jsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';


const parseNV1 = (txt) => {
  if (!txt) return null;

  let clean = String(txt).trim();

  // Nota: no registramos el contenido crudo del QR (contiene el token de la
  // entrada) para evitar fugas de datos sensibles en la consola del navegador.

  // --- Normalizar prefijo "NV1" (por si acaso) ---
  if (clean.startsWith('NV1')) {
    const firstSep = (() => {
      const i1 = clean.indexOf(':');
      const i2 = clean.indexOf('?');
      if (i1 === -1) return i2;
      if (i2 === -1) return i1;
      return Math.min(i1, i2);
    })();
    if (firstSep !== -1) {
      clean = clean.slice(firstSep + 1);
    } else {
      clean = clean.slice(3);
    }
    clean = clean.trim();
  }

  // --- Si viene como URL, nos quedamos con la query ---
  const qIndex = clean.indexOf('?');
  if (qIndex !== -1) {
    const maybeQuery = clean.slice(qIndex + 1);
    if (maybeQuery.includes('=')) {
      clean = maybeQuery;
    }
  }

  // Campos posibles
  let token   = null;
  let eventId = null;
  let hmac    = null;
  let serial  = null;

  // --- Intento 1: query string (t=...&e=...&s=...&serial=...) ---
  try {
    const qp = new URLSearchParams(clean);
    token   = qp.get('t')      || qp.get('token')  || token;
    eventId = qp.get('e')      || qp.get('event')  || qp.get('eventId') || eventId;
    hmac    = qp.get('s')      || qp.get('sig')    || qp.get('signature') || hmac;
    serial  = qp.get('serial') || serial;
  } catch {
    // seguimos probando
  }

  // --- Intento 2: JSON en el QR ---
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const obj = JSON.parse(clean);

      // Formato nuevo: { serial, token }
      if (obj.serial) serial = obj.serial;
      if (obj.token || obj.t) token = obj.token || obj.t;

      // Formato antiguo: { t, e, s } o variantes
      eventId = eventId || obj.e || obj.eventId || obj.event || null;
      hmac    = hmac    || obj.s || obj.sig     || obj.signature || null;
    } catch {
      // ignoramos error JSON
    }
  }

  // Necesitamos al menos el token para poder verificar el QR
  if (!token) {
    console.warn('[ScannerCheckin] no se pudo extraer un token válido del QR.');
    return null;
  }

  // eventId / hmac / serial son opcionales, se mandan por si el backend los quiere usar
  return { token, eventId, hmac, serial };
};

// --- Resultado: el color es el mensaje ---
const TONES = {
  ok:    { bg: '#15803d', fg: '#ffffff', icon: 'check' }, // verde intenso
  warn:  { bg: '#f59e0b', fg: '#1a1203', icon: 'clock' }, // ámbar
  error: { bg: '#b91c1c', fg: '#ffffff', icon: 'cross' }, // rojo
};

// Vibración por tono: toque corto, dos toques, uno largo.
const VIBRATION = { ok: 80, warn: [120, 100, 120], error: 600 };

const AUTO_RESUME_MS = 2000;

const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const dayFmt  = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const fmtCheckedIn = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Ya se registró antes';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `Entró a las ${timeFmt.format(d)}`
    : `Entró el ${dayFmt.format(d).replace(/\.$/, '')} a las ${timeFmt.format(d)}`;
};

// reason del backend -> pantalla. Los tres últimos son casos del propio escáner.
const REASONS = {
  ok:            { tone: 'ok',    title: 'PUEDE PASAR',      detail: (d) => d.tierName || '' },
  duplicate:     { tone: 'warn',  title: 'YA USADA',         detail: (d) => fmtCheckedIn(d.checkedInAt) },
  wrong_event:   { tone: 'error', title: 'OTRO EVENTO',      detail: (d) => `Esta entrada es de: ${d.eventTitle || 'otro evento'}` },
  wrong_club:    { tone: 'error', title: 'OTRO LOCAL',       detail: () => 'No es de este club' },
  event_ended:   { tone: 'error', title: 'EVENTO TERMINADO', detail: () => 'Esta entrada ya no es válida' },
  refunded:      { tone: 'error', title: 'REEMBOLSADA',      detail: () => 'Esta entrada fue devuelta' },
  bad_signature: { tone: 'error', title: 'QR FALSO',         detail: () => 'No lo ha emitido NightVibe' },
  invalid:       { tone: 'error', title: 'NO EXISTE',        detail: () => 'Esta entrada no está en el sistema' },
  rate_limited:  { tone: 'error', title: 'DEMASIADO RÁPIDO', detail: () => 'Espera un momento' },
  unauthorized:  { tone: 'error', title: 'CLAVE NO VÁLIDA',  detail: () => 'Pide una clave nueva al local' },
  unreadable:    { tone: 'error', title: 'QR NO RECONOCIDO', detail: () => 'No es una entrada de NightVibe' },
  network:       { tone: 'error', title: 'SIN CONEXIÓN',     detail: () => 'Comprueba la red y vuelve a intentar' },
  unknown:       { tone: 'error', title: 'NO VÁLIDA',        detail: () => '' },
};

// Construye el resultado a mostrar. `debug` solo se rellena con motivos desconocidos.
const buildResult = (reason, data = {}, parsed = {}, debug = '') => {
  const known = Object.prototype.hasOwnProperty.call(REASONS, reason);
  const def = known ? REASONS[reason] : REASONS.unknown;
  return {
    reason: known ? reason : 'unknown',
    tone: def.tone,
    title: def.title,
    detail: def.detail(data),
    serial: data.serial || parsed.serial || '',
    buyerName: data.buyerName || '',
    debug: known ? '' : (debug || reason || 'sin motivo'),
  };
};

const Banner = ({ type='info', children }) => {
  const c = { success:'#22c55e', warn:'#f59e0b', error:'#ef4444', info:'#0ea5e9' }[type];
  return (
    <div style={{position:'absolute',top:12,left:12,padding:'6px 10px',background:c,color:'#001015',borderRadius:8,fontWeight:800}}>
      {children}
    </div>
  );
};

const ResultIcon = ({ kind, color }) => {
  const common = { fill: 'none', stroke: color, strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" style={{ width: 'min(42vw, 30vh, 200px)', height: 'auto', display: 'block' }}>
      <circle cx="60" cy="60" r="52" {...common} strokeWidth={7} opacity={0.9} />
      {kind === 'check' && <path d="M36 62 L53 79 L86 44" {...common} />}
      {kind === 'clock' && <path d="M60 32 V60 L78 72" {...common} />}
      {kind === 'cross' && <path d="M40 40 L80 80 M80 40 L40 80" {...common} />}
    </svg>
  );
};

export default function ScannerCheckin({ backendBase='https://api.nightvibe.life', scannerKey, eventId: fixedEventId = '', onChangeKey }) {
  const endpoint = `${(backendBase||'').replace(/\/+$/,'')}/api/checkin`;

  const videoRef  = useRef(null);
  const readerRef = useRef(null);
  const loopRef   = useRef(null);
  const statusRef = useRef('scanning');

  const [status, setStatus] = useState('scanning'); // scanning | posting | result | camera_error
  const [message, setMessage] = useState('Apunta el QR');
  const [result, setResult] = useState(null); // ver buildResult

  const setStatusSafe = (s) => { statusRef.current = s; setStatus(s); };

  const showResult = (res) => {
    setResult(res);
    setStatusSafe('result');
    setMessage(res.title);
    navigator.vibrate?.(VIBRATION[res.tone]);
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try { readerRef.current?.stop(); } catch {}
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      setStatusSafe('scanning');
      setMessage('Apunta el QR');

      // Cámara
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setStatusSafe('camera_error'); setMessage('No se pudo iniciar la cámara');
        return;
      }

      // Bucle de lectura controlado por statusRef
      const loop = async () => {
        if (cancelled) return;
        if (statusRef.current !== 'scanning') return; // <- clave: nunca seguimos si no estamos escaneando

        let res;
        try {
          res = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current);
        } catch {
          // Reintenta solo si seguimos escaneando
          if (statusRef.current === 'scanning') requestAnimationFrame(loop);
          return;
        }
        if (cancelled) return;
        if (!res?.getText) {
          // Relanzamos solo si seguimos en modo scanning
          if (statusRef.current === 'scanning') requestAnimationFrame(loop);
          return;
        }

        const parsed = parseNV1(res.getText());
        if (!parsed) { showResult(buildResult('unreadable')); return; } // NO reanudamos: decide el portero

        setStatusSafe('posting'); setMessage('Verificando…');

        let r, data;
        try {
          r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-scanner-key': scannerKey || '' },
            // eventId = evento fijado por el portero (no el del QR). Sin evento fijado no se envía.
            body: JSON.stringify({ ...parsed, eventId: fixedEventId || undefined }),
          });
          data = await r.json().catch(() => ({}));
        } catch {
          if (!cancelled) showResult(buildResult('network', {}, parsed));
          return;
        }
        if (cancelled) return;

        if (r.ok && data?.ok) { showResult(buildResult('ok', data, parsed)); return; }

        let reason = String(data?.reason || '').toLowerCase();
        if (!reason && r.status === 401) reason = 'unauthorized';
        if (!reason && r.status === 429) reason = 'rate_limited';
        showResult(buildResult(reason, data, parsed, reason || `HTTP ${r.status}`));
      };

      loopRef.current = loop;
      requestAnimationFrame(loop);
    };

    start();
    return () => {
      cancelled = true;
      try { readerRef.current?.stop(); } catch {}
      const s = videoRef.current?.srcObject;
      if (s && typeof s.getTracks === 'function') s.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendBase, scannerKey, fixedEventId]);

  const resumeScan = () => {
    if (statusRef.current !== 'result') return;
    setResult(null);
    setStatusSafe('scanning');
    setMessage('Apunta el QR');
    // reanuda explícitamente el loop
    loopRef.current && requestAnimationFrame(loopRef.current);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && statusRef.current === 'result') { e.preventDefault(); resumeScan(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entrada válida: vuelve solo a escanear. El resto espera al portero.
  useEffect(() => {
    if (result?.tone !== 'ok') return;
    const t = setTimeout(resumeScan, AUTO_RESUME_MS);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const renderResult = () => {
    if (status !== 'result' || !result) return null;
    const tone = TONES[result.tone];
    const isOk = result.tone === 'ok';
    return (
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-label={`${result.title}${result.detail ? `. ${result.detail}` : ''}`}
        onClick={isOk ? resumeScan : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: tone.bg, color: tone.fg,
          display: 'flex', flexDirection: 'column',
          padding: 'max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))',
          overflowY: 'auto',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18, minHeight: 0 }}>
          <ResultIcon kind={tone.icon} color={tone.fg} />
          <div style={{ fontSize: 'clamp(38px, 12vw, 76px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.01em' }}>
            {result.title}
          </div>
          {result.detail && (
            <div style={{ fontSize: 'clamp(20px, 6vw, 30px)', fontWeight: isOk ? 900 : 700, lineHeight: 1.2, maxWidth: 560, overflowWrap: 'anywhere' }}>
              {result.detail}
            </div>
          )}
          {result.debug && (
            <div className="nv-mono" style={{ fontSize: 13, opacity: 0.8 }}>{result.debug}</div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 560, margin: '0 auto' }}>
          {(result.serial || result.buyerName) && (
            <div style={{ fontSize: 14, opacity: 0.85, textAlign: 'center', lineHeight: 1.4, overflowWrap: 'anywhere' }}>
              {result.buyerName && <div>{result.buyerName}</div>}
              {result.serial && <div className="nv-mono">{result.serial}</div>}
            </div>
          )}

          {isOk && (
            <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: tone.fg, transformOrigin: 'left', animation: `nvsCountdown ${AUTO_RESUME_MS}ms linear forwards` }} />
            </div>
          )}

          {result.reason === 'unauthorized' && onChangeKey && (
            <button type="button" className="nv-btn nv-btn-block" onClick={onChangeKey}
                    style={{ background: 'transparent', color: tone.fg, borderColor: 'currentColor' }}>
              Cambiar clave
            </button>
          )}

          <button type="button" className="nv-btn nv-btn-block" onClick={resumeScan}
                  style={{ minHeight: 64, fontSize: 20, background: 'rgba(0,0,0,.35)', color: '#ffffff', border: 0 }}>
            Escanear siguiente (↵)
          </button>
        </div>
        <style>{'@keyframes nvsCountdown{from{transform:scaleX(1)}to{transform:scaleX(0)}}'}</style>
      </div>
    );
  };

  return (
    <div style={{background:'#0b0f19',border:'1px solid #1e293b',borderRadius:12,overflow:'hidden'}}>
      <div style={{position:'relative',aspectRatio:'4 / 3',background:'#000'}}>
        {status==='scanning' && <Banner type="info">Escaneando…</Banner>}
        {status==='posting'  && <Banner type="info">Verificando…</Banner>}
        {status==='camera_error' && <Banner type="error">Sin cámara: revisa los permisos</Banner>}
        <video ref={videoRef} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}} />
      </div>
      {renderResult()}

      <div style={{padding:12,color:'#9ca3af',fontSize:14}}>
        <div style={{marginBottom:6}}><b>Estado:</b> {message}</div>
        <div style={{marginTop:10,fontSize:12,opacity:.7}}>
          Endpoint: {endpoint}<br />
          Cabecera x-scanner-key: {scannerKey ? '(configurada)' : '(falta)'}
        </div>
      </div>
    </div>
  );
}
