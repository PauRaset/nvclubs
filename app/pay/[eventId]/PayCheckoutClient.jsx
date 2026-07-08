"use client";

import { useMemo, useState } from "react";

export default function PayCheckoutClient({
  eventId,
  apiBase,
  maxQty = 10,
  defaultQty = 1,
}) {
  const [qty, setQty] = useState(defaultQty);
  const [redirecting, setRedirecting] = useState(false);

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(maxQty, q + 1));

  const target = useMemo(() => {
    return `${apiBase}/api/payments/direct/${eventId}?qty=${qty}`;
  }, [apiBase, eventId, qty]);

  const goPay = () => {
    setRedirecting(true);
    window.location.href = target;
  };

  return (
    <main className="nv-page">
      <div className="nv-shell" style={{ placeItems: "center" }}>
        <div className="nv-card" style={{ width: "100%", maxWidth: 520 }}>
          <h1 className="nv-h3">Selecciona cantidad</h1>

          <div className="nv-row" style={{ marginTop: 16, flexWrap: "nowrap" }}>
            <button
              type="button"
              onClick={dec}
              className="nv-btn nv-btn-ghost nv-btn-icon"
              aria-label="Disminuir cantidad"
            >
              –
            </button>

            <div
              style={{
                minWidth: 46,
                textAlign: "center",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {qty}
            </div>

            <button
              type="button"
              onClick={inc}
              className="nv-btn nv-btn-ghost nv-btn-icon"
              aria-label="Aumentar cantidad"
            >
              +
            </button>

            <span className="nv-small nv-muted" style={{ marginLeft: "auto" }}>
              Máx. {maxQty}
            </span>
          </div>

          <button
            type="button"
            onClick={goPay}
            disabled={redirecting}
            className="nv-btn nv-btn-primary nv-btn-block"
            style={{ marginTop: 18 }}
          >
            {redirecting
              ? "Redirigiendo…"
              : `Comprar ${qty} entrada${qty > 1 ? "s" : ""}`}
          </button>

          {redirecting && (
            <p role="status" aria-live="polite" className="nv-notice nv-notice-info" style={{ marginTop: 12 }}>
              Te estamos llevando al Checkout de Stripe…
            </p>
          )}

          <p className="nv-small nv-muted" style={{ marginTop: 12 }}>
            Te llevará al Checkout de Stripe. La comisión se calcula por entrada
            (si compras {qty}, se aplica {qty}×).
          </p>
        </div>
      </div>
    </main>
  );
}
