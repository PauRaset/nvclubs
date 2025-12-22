"use client";

import { useMemo, useState } from "react";

export default function PayCheckoutClient({
  eventId,
  apiBase,
  maxQty = 10,
  defaultQty = 1,
}) {
  const [qty, setQty] = useState(defaultQty);

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(maxQty, q + 1));

  const target = useMemo(() => {
    return `${apiBase}/api/payments/direct/${eventId}?qty=${qty}`;
  }, [apiBase, eventId, qty]);

  const goPay = () => {
    window.location.href = target;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b12",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 20,
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, opacity: 0.9 }}>
          Selecciona cantidad
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 16,
          }}
        >
          <button
            onClick={dec}
            style={btnStyle}
            aria-label="Disminuir cantidad"
          >
            –
          </button>

          <div
            style={{
              minWidth: 46,
              textAlign: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {qty}
          </div>

          <button
            onClick={inc}
            style={btnStyle}
            aria-label="Aumentar cantidad"
          >
            +
          </button>

          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 13 }}>
            Máx. {maxQty}
          </div>
        </div>

        <button
          onClick={goPay}
          style={{
            width: "100%",
            marginTop: 18,
            padding: "14px 16px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 16,
            background: "#00e5ff",
            color: "#0b0b12",
          }}
        >
          Comprar {qty} entrada{qty > 1 ? "s" : ""}
        </button>

        <p style={{ marginTop: 12, opacity: 0.65, fontSize: 12, lineHeight: 1.4 }}>
          Te llevará al Checkout de Stripe. La comisión se calcula por entrada
          (si compras {qty}, se aplica {qty}×).
        </p>
      </div>
    </main>
  );
}

const btnStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontSize: 22,
  fontWeight: 900,
};
