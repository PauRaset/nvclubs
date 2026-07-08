import Link from 'next/link';

export default function PurchaseCancelPage() {
  return (
    <div className="nv-views">
      <div className="nv-empty">
        <div className="nv-empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="nv-empty-title">Pago cancelado</h1>
        <p className="nv-empty-text">No se ha realizado ningún cargo.</p>
        <div className="nv-row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link href="/events" className="nv-btn nv-btn-secondary">Volver a eventos</Link>
        </div>
      </div>
    </div>
  );
}
