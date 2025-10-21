'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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
                {it.label}
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

        <style jsx>{`
          :global(:root) {
            --nv-bg: #0b1220;
            --nv-panel: #0f172a;
            --nv-border: #243044;
            --nv-text: #e6f0ff;
            --nv-muted: #a7b3c8;
            --nv-accent: #00e5ff;
          }
          .nv-nav {
            position: sticky;
            top: 0;
            z-index: 40; /* slightly lower than overlay/drawer */
            background: color-mix(in oklab, var(--nv-bg) 90%, black 10%);
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
            padding: 8px 10px;
            border-radius: 10px;
            color: var(--nv-muted);
            text-decoration: none;
            border: 1px solid transparent;
          }
          .nv-link:hover {
            color: var(--nv-text);
            border-color: var(--nv-border);
            background: var(--nv-panel);
          }
          .nv-link.is-active {
            color: #001018;
            background: var(--nv-accent);
            border-color: transparent;
            font-weight: 800;
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
            justify-self: end;
          }

          /* Breakpoint: desktop desde 900px */
          @media (min-width: 900px) {
            .nv-container { grid-template-columns: auto auto 1fr; }
            .nv-links { display: inline-flex; grid-column: 3; justify-self: end; margin-left: auto; justify-content: flex-end; }
            .nv-burger { display: none; }
            .nv-left { grid-column: 1; }
          }
        `}</style>
      </header>

      {/* Overlay + drawer (fuera del header para evitar stacking/containing block issues) */}
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
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Estilos globales para overlay/drawer (no anidados al header) */}
      <style jsx global>{`
        .nv-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.96); /* más opaco */
          opacity: 0; pointer-events: none;
          transition: opacity .2s ease;
          z-index: 90; /* por encima del header */
        }
        .nv-overlay.show { opacity: 1; pointer-events: auto; }

        .nv-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(86vw, 360px);
          background: var(--nv-panel);
          color: var(--nv-text);
          border-left: 1px solid var(--nv-border);
          transform: translateX(100%);
          transition: transform .25s ease;
          display: grid; grid-template-rows: auto 1fr;
          z-index: 95; /* por encima del overlay */
          padding-bottom: env(safe-area-inset-bottom);
        }
        .nv-drawer.open { transform: translateX(0); }
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
          display: block;
          padding: 12px 12px;
          border-radius: 12px;
          color: var(--nv-text);
          text-decoration: none;
          border: 1px solid var(--nv-border);
          background: #0b1424;
        }
        .drawer-link.is-active {
          background: var(--nv-accent);
          color: #001018;
          border-color: transparent;
          font-weight: 800;
        }

        @media (min-width: 900px) {
          .nv-overlay, .nv-drawer { display: none; }
        }
      `}</style>
    </>
  );
}
