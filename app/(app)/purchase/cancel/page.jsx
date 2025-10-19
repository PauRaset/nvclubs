'use client';
import Link from 'next/link';

export default function PurchaseCancelPage() {
  return (
    <main style={styles.main}>
      <h1>Pago cancelado</h1>
      <p style={{opacity:.85}}>No se ha realizado ningún cargo.</p>
      <div style={{display:'flex', gap:12}}>
        <Link href="/events" style={styles.cta}>Volver a eventos</Link>
      </div>
    </main>
  );
}

const styles = {
  main: { minHeight:'100vh', background:'#0b0f19', color:'#e5e7eb', padding:'40px 24px', display:'flex', flexDirection:'column', gap:16 },
  cta: { background:'#1f2937', border:'1px solid #374151', color:'#e5e7eb', padding:'10px 14px', borderRadius:10, textDecoration:'none', fontWeight:700 }
};