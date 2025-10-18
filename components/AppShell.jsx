'use client';
import TopNav from './TopNav';

export default function AppShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.08) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.08) 0, transparent 60%), #0b0f19' }}>
      <TopNav />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        {children}
      </div>
    </div>
  );
}
