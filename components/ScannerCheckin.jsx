// components/ScannerCheckin.jsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

const parseNV1 = (txt) => {
  const m = txt.match(/^NV1[:?]/i) ? txt.replace(/^NV1[:?]/i, '') : null;
  const q = new URLSearchParams((m ?? txt).replace(/^NV1[:?]/i, ''));
  const token = q.get('t') || q.get('token');
  const eventId = q.get('e') || q.get('event') || q.get('eventId');
  const hmac = q.get('s') || q.get('sig') || q.get('signature');
  if (!token || !eventId || !hmac) return null;
  return { token, eventId, hmac };
};

const Banner = ({ type = 'info', children }) => {
  const colors = { success: '#16a34a', warn: '#f59e0b', error: '#ef4444', info: '#38bdf8' };
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, padding: '6px 10px',
      background: colors[type], color: '#001015', borderRadius: 8, fontWeight: 800
    }}>
      {children}
    </div>
  );
};

export default function ScannerCheckin({ backendBase = 'https://api.nightvibe.life', scannerKey }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const loopRef = useRef(null);

  const [status, setStatus] = useState('scanning'); // scanning | posting | success | duplicate | invalid | badsig | error
  const [message, setMessage] = useState('Apunta el QR');
  const [last, setLast] = useState(null);           // {serial,status,checkedInAt,eventId}

  const endpoint = `${(backendBase || '').replace(/\/+$/, '')}/api/checkin`;
  const hasKey = !!scannerKey;

  // Iniciar cámara + bucle de lectura
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try { readerRef.current?.stop(); } catch {}
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setStatus('scanning');
      setMessage('Apunta el QR');

      // Cámara
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (_) {
        setStatus('error'); setMessage('No se pudo iniciar la cámara');
        return;
      }

      const loop = async () => {
        if (cancelled || status !== 'scanning') return;
        try {
          const res = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current);
          if (!res || !res.getText) return requestAnimationFrame(loop);

          const parsed = parseNV1(res.getText());
          if (!parsed) {
            setStatus('error'); setMessage('Código no válido');
            navigator.vibrate?.(150);
            return; // esperamos a que el usuario pulse "Escanear siguiente"
          }

          setStatus('posting'); setMessage('Verificando…');
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-scanner-key': scannerKey || '' },
            body: JSON.stringify(parsed),
          });
          const data = await r.json().catch(() => ({}));

          if (r.status === 401) {
            setStatus('error'); setMessage('No autorizado (x-scanner-key)');
            return;
          }

          if (r.ok && data?.ok) {
            setStatus('success'); setMessage('Entrada válida');
            setLast({ serial: data.serial, status: data.status, checkedInAt: data.checkedInAt || new Date().toISOString(), eventId: parsed.eventId });
            navigator.vibrate?.([40, 60, 40]);
            return; // se queda en la tarjeta hasta que pulsen "Escanear siguiente"
          }

          const reason = (data?.reason || '').toLowerCase();
          if (reason === 'duplicate') {
            setStatus('duplicate'); setMessage('Ya usado');
            setLast({ serial: data.serial, status: 'checked_in', checkedInAt: data.checkedInAt, eventId: parsed.eventId });
            navigator.vibrate?.([160, 80, 160]);
            return;
          }
          if (reason === 'bad_signature') {
            setStatus('badsig'); setMessage('Firma inválida (QR)'); navigator.vibrate?.(220); return;
          }
          if (reason === 'invalid') {
            setStatus('invalid'); setMessage('Entrada no encontrada'); navigator.vibrate?.(180); return;
          }

          setStatus('error'); setMessage('Error de verificación'); navigator.vibrate?.(200);
        } catch {
          if (status === 'scanning') requestAnimationFrame(loop);
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

  // Handler para volver a escanear
  const resumeScan = () => {
    setLast(null);
    setStatus('scanning');
    setMessage('Apunta el QR');
    // reanudar el bucle inmediatamente
    loopRef.current && requestAnimationFrame(loopRef.current);
  };

  // Atajo: Enter para escanear siguiente
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && status !== 'scanning' && status !== 'posting') resumeScan();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status]);

  const colorByStatus = {
    scanning: '#1f2937',
    posting:  '#0ea5e9',
    success:  '#22c55e',
    duplicate:'#f59e0b',
    invalid:  '#ef4444',
    badsig:   '#ef4444',
    error:    '#ef4444',
  };

  const Card = () => {
    if (!['success','duplicate','invalid','badsig','error'].includes(status)) return null;
    const title = {
      success:  'Entrada válida',
      duplicate:'Entrada ya usada',
      invalid:  'Entrada no encontrada',
      badsig:   'QR no válido (firma)',
      error:    'Error',
    }[status];

    const note = {
      success:  '¡Listo! Puedes pasar.',
      duplicate:'No permitir acceso. Enseña al cliente la hora del primer check-in.',
      invalid:  'No se encontró este código para este evento.',
      badsig:   'Este QR no fue emitido por NightVibe (o la clave cambió).',
      error:    'Comprueba la red y vuelve a intentar.',
    }[status];

    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.45)', padding: 16
      }}>
        <div style={{
          width: '100%', maxWidth: 520, background: '#0b0f19', borderRadius: 16,
          border: `2px solid ${colorByStatus[status]}`, boxShadow: '0 10px 40px rgba(0,0,0,.45)'
        }}>
          <div style={{ padding: 18, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: colorByStatus[status] }} />
            <div style={{ fontWeight: 900, color: '#e5e7eb' }}>{title}</div>
          </div>

          <div style={{ padding: 18, color: '#cbd5e1', lineHeight: 1.35 }}>
            {last?.serial && <div style={{ marginBottom: 8 }}><b>Serial:</b> {last.serial}</div>}
            {last?.eventId && <div style={{ marginBottom: 8 }}><b>Evento:</b> {last.eventId}</div>}
            {last?.checkedInAt && status !== 'success' && (
              <div style={{ marginBottom: 8 }}><b>Primer check-in:</b> {new Date(last.checkedInAt).toLocaleString()}</div>
            )}
            <div style={{ opacity: .9 }}>{note}</div>
          </div>

          <div style={{ padding: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #1e293b' }}>
            <button
              onClick={resumeScan}
              style={{ padding: '10px 14px', borderRadius: 10, background: '#0ea5e9',
                       color: '#001015', border: 0, fontWeight: 900 }}
            >
              Escanear siguiente (↵)
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#000' }}>
        {status === 'scanning' && <Banner type="info">Escaneando…</Banner>}
        {status === 'posting' && <Banner type="info">Verificando…</Banner>}
        {status === 'success' && <Banner type="success">OK</Banner>}
        {status === 'duplicate' && <Banner type="warn">DUPLICADO</Banner>}
        {['invalid','badsig','error'].includes(status) && <Banner type="error">ERROR</Banner>}

        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Card />
      </div>

      <div style={{ padding: 12, color: '#9ca3af', fontSize: 14 }}>
        <div style={{ marginBottom: 6 }}><b>Estado:</b> {message}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={resumeScan}
            disabled={status === 'scanning' || status === 'posting'}
            style={{ padding: '8px 12px', background: '#0ea5e9', color: '#001015',
                     border: 0, borderRadius: 8, fontWeight: 800, opacity: (status==='scanning'||status==='posting')?0.6:1 }}
          >
            Escanear siguiente
          </button>
          <button
            onClick={() => {
              try { readerRef.current?.stop(); } catch {}
              setTimeout(() => {
                setStatus('scanning'); setMessage('Apunta el QR');
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                  .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; });
                loopRef.current && requestAnimationFrame(loopRef.current);
              }, 150);
            }}
            style={{ padding: '8px 12px', background: '#111827', color: '#e5e7eb',
                     border: '1px solid #334155', borderRadius: 8, fontWeight: 700 }}
          >
            Reiniciar cámara
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: .7 }}>
          Endpoint: {endpoint}<br/>
          Cabecera x-scanner-key: {hasKey ? '(configurada)' : '(falta)'}
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
