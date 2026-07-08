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

// --- Helpers to resolve club name on the client if backend didn't send it ---
const _safeBase = (b) => (b || '').replace(/\/+$/, '');

async function fetchJson(url) {
  try {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function resolveClubNameClient(backendBase, eventId) {
  if (!backendBase || !eventId) return '';
  const base = _safeBase(backendBase);

  // 1) Intenta obtener el propio evento
  const evRes = await fetchJson(`${base}/api/events/${encodeURIComponent(eventId)}`);
  // Formatos posibles según tu API: { event: { ... } } o el evento plano
  const ev = evRes?.event || evRes;

  if (!ev || typeof ev !== 'object') return '';

  // a) Si el endpoint del evento ya trae club.name:
  if (ev.club?.name) return ev.club.name;

  // b) Si trae clubId -> buscar el club por id
  if (ev.clubId) {
    const clubs = await fetchJson(`${base}/api/clubs?id=${encodeURIComponent(ev.clubId)}`);
    if (Array.isArray(clubs) && clubs.length && clubs[0]?.name) return clubs[0].name;
  }

  // c) Si no, buscar por ownerUserId/createdBy
  const createdBy = ev.createdBy?._id || ev.createdBy || '';
  if (createdBy) {
    const clubsByOwner = await fetchJson(`${base}/api/clubs?ownerUserId=${encodeURIComponent(createdBy)}`);
    if (Array.isArray(clubsByOwner) && clubsByOwner.length && clubsByOwner[0]?.name) return clubsByOwner[0].name;
  }

  return '';
}

const Banner = ({ type='info', children }) => {
  const cls = {
    success: 'nv-badge nv-badge-success',
    warn: 'nv-badge nv-badge-warn',
    error: 'nv-badge nv-badge-danger',
    info: 'nv-badge',
  }[type] || 'nv-badge';
  return (
    <span className={cls} style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
      {children}
    </span>
  );
};

export default function ScannerCheckin({ backendBase='https://api.nightvibe.life', scannerKey }) {
  const endpoint = `${(backendBase||'').replace(/\/+$/,'')}/api/checkin`;
  const apiBase = (backendBase || '').replace(/\/+$/, '');

  const videoRef  = useRef(null);
  const readerRef = useRef(null);
  const loopRef   = useRef(null);
  const statusRef = useRef('scanning');

  const [status, setStatus] = useState('scanning'); // scanning | posting | success | duplicate | invalid | badsig | error
  const [message, setMessage] = useState('Apunta el QR');
  const [last, setLast] = useState(null); // { serial, status, checkedInAt, eventId, buyerName, buyerEmail }

  const setStatusSafe = (s) => { statusRef.current = s; setStatus(s); };

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
        setStatusSafe('error'); setMessage('No se pudo iniciar la cámara');
        return;
      }

      // Bucle de lectura controlado por statusRef
      const loop = async () => {
        if (cancelled) return;
        if (statusRef.current !== 'scanning') return; // <- clave: nunca seguimos si no estamos escaneando

        try {
          const res = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current);
          if (!res?.getText) {
            // Relanzamos solo si seguimos en modo scanning
            if (statusRef.current === 'scanning') requestAnimationFrame(loop);
            return;
          }

          const parsed = parseNV1(res.getText());
          if (!parsed) {
            setStatusSafe('error'); setMessage('Código no válido');
            navigator.vibrate?.(150);
            return; // NO reanudamos: el usuario decide cuándo con el botón
          }

          setStatusSafe('posting'); setMessage('Verificando…');

          const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-scanner-key': scannerKey || '' },
            body: JSON.stringify(parsed),
          });
          const data = await r.json().catch(() => ({}));

          if (r.status === 401) { setStatusSafe('error'); setMessage('No autorizado (x-scanner-key)'); return; }

          if (r.ok && data?.ok) {
            setStatusSafe('success'); setMessage('Entrada válida');
            setLast({
              serial: data.serial,
              status: data.status,
              checkedInAt: data.checkedInAt || new Date().toISOString(),
              eventId: parsed.eventId,
              buyerName: data.buyerName || '',
              buyerEmail: data.buyerEmail || '',
              clubName: data.clubName || '',
            });
            // Resolver nombre del club en cliente si no vino del backend
            if (!data.clubName) {
              resolveClubNameClient(apiBase, parsed.eventId).then((nm) => {
                if (nm) setLast((prev) => prev ? { ...prev, clubName: nm } : prev);
              });
            }
            navigator.vibrate?.([40,60,40]);
            return; // se queda en tarjeta
          }

          const reason = (data?.reason || '').toLowerCase();
          if (reason === 'duplicate') {
            setStatusSafe('duplicate'); setMessage('Ya usado');
            setLast({
              serial: data.serial,
              status: 'checked_in',
              checkedInAt: data.checkedInAt,
              eventId: parsed.eventId,
              buyerName: data.buyerName || '',
              buyerEmail: data.buyerEmail || '',
              clubName: data.clubName || '',
            });
            if (!data.clubName) {
              resolveClubNameClient(apiBase, parsed.eventId).then((nm) => {
                if (nm) setLast((prev) => prev ? { ...prev, clubName: nm } : prev);
              });
            }
            navigator.vibrate?.([160,80,160]);
            return;
          }
          if (reason === 'bad_signature') { setStatusSafe('badsig'); setMessage('Firma inválida'); navigator.vibrate?.(220); return; }
          if (reason === 'invalid')      { setStatusSafe('invalid'); setMessage('No encontrada'); navigator.vibrate?.(180); return; }

          setStatusSafe('error'); setMessage('Error de verificación'); navigator.vibrate?.(200);
        } catch {
          // Reintenta solo si seguimos escaneando
          if (statusRef.current === 'scanning') requestAnimationFrame(loop);
        }
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
  }, [backendBase, scannerKey]);

  const resumeScan = () => {
    setLast(null);
    setStatusSafe('scanning');
    setMessage('Apunta el QR');
    // reanuda explícitamente el loop
    loopRef.current && requestAnimationFrame(loopRef.current);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && statusRef.current !== 'scanning' && statusRef.current !== 'posting') resumeScan();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const colorBy = {
    scanning: 'var(--nv-border-strong)',
    posting: 'var(--nv-accent)',
    success: 'var(--nv-success)',
    duplicate: 'var(--nv-warn)',
    invalid: 'var(--nv-danger)',
    badsig: 'var(--nv-danger)',
    error: 'var(--nv-danger)',
  };
  const titleBy = { success:'Entrada válida', duplicate:'Entrada ya usada', invalid:'Entrada no encontrada', badsig:'QR no válido', error:'Error' };
  const noteBy  = {
    success:'¡Listo! Puedes pasar.',
    duplicate:'No permitir acceso. Muestra al cliente la hora del primer check-in.',
    invalid:'No se encontró este código para este evento.',
    badsig:'Este QR no fue emitido por NightVibe (o la clave cambió).',
    error:'Comprueba la red y vuelve a intentar.',
  };

  const Card = () => {
    if (!['success','duplicate','invalid','badsig','error'].includes(status)) return null;
    const color = colorBy[status];
    return (
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.55)',padding:16,zIndex:3}} role="dialog" aria-live="assertive">
        <div className="nv-card" style={{width:'100%',maxWidth:520,padding:0,overflow:'hidden',borderColor:color,borderWidth:2}}>
          <div style={{padding:18,borderBottom:'1px solid var(--nv-border)',display:'flex',gap:10,alignItems:'center'}}>
            <span style={{width:10,height:10,borderRadius:999,background:color,flex:'0 0 auto'}} />
            <div className="nv-h4">{titleBy[status]}</div>
          </div>

          <div style={{padding:18}}>
            <div className="nv-lead nv-small" style={{color:'var(--nv-text-soft)'}}>
              {last?.serial && <div style={{marginBottom:8}}><b>Serial:</b> {last.serial}</div>}
              {last?.eventId && <div style={{marginBottom:8}}><b>Evento:</b> {last.eventId}</div>}
              {(last?.buyerName || last?.buyerEmail) && (
                <div style={{marginBottom:8}}>
                  <b>Comprador:</b> {last.buyerName || last.buyerEmail}
                  {last?.buyerName && last?.buyerEmail ? ` · ${last.buyerEmail}` : ''}
                </div>
              )}
              <div style={{marginBottom:8}}>
                <b>Organizador:</b> {last?.clubName || last?.buyerName || last?.buyerEmail || '—'}
              </div>
              {last?.checkedInAt && status !== 'success' && (
                <div style={{marginBottom:8}}><b>Primer check-in:</b> {new Date(last.checkedInAt).toLocaleString()}</div>
              )}
            </div>
            <div className="nv-muted nv-small" style={{marginTop:6}}>{noteBy[status]}</div>
          </div>

          <div style={{padding:14,borderTop:'1px solid var(--nv-border)',display:'flex',justifyContent:'flex-end',gap:10}}>
            <button className="nv-btn nv-btn-primary" onClick={resumeScan}>
              Escanear siguiente (Enter)
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{position:'relative',aspectRatio:'4 / 3',background:'#000',borderRadius:'var(--nv-r-sm)',overflow:'hidden',border:'1px solid var(--nv-border)'}}>
        {status==='scanning' && <Banner type="info">Escaneando…</Banner>}
        {status==='posting'  && <Banner type="info">Verificando…</Banner>}
        {status==='success'  && <Banner type="success">OK</Banner>}
        {status==='duplicate'&& <Banner type="warn">Duplicado</Banner>}
        {['invalid','badsig','error'].includes(status) && <Banner type="error">Error</Banner>}
        <video ref={videoRef} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}} />
        <Card />
      </div>

      <div className="nv-card-soft" style={{marginTop:12,padding:14}}>
        <div className="nv-row" style={{justifyContent:'space-between'}}>
          <div className="nv-small"><b>Estado:</b> {message}</div>
          <span className={`nv-badge ${scannerKey ? 'nv-badge-success' : 'nv-badge-warn'}`}>
            {scannerKey ? 'Escáner listo' : 'Escáner no configurado'}
          </span>
        </div>
        <div style={{marginTop:12}}>
          <button
            className="nv-btn nv-btn-primary"
            onClick={resumeScan}
            disabled={status==='scanning'||status==='posting'}
          >
            Escanear siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
