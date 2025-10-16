// ScannerCheckin.jsx
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
}
