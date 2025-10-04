'use client';
import { useEffect, useState } from 'react';

export default function RequireClub({ children }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('nv_user');
    if (!raw) return (window.location.href = '/login');
    try {
      const user = JSON.parse(raw);
      const role = user?.role || user?.type || user?.roles?.[0];
      if (role !== 'club') return (window.location.href = '/login');
      setOk(true);
    } catch {
      window.location.href = '/login';
    }
  }, []);

  if (!ok) return null;
  return children;
}