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
            });
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
            });
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





/*// ScannerCheckin.jsx
import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function ScannerCheckin({ backendBase = "https://TU_BACKEND", scannerKey }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle, scanning, sending, ok, duplicate, invalid, error
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let active = true;

    async function startCamera() {
      try {
        setStatus("scanning");
        // deviceId undefined -> default camera (front/back chosen by device)
        await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (!active) return;
          if (result) {
            // Debounce same text within 1.5s
            const txt = result.getText?.() || result.text;
            if (!txt) return;
            if (lastScan && lastScan.text === txt && (Date.now() - lastScan.ts) < 1500) return;
            setLastScan({ text: txt, ts: Date.now() });
            handleQrText(txt);
          }
        });
      } catch (e) {
        console.error("Camera start error", e);
        setStatus("error");
        setMessage("No se pudo acceder a la cámara. Comprueba permisos y HTTPS.");
      }
    }

    startCamera();

    return () => {
      active = false;
      try { reader.reset(); } catch(_) {}
    };
  }, [scannerKey, backendBase]); // reinicia si cambian

  // Parse payload like: NV1:t=<token>&e=<eventId>&s=<hmac>
  function parsePayload(txt) {
    try {
      // tolerate URLEncoded or raw
      const raw = decodeURIComponent(txt.trim());
      const prefix = raw.startsWith("NV1:") ? "NV1:" : (raw.startsWith("NV1") ? "NV1:" : "");
      const payload = prefix ? raw.slice(prefix.length) : raw;
      const parts = new URLSearchParams(payload);
      const token = parts.get("t") || parts.get("token");
      const eventId = parts.get("e") || parts.get("event");
      const hmac = parts.get("s") || parts.get("sig") || parts.get("hmac");
      if (!token || !eventId || !hmac) return null;
      return { token, eventId, hmac };
    } catch (err) {
      return null;
    }
  }

  async function handleQrText(txt) {
    setStatus("sending");
    setMessage("Procesando...");
    const parsed = parsePayload(txt);
    if (!parsed) {
      setStatus("invalid");
      setMessage("QR no reconocido (formato incorrecto).");
      beep(200, 300);
      return;
    }

    try {
      const res = await fetch(`${backendBase.replace(/\/+$/, "")}/api/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scanner-key": scannerKey,
        },
        body: JSON.stringify({
          token: parsed.token,
          eventId: parsed.eventId,
          hmac: parsed.hmac,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        // server returned structured error
        setStatus("error");
        setMessage(json?.reason || json?.message || `Server error ${res.status}`);
        beep(100, 200);
        return;
      }

      // interpret response
      if (json.ok) {
        setStatus("ok");
        setMessage(`OK — entrada: ${json.serial || ""}`);
        beep(1000, 120); // long beep for success
      } else {
        // duplicate / invalid
        setStatus("invalid");
        setMessage(json.reason || "No válido");
        beep(200, 200);
      }
    } catch (err) {
      console.error("Checkin fetch error", err);
      setStatus("error");
      setMessage("Error de red. Comprueba la conexión.");
      beep(100, 200);
    } finally {
      // permitir reescan en 1.2s
      setTimeout(() => {
        setStatus("scanning");
        setMessage("");
      }, 1200);
    }
  }

  // simple beep via WebAudio
  function beep(freq = 440, duration = 150) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
        o.stop(ctx.currentTime + 0.03);
      }, duration);
    } catch (_) {}
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 12 }}>
      <h2>Escáner NightVibe</h2>
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
        <video ref={videoRef} style={{ width: "100%", height: "auto" }} />
        <div style={{
          position: "absolute", left: 12, top: 12, padding: "6px 10px",
          background: "rgba(0,0,0,0.45)", color: "#fff", borderRadius: 8
        }}>
          {status === "scanning" ? "Escaneando..." : status.toUpperCase()}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>Estado:</div>
        <div style={{ minHeight: 36 }}>{message || (status === "scanning" ? "Apunta el QR" : status)}</div>

        <div style={{ marginTop: 10 }}>
          <button onClick={() => { setStatus("scanning"); setMessage(""); }} style={{ marginRight: 8 }}>Reintentar</button>
          <a href="#" onClick={(e)=>{e.preventDefault(); window.location.reload();}}>Reiniciar cámara</a>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
          <div>Endpoint: <code>{backendBase.replace(/\/+$/, "")}/api/checkin</code></div>
          <div>Cabecera: <code>x-scanner-key: {scannerKey ? "**** (configurada)" : "(falta)"}</code></div>
        </div>
      </div>
    </div>
  );
}*/
