'use client';
import { useEffect, useState } from 'react';
import TopNav from './TopNav';

export default function AppShell({ children, clubName: propClubName }) {
  const [clubName, setClubName] = useState(propClubName || '');

  // Resuelve el nombre del club desde varias fuentes sin romper nada existente
  useEffect(() => {
    if (propClubName) return; // si viene por prop, respetamos
    let name = '';

    // 1) variable global opcional (por si se inyecta en layout)
    if (typeof window !== 'undefined' && window.NIGHTVIBE_CLUB?.name) {
      name = String(window.NIGHTVIBE_CLUB.name);
    }

    // 2) localStorage (si se guarda al elegir club)
    if (!name && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('nv.clubName');
      if (stored) name = stored;
    }

    // 3) fallback
    setClubName(name || '');
  }, [propClubName]);

  return (
    <div className="nv-page">
      {/* Pasamos clubName al TopNav para que reemplace "NightVibe" */}
      <TopNav clubName={clubName} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 56px' }}>
        {children}
      </div>
    </div>
  );
}
