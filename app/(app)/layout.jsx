// app/(app)/layout.jsx
'use client';

import AppShell from '@/components/AppShell';


// Layout único para TODA el área privada (dashboard, eventos, crear, escáner, perfil).
// NO exportes nada más aquí.
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
