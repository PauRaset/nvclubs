'use client';
import { useEffect, useState } from 'react';
import TopNav from './TopNav';

export default function AppShell({ children, clubName: propClubName }) {
  const [clubName, setClubName] = useState(propClubName || '');

  // Intenta resolver el nombre del club desde varias fuentes sin romper nada existente
  useEffect(() => {
    if (propClubName) return; // si viene por prop, respetamos
    let name = '';

    // 1) variable global opcional (por si la inyectas en _document o layout)
    if (typeof window !== 'undefined' && window.NIGHTVIBE_CLUB?.name) {
      name = String(window.NIGHTVIBE_CLUB.name);
    }

    // 2) localStorage (si lo guardas cuando el usuario elige club)
    if (!name && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('nv.clubName');
      if (stored) name = stored;
    }

    // 3) fallback
    setClubName(name || '');
  }, [propClubName]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(60% 60% at 10% 0%, rgba(14,165,233,.08) 0, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(99,102,241,.08) 0, transparent 60%), #0b0f19'
      }}
    >
      {/* Pasamos clubName al TopNav para que reemplace "NightVibe" */}
      <TopNav clubName={clubName} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

/*'use client';
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
*/
