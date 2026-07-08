'use client';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, children, style = {}, activeStyle = {}, exact = false }) {
  const pathname = usePathname() || '/';
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  const base = {
    padding: '8px 10px',
    borderRadius: 8,
    background: 'var(--nv-surface)',
    color: 'var(--nv-text)',
    textDecoration: 'none',
    display: 'inline-block',
    border: '1px solid var(--nv-border-strong)',
    ...style,
  };

  const active = isActive
    ? { background: 'var(--nv-grad-accent)', color: 'var(--nv-accent-ink)', fontWeight: 700, borderColor: 'var(--nv-accent-border)', ...activeStyle }
    : {};

  return (
    <a href={href} style={{ ...base, ...active }}>
      {children}
    </a>
  );
}
