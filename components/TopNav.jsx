'use client';
import { clearSession, getUser } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import NavLink from './NavLink';

export default function TopNav() {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, []);

  function logout(e) {
    e.preventDefault();
    clearSession();
    window.location.href = '/login';
  }

  const brand = {
    fontWeight: 800,
    fontSize: 16,
    color: '#e5e7eb',
    textDecoration: 'none',
    marginRight: 12
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #1d263a',
      background: '#0b0f19',
      position: 'sticky', top: 0, zIndex: 20
    }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="/dashboard" style={brand}>NightVibe Clubs</a>

        <NavLink href="/events">Eventos</NavLink>

        <NavLink href="/events/new"
                 style={{ fontWeight: 700 }}
                 activeStyle={{}}
        >
          + Crear
        </NavLink>

        <NavLink href="/scanner">Escáner</NavLink>
        <NavLink href="/profile">Perfil</NavLink>
      </nav>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#9ca3af' }}>
        <span style={{ fontSize: 13 }}>
          {user ? `#${user.username || user.email}` : '…'}
        </span>
        <a href="/login" onClick={logout}
           style={{ padding: '6px 10px', border: '1px solid #334155', borderRadius: 8, textDecoration: 'none', color: '#e5e7eb' }}>
          Salir
        </a>
      </div>
    </header>
  );
}

/*'use client';
import { clearSession, getUser } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

export default function TopNav() {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, []);

  function logout(e) {
    e.preventDefault();
    clearSession();
    window.location.href = '/login';
  }

  const link = {
    padding: '8px 10px',
    borderRadius: 8,
    background: '#111827',
    color: '#e5e7eb',
    textDecoration: 'none',
    display: 'inline-block'
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #1d263a',
      background: '#0b0f19',
      position: 'sticky',
      top: 0,
      zIndex: 20
    }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="/events" style={link}>Eventos</a>
        <a
          href="/events/new"
          style={{ ...link, background: '#0ea5e9', color: '#001018', fontWeight: 600 }}
        >
          + Crear
        </a>

        {/* Enlaces visibles cuando no hay sesión */}
        {!user && (
          <>
            <a href="/register" style={link}>Registro</a>
            <a href="/register/verify" style={link}>Verificar</a>
          </>
        )}

        <a href="/scanner" style={link}>Escáner</a>
        <a href="/profile" style={link}>Perfil</a>
      </nav>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#9ca3af' }}>
        <span style={{ fontSize: 13 }}>
          {user ? `#${user.username || user.email}` : '...'}
        </span>

        {user ? (
          <a
            href="/login"
            onClick={logout}
            style={{ padding: '6px 10px', border: '1px solid #334155', borderRadius: 8, textDecoration: 'none' }}
          >
            Salir
          </a>
        ) : (
          <a
            href="/login"
            style={{ padding: '6px 10px', border: '1px solid #334155', borderRadius: 8, textDecoration: 'none', color: '#e5e7eb' }}
          >
            Entrar
          </a>
        )}
      </div>
    </header>
  );
}*/
