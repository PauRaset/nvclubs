'use client';
import RequireClub from '@/components/RequireClub';
import TopNav from '@/components/TopNav';
import AppShell from '@/components/AppShell';

export default function AppAreaLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
export default function AppLayout({ children }) {
  return (
    <RequireClub>
      <TopNav />
      <main style={{ padding: 24, color: '#e5e7eb', background: '#0b0f19', minHeight: '100vh' }}>
        {children}
      </main>
    </RequireClub>
  );
}
