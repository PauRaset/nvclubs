'use client';
import { useEffect, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ username:'', entityName:'', email:'', profilePicture:'' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await getMe();
      if (!r.ok) { setMsg(r.data?.message || `Error (HTTP ${r.status})`); setLoading(false); return; }
      const u = r.data || getUser() || {};
      setForm({
        username: u.username || '',
        entityName: u.entityName || '',
        email: u.email || '',
        profilePicture: u.profilePicture || '',
      });
      setAvatarPreview(u.profilePicture || '');
      setLoading(false);
    })();
  }, []);

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function onPick(e) { const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }

  async function onSave(e) {
    e.preventDefault();
    setMsg('Guardando...');
    const r1 = await updateMe({ username: form.username, entityName: form.entityName });
    if (!r1.ok) { setMsg(r1.data?.message || `Error (HTTP ${r1.status})`); return; }
    if (avatarFile) {
      const up = await uploadAvatar(avatarFile);
      if (!up.ok) { setMsg(up.data?.message || `Perfil guardado; avatar falló (HTTP ${up.status})`); return; }
    }
    const r2 = await getMe();
    if (r2.ok) {
      const newUser = r2.data;
      const token = localStorage.getItem('nv_token');
      setSession(token, newUser);
      setForm({
        username: newUser.username || '',
        entityName: newUser.entityName || '',
        email: newUser.email || '',
        profilePicture: newUser.profilePicture || '',
      });
      setAvatarPreview(newUser.profilePicture || avatarPreview);
    }
    setMsg('✅ Perfil actualizado');
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tu perfil</h1>
      <form onSubmit={onSave} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email (solo lectura)
          <input name="email" value={form.email} readOnly style={{ width:'100%', padding:10, borderRadius:8, opacity:0.7 }}/>
        </label>
        <label>
          Usuario
          <input name="username" value={form.username} onChange={onChange} required style={{ width:'100%', padding:10, borderRadius:8 }}/>
        </label>
        <label>
          Nombre entidad / club
          <input name="entityName" value={form.entityName} onChange={onChange} style={{ width:'100%', padding:10, borderRadius:8 }}/>
        </label>
        <label>
          Avatar (opcional)
          <input type="file" accept="image/*" onChange={onPick}/>
        </label>
        {avatarPreview && (
          <div>
            <div style={{ fontSize:12, opacity:0.7, marginBottom:6 }}>Previsualización</div>
            <img src={avatarPreview} alt="avatar" style={{ width:128, height:128, objectFit:'cover', borderRadius:'50%', border:'1px solid #243044' }}/>
          </div>
        )}
        <button type="submit" style={{ padding:12, borderRadius:10, background:'#00e5ff', color:'#001018', fontWeight:600 }}>
          Guardar cambios
        </button>
        <div style={{ minHeight:20 }}>{msg}</div>
      </form>
    </div>
  );
}