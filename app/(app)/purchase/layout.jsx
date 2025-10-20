// app/(app)/purchase/layout.jsx
export const dynamic = 'force-dynamic';

// Nota: este layout *reemplaza* la UI de la sección purchase.
// No incluye menús; sólo renderiza children.
export default function PurchaseLayout({ children }) {
  return <>{children}</>;
}
