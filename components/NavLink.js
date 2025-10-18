'use client';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, children, style = {}, activeStyle = {}, exact = false }) {
  const pathname = usePathname() || '/';
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  const base = {
    padding: '8px 10px',
    borderRadius: 8,
    background: '#111827',
    color: '#e5e7eb',
    textDecoration: 'none',
    display: 'inline-block',
    border: '1px solid #303848',
    ...style,
  };

  const active = isActive
    ? { background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#001018', fontWeight: 700, borderColor: '#0ea5e9', ...activeStyle }
    : {};

  return (
    <a href={href} style={{ ...base, ...active }}>
      {children}
    </a>
  );
}
