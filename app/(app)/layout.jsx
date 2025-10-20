// app/(app)/layout.jsx
'use client';

import AppShell from '@/components/AppShell';

// app/(app)/layout.jsx (o app/layout.jsx)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // opcional, para notches
};
// Layout único para TODA el área privada (dashboard, eventos, crear, escáner, perfil).
// NO exportes nada más aquí.
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
