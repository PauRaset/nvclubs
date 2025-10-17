'use client';
import { clearSession, getUser } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

export default function TopNav() {
  // Leemos el usuario en cliente (puede no estar aún al hidratar)
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
        <a href="/events/new" style={{ ...link, background: '#0ea5e9', color: '#001018', fontWeight: 600 }}>
          + Crear
        </a>

        {/* Nuevo: enlaces de registro/verificación visibles solo si NO hay usuario */}
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

        {/* Si hay usuario -> botón Salir; si no, botón Entrar (sin onClick de logout) */}
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
}

/*'use client';
import { clearSession, getUser } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

export default function TopNav() {
  // Leemos el usuario en cliente (puede no estar aún al hidratar)
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
        <a href="/events/new" style={{ ...link, background: '#0ea5e9', color: '#001018', fontWeight: 600 }}>
          + Crear
        </a>
        <a href="/scanner" style={link}>Escáner</a>
        <a href="/profile" style={link}>Perfil</a>
      </nav>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#9ca3af' }}>
        <span style={{ fontSize: 13 }}>
          {user ? `#${user.username || user.email}` : '...'}
        </span>
        <a href="/login" onClick={logout}
           style={{ padding: '6px 10px', border: '1px solid #334155', borderRadius: 8, textDecoration: 'none' }}>
          Salir
        </a>
      </div>
    </header>
  );
}*/
