// app/(app)/purchase/success/page.jsx
export const dynamic = 'force-dynamic'; // evita prerender estático
export const revalidate = 0;

import { Suspense } from 'react';
import SuccessClient from './success-client';

export default function Page() {
  return (
    <Suspense fallback={
      <main style={styles.main}>
        <h1>Procesando pago…</h1>
        <p>Confirmando tu compra y generando entradas.</p>
      </main>
    }>
      <SuccessClient />
    </Suspense>
  );
}

const styles = {
  main: { minHeight:'100vh', background:'#0b0f19', color:'#e5e7eb', padding:'40px 24px' },
};
