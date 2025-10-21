'use client';


import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": "true" };
  switch (name) {
    case "events":
      return (
        <svg {...common}>
          <path d="M7 3v2M17 3v2M3 8h18M5 12h4m4 0h6M5 16h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z" fill="currentColor"/>
        </svg>
      );
    case "scanner":
      return (
        <svg {...common}>
          <path d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "profile":
    default:
      return (
        <svg {...common}>
          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" fill="currentColor"/>
        </svg>
      );
  }
}

export default function TopNav({ active, clubName }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el menú al cambiar de ruta o con ESC
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (open) {
      const prevRoot = root.style.overflow;
      const prevBody = body.style.overflow;
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      return () => { root.style.overflow = prevRoot; body.style.overflow = prevBody; };
    }
  }, [open]);

  const items = [
    { href: '/events', label: 'Eventos', key: 'events' },
    { href: '/dashboard', label: 'Panel', key: 'dashboard' },
    { href: '/scanner', label: 'Escáner', key: 'scanner' },
    { href: '/profile', label: 'Perfil', key: 'profile' },
  ];

  function isActive(href, key) {
    if (active && key) return active === key;
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="nv-nav">
        <div className="nv-container">
          {/* Left: logo */}
          <div className="nv-left">
            <Link href="/" className="nv-logo">
              <span className="nv-dot" /> {clubName || 'NightVibe'}
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="nv-links">
            {items.map(it => (
              <Link
                key={it.href}
                href={it.href}
                className={`nv-link ${isActive(it.href, it.key) ? 'is-active' : ''}`}
              >
                <span className="nv-ico"><Icon name={it.key} /></span>
                <span className="nv-text">{it.label}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button
            className="nv-burger"
            aria-label="Abrir menú"
            aria-expanded={open ? 'true' : 'false'}
            onClick={() => setOpen(v => !v)}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Overlay + drawer móvil (fuera del header para evitar stacking issues) */}
      <div
        className={`nv-overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`nv-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <span className="brand">
            <span className="nv-dot" /> {clubName || 'NightVibe'}
          </span>
          <button className="close" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav className="drawer-links">
          {items.map(it => (
            <Link
              key={it.href}
              href={it.href}
              className={`drawer-link ${isActive(it.href, it.key) ? 'is-active' : ''}`}
            >
              <span className="nv-ico"><Icon name={it.key} /></span>
              <span className="nv-text">{it.label}</span>
              <svg className="nv-arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          ))}
        </nav>
      </aside>

      {/* IMPORTANTE: Un SOLO bloque de styled-jsx para evitar el error de "nested styled-jsx tag" */}
      <style jsx>{`
        :global(:root) {
          --nv-bg: #0b1220;
          --nv-panel: #0f172a;
          --nv-border: #243044;
          --nv-text: #e6f0ff;
          --nv-muted: #a7b3c8;
          --nv-accent: #00e5ff;
        }

        /* Header */
        .nv-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          background: color-mix(in oklab, var(--nv-bg) 88%, black 12%);
          backdrop-filter: saturate(140%) blur(8px);
          border-bottom: 1px solid var(--nv-border);
        }
        .nv-container {
          height: 56px;
          padding: max(8px, env(safe-area-inset-top)) 16px 8px;
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
        }
        .nv-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          color: var(--nv-text);
          text-decoration: none;
          letter-spacing: .2px;
        }
        .nv-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--nv-accent);
          box-shadow: 0 0 18px var(--nv-accent);
          display: inline-block;
        }

        /* Desktop links */
        .nv-links {
          display: none;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          justify-content: flex-end;
        }
        .nv-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
          color: var(--nv-muted);
          text-decoration: none;
          border: 1px solid transparent;
          background: transparent;
          transition: transform .12s ease, background .12s ease, border-color .12s ease, color .12s ease, box-shadow .12s ease;
        }
        .nv-link:hover {
          color: var(--nv-text);
          border-color: var(--nv-border);
          background: color-mix(in oklab, var(--nv-panel) 85%, black 15%);
          box-shadow: 0 6px 18px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.03);
          transform: translateY(-1px);
        }
        .nv-link.is-active {
          color: #001018;
          background: linear-gradient(140deg, var(--nv-accent), #7cf7ff);
          border-color: transparent;
          box-shadow: 0 8px 24px rgba(0,229,255,.25);
          font-weight: 800;
        }

        .nv-ico {
          display: inline-flex;
          width: 20px;
          height: 20px;
          align-items: center;
          justify-content: center;
          opacity: .95;
        }
        .nv-text {
          letter-spacing: .2px;
          font-weight: 700;
        }

        /* Burger button (mobile) */
        .nv-burger {
          display: inline-flex;
          width: 40px; height: 40px;
          align-items: center; justify-content: center;
          border-radius: 10px;
          border: 1px solid var(--nv-border);
          background: var(--nv-panel);
          cursor: pointer;
          color: var(--nv-text);
          outline: none;
        }

        /* Overlay + Drawer (global para ocupar toda la pantalla) */
        :global(.nv-overlay) {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.96);
          opacity: 0; pointer-events: none;
          transition: opacity .2s ease;
          z-index: 90;
        }
        :global(.nv-overlay.show) { opacity: 1; pointer-events: auto; }

        :global(.nv-drawer) {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(86vw, 360px);
          background: var(--nv-panel);
          color: var(--nv-text);
          border-left: 1px solid var(--nv-border);
          transform: translateX(100%);
          transition: transform .25s ease;
          display: grid; grid-template-rows: auto 1fr;
          z-index: 95;
          padding-bottom: env(safe-area-inset-bottom);
        }
        :global(.nv-drawer.open) { transform: translateX(0); }
        .drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: calc(8px + env(safe-area-inset-top)) 14px 10px;
          border-bottom: 1px solid var(--nv-border);
        }
        .drawer-header .brand {
          display: inline-flex; align-items: center; gap: 8px; color: var(--nv-text); font-weight: 800;
        }
        .drawer-header .close {
          font-size: 28px; line-height: 1;
          border: 1px solid var(--nv-border);
          background: transparent; color: var(--nv-text);
          border-radius: 10px; width: 36px; height: 36px;
          cursor: pointer;
        }
        .drawer-links {
          padding: 12px;
          display: grid; gap: 8px;
        }
        .drawer-link {
          display: grid;
          grid-template-columns: 22px 1fr 18px;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          color: var(--nv-text);
          text-decoration: none;
          border: 1px solid var(--nv-border);
          background: #0b1424;
          transition: background .12s ease, border-color .12s ease, transform .12s ease;
        }
        .drawer-link:hover {
          background: color-mix(in oklab, var(--nv-panel) 86%, black 14%);
          border-color: color-mix(in oklab, var(--nv-border) 60%, white 40%);
          transform: translateX(1px);
        }
        .drawer-link.is-active {
          background: linear-gradient(140deg, var(--nv-accent), #7cf7ff);
          color: #001018;
          border-color: transparent;
          font-weight: 800;
        }
        .nv-arrow {
          justify-self: end;
          opacity: .8;
        }

        /* Breakpoint: desktop desde 900px */
        @media (min-width: 900px) {
          .nv-container { grid-template-columns: auto auto 1fr; }
          .nv-links { display: inline-flex; grid-column: 3; justify-self: end; margin-left: auto; justify-content: flex-end; }
          .nv-burger { display: none; }
          :global(.nv-overlay), :global(.nv-drawer) { display: none; }
          .nv-left { grid-column: 1; }
        }
      `}</style>
    </>
  );
}
