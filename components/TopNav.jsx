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
    case "sales":
      return (
        <svg {...common}>
          <path d="M5 19V9M12 19V5M19 19v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "promotions":
      return (
        <svg {...common}>
          <path d="M9 7.5V6a2 2 0 1 1 4 0v1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="5" y="7.5" width="14" height="11.5" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 11.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "missions":
      return (
        <svg {...common}>
          <path d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.9L12 16.8 6.8 19.3l1-5.9L3.5 9.2l5.9-.9L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
          <path d="M21 15l-4.5-4.5L8 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "diffusion":
      return (
        <svg {...common}>
          <path d="M15 8a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM6 14a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm12 7a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" fill="currentColor"/>
          <path d="M8.6 12.5l4.2 2.1M12.8 7.4 8.2 9.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5z" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
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
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard', desktop: true, mobile: true },
    { href: '/events', label: 'Eventos', key: 'events', desktop: true, mobile: true },
    { href: '/promotions', label: 'Promociones', key: 'promotions', desktop: true, mobile: true },
    { href: '/scanner', label: 'Escáner', key: 'scanner', desktop: true, mobile: true },
    { href: '/promotions', label: 'Promociones', key: 'promotions', desktop: false, mobile: true },
    { href: '/missions', label: 'Misiones', key: 'missions', desktop: false, mobile: true },
    { href: '/content', label: 'Contenido', key: 'content', desktop: false, mobile: true },
    { href: '/diffusion', label: 'Difusión', key: 'diffusion', desktop: false, mobile: true },
    { href: '/profile', label: 'Perfil', key: 'profile', desktop: true, mobile: true },
    { href: '/settings', label: 'Ajustes', key: 'settings', desktop: false, mobile: true },
  ];

  const desktopItems = items.filter(item => item.desktop !== false);
  const mobileItems = items.filter(item => item.mobile !== false);

  function isActive(href, key) {
    if (active && key) return active === key;
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="nv-nav">
        <div className="nv-container">
          {/* Left: brand */}
          <div className="nv-left">
            <Link href="/dashboard" className="nv-logo" aria-label="Ir al dashboard">
              <span className="nv-badge">
                <span className="nv-badge-dot" />
              </span>
              <span className="nv-brand-wrap">
                <span className="nv-brand">{clubName || 'NightVibe'}</span>
                <span className="nv-brand-sub">Clubs panel</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="nv-links" aria-label="Navegación principal">
            {desktopItems.map(it => (
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

          {/* Mobile toggle (derecha) */}
          <button
            className="nv-burger"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="nv-drawer"
            onClick={() => setOpen(v => !v)}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Overlay + drawer móvil */}
      <div
        className={`nv-overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />
      <aside id="nv-drawer" className={`nv-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Menú">
        <div className="drawer-header">
          <span className="brand">
            <span className="nv-badge"><span className="nv-badge-dot" /></span>
            <span className="nv-brand-wrap">
              <span className="nv-brand">{clubName || 'NightVibe'}</span>
              <span className="nv-brand-sub">Clubs panel</span>
            </span>
          </span>
          <button className="close" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
        </div>

        <nav className="drawer-links" aria-label="Opciones">
          {mobileItems.map(it => (
            <Link
              key={it.href}
              href={it.href}
              className={`drawer-link ${isActive(it.href, it.key) ? 'is-active' : ''}`}
            >
              <span className="nv-ico"><Icon name={it.key} /></span>
              <span className="nv-text">{it.label}</span>
              <svg className="nv-arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Un SOLO bloque styled-jsx */}
      <style jsx>{`
        :global(:root) {
          --nv-bg: #0b1220;
          --nv-panel: #0f172a;
          --nv-border: #233146;
          --nv-text: #e7efff;
          --nv-muted: #a7b3c8;
          --nv-accent: #00e5ff;
          --nv-accent-2: #7cf7ff;
          --nv-glow: 0 0 22px rgba(0,229,255,.45);
        }

        /* Header */
        .nv-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          background: color-mix(in oklab, var(--nv-bg) 90%, black 10%);
          backdrop-filter: saturate(140%) blur(8px);
          border-bottom: 1px solid var(--nv-border);
        }
        .nv-container {
          min-height: 64px;
          padding: max(10px, env(safe-area-inset-top)) 18px 10px;
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
        }

        .nv-logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          min-width: 0;
        }

        .nv-brand-wrap {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .nv-badge {
          width: 24px; height: 24px;
          border-radius: 9px;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(145deg, rgba(0,229,255,.22), rgba(0,229,255,.06));
          border: 1px solid color-mix(in oklab, var(--nv-accent) 40%, transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05), var(--nv-glow);
        }
        .nv-badge-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--nv-accent);
          box-shadow: 0 0 12px var(--nv-accent);
          display: inline-block;
        }
        .nv-brand {
          color: var(--nv-text);
          font-weight: 900;
          letter-spacing: .2px;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }

        .nv-brand-sub {
          color: var(--nv-muted);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          line-height: 1;
        }

        /* Desktop links */
        .nv-links {
          display: none;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .nv-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          border-radius: 14px;
          color: var(--nv-muted);
          text-decoration: none;
          border: 1px solid transparent;
          background: transparent;
          transition: transform .12s ease, background .12s ease, border-color .12s ease, color .12s ease, box-shadow .12s ease;
          white-space: nowrap;
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
          background: linear-gradient(140deg, var(--nv-accent), var(--nv-accent-2));
          border-color: transparent;
          box-shadow: 0 10px 28px rgba(0,229,255,.24), inset 0 1px 0 rgba(255,255,255,.24);
          font-weight: 800;
        }
        .nv-ico { width: 21px; height: 21px; display: inline-flex; align-items: center; justify-content: center; opacity: .95; }
        .nv-text {
          letter-spacing: .2px;
          font-weight: 800;
          font-size: 14.5px;
          line-height: 1;
        }

        /* Burger */
        .nv-burger {
          display: inline-flex;
          width: 44px; height: 44px;
          align-items: center; justify-content: center;
          border-radius: 14px;
          border: 1px solid var(--nv-border);
          background: color-mix(in oklab, var(--nv-panel) 88%, black 12%);
          cursor: pointer;
          color: var(--nv-text);
          outline: none;
        }

        /* Overlay + Drawer */
        :global(.nv-overlay) {
          position: fixed; inset: 0;
          background: rgba(5,8,15,.96);
          opacity: 0; pointer-events: none;
          transition: opacity .2s ease;
          z-index: 90;
        }
        :global(.nv-overlay.show) { opacity: 1; pointer-events: auto; }

        :global(.nv-drawer) {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(86vw, 360px);
          background: color-mix(in oklab, var(--nv-panel) 96%, black 4%);
          color: var(--nv-text);
          border-left: 1px solid var(--nv-border);
          transform: translateX(100%);
          transition: transform .25s ease;
          display: grid; grid-template-rows: auto 1fr;
          z-index: 95;
          padding-bottom: env(safe-area-inset-bottom);
          box-shadow: -10px 0 36px rgba(0,0,0,.5);
        }
        :global(.nv-drawer.open) { transform: translateX(0); }

        .drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: calc(8px + env(safe-area-inset-top)) 14px 10px;
          border-bottom: 1px solid var(--nv-border);
        }
        .drawer-header .brand {
          display: inline-flex; align-items: center; gap: 10px;
          color: var(--nv-text); font-weight: 900;
          min-width: 0;
        }
        .drawer-header .close {
          font-size: 28px; line-height: 1;
          border: 1px solid var(--nv-border);
          background: transparent; color: var(--nv-text);
          border-radius: 10px; width: 36px; height: 36px;
          cursor: pointer;
        }

        .drawer-links {
          padding: 18px 16px 24px;
          display: grid; gap: 14px;
        }
        .drawer-link {
          --ring: color-mix(in oklab, var(--nv-accent) 55%, white 0%);
          --tile: color-mix(in oklab, var(--nv-panel) 90%, black 10%);
          display: grid;
          grid-template-columns: 26px 1fr 18px;
          align-items: center;
          gap: 16px;
          padding: 15px 17px;
          border-radius: 20px;
          color: var(--nv-text);
          text-decoration: none;
          position: relative;
          border: 1px solid color-mix(in oklab, var(--nv-accent) 28%, transparent);
          background: radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,.03) 0, transparent 50%), var(--tile);
          transition: background .14s ease, border-color .14s ease, transform .12s ease, box-shadow .14s ease, opacity .14s ease;
          box-shadow: 0 1px 0 rgba(255,255,255,.03), 0 10px 26px rgba(0,0,0,.28);
          -webkit-tap-highlight-color: transparent;
        }
        .drawer-link::after {
          content: "";
          position: absolute;
          right: 8px; top: 10px; bottom: 10px;
          width: 3px;
          border-radius: 2px;
          background: linear-gradient(180deg, transparent, color-mix(in oklab, var(--nv-accent) 60%, transparent), transparent);
          opacity: .35;
          transition: opacity .14s ease;
        }
        .drawer-link:hover {
          background: radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,.05) 0, transparent 55%), color-mix(in oklab, var(--nv-panel) 85%, black 15%);
          border-color: color-mix(in oklab, var(--nv-accent) 55%, white 10%);
          transform: translateX(3px);
          box-shadow: 0 2px 0 rgba(255,255,255,.04), 0 14px 32px rgba(0,0,0,.34);
        }
        .drawer-link:hover::after { opacity: .6; }
        .drawer-link.is-active {
          background: linear-gradient(140deg, color-mix(in oklab, var(--nv-accent) 90%, #7cf7ff 10%), #7cf7ff);
          color: #001018;
          border-color: transparent;
          font-weight: 900;
          transform: translateX(2px);
          box-shadow: 0 10px 30px rgba(0,229,255,.30), inset 0 1px 0 rgba(255,255,255,.35);
        }
        .drawer-link.is-active .nv-ico,
        .drawer-link.is-active .nv-arrow { opacity: .95; }

        /* Móvil: tipografía + hit area mayores */
        @media (max-width: 899px) {
          .drawer-link .nv-text {
            font-size: 18px;
            line-height: 1.25;
            letter-spacing: .2px;
            font-weight: 850;
          }
          .nv-ico { width: 22px; height: 22px; }
          .nv-arrow { width: 18px; height: 18px; }
          .drawer-header .brand { font-size: 17px; }
          .nv-brand { max-width: 180px; }
          .nv-burger { width: 44px; height: 44px; }
        }

        .nv-arrow { justify-self: end; opacity: .8; }
        .drawer-link:active { transform: translateX(2px) scale(.995); opacity: .98; }

        /* Desktop */
        @media (min-width: 900px) and (max-width: 1160px) {
          .nv-text {
            font-size: 13.5px;
          }
          .nv-link {
            padding: 8px 12px;
          }
          .nv-brand {
            max-width: 180px;
          }
        }

        @media (min-width: 900px) {
          .nv-container {
            grid-template-columns: auto 1fr auto;
          }
          .nv-links {
            display: inline-flex;
            grid-column: 2;
            justify-self: end;
            margin-left: auto;
            justify-content: flex-end;
          }
          .nv-burger { display: none; }
          :global(.nv-overlay), :global(.nv-drawer) { display: none; }
          .nv-left { grid-column: 1; }
        }
      `}</style>
    </>
  );
}
