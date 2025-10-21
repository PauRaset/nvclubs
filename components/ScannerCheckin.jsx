// components/ScannerCheckin.jsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';


const parseNV1 = (txt) => {
  const clean = txt.startsWith('NV1:') ? txt.slice(4) : txt;
  const qp = new URLSearchParams(clean);
  const token = qp.get('t') || qp.get('token');
  const eventId = qp.get('e') || qp.get('event') || qp.get('eventId');
  const hmac = qp.get('s') || qp.get('sig') || qp.get('signature');
  if (!token || !eventId || !hmac) return null;
  return { token, eventId, hmac };
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
  const c = { success:'#22c55e', warn:'#f59e0b', error:'#ef4444', info:'#0ea5e9' }[type];
  return (
    <div style={{position:'absolute',top:12,left:12,padding:'6px 10px',background:c,color:'#001015',borderRadius:8,fontWeight:800}}>
      {children}
    </div>
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

  const colorBy = { scanning:'#1f2937', posting:'#0ea5e9', success:'#22c55e', duplicate:'#f59e0b', invalid:'#ef4444', badsig:'#ef4444', error:'#ef4444' };
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
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.45)',padding:16}}>
        <div style={{width:'100%',maxWidth:520,background:'#0b0f19',borderRadius:16,border:`2px solid ${color}`,boxShadow:'0 10px 40px rgba(0,0,0,.45)'}}>
          <div style={{padding:18,borderBottom:'1px solid #1e293b',display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:10,height:10,borderRadius:999,background:color}} />
            <div style={{fontWeight:900,color:'#e5e7eb'}}>{titleBy[status]}</div>
          </div>

          <div style={{padding:18,color:'#cbd5e1',lineHeight:1.35}}>
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
            <div style={{opacity:.9}}>{noteBy[status]}</div>
          </div>

          <div style={{padding:14,borderTop:'1px solid #1e293b',display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={resumeScan}
                    style={{padding:'10px 14px',borderRadius:10,background:'#0ea5e9',color:'#001015',border:0,fontWeight:900}}>
              Escanear siguiente (↵)
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{background:'#0b0f19',border:'1px solid #1e293b',borderRadius:12,overflow:'hidden'}}>
      <div style={{position:'relative',aspectRatio:'4 / 3',background:'#000'}}>
        {status==='scanning' && <Banner type="info">Escaneando…</Banner>}
        {status==='posting'  && <Banner type="info">Verificando…</Banner>}
        {status==='success'  && <Banner type="success">OK</Banner>}
        {status==='duplicate'&& <Banner type="warn">DUPLICADO</Banner>}
        {['invalid','badsig','error'].includes(status) && <Banner type="error">ERROR</Banner>}
        <video ref={videoRef} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}} />
        <Card />
      </div>

      <div style={{padding:12,color:'#9ca3af',fontSize:14}}>
        <div style={{marginBottom:6}}><b>Estado:</b> {message}</div>
        <div style={{display:'flex',gap:12}}>
          <button
            onClick={resumeScan}
            disabled={status==='scanning'||status==='posting'}
            style={{padding:'8px 12px',background:'#0ea5e9',color:'#001015',border:0,borderRadius:8,fontWeight:800,
                    opacity:(status==='scanning'||status==='posting')?0.6:1}}
          >
            Escanear siguiente
          </button>
        </div>
        <div style={{marginTop:10,fontSize:12,opacity:.7}}>
          Endpoint: {endpoint}<br />
          Cabecera x-scanner-key: {scannerKey ? '(configurada)' : '(falta)'}
        </div>
      </div>
    </div>
  );
}
