'use client';
import { useEffect, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    username: '',
    entityName: '',
    email: '',
    profilePicture: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotice('');

      // 1) Intentamos /api/users/me (Firebase) y caemos a /api/auth/me (local)
      const r = await getMe();
      let u = null;

      if (r.ok) {
        u = r.data;
      } else if (r.status === 401) {
        // Sesión caducada → mensaje + botón login
        setNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      } else {
        // Fallback silencioso a localStorage para no dejar la vista vacía
        u = getUser();
        if (!u) setNotice('No se pudieron cargar los datos de perfil.');
      }

      if (u) {
        const mapped = {
          username: u.username || u.name || '',
          // entityName puede venir como entName en tu backend
          entityName: u.entityName || u.entName || '',
          email: u.email || '',
          // avatar puede venir como profilePictureUrl (nuevo) o profilePicture (antiguo)
          profilePicture: u.profilePictureUrl || u.profilePicture || '',
        };
        setForm(mapped);
        setAvatarPreview(mapped.profilePicture || '');
      }

      setLoading(false);
    })();
  }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function onSave(e) {
    e.preventDefault();
    setNotice('Guardando...');

    // 1) Datos básicos (username + entityName)
    const r1 = await updateMe({
      username: form.username,
      entityName: form.entityName, // en el backend lo mapeamos a entName si procede
    });

    if (!r1.ok) {
      if (r1.status === 401) {
        setNotice('Sesión caducada. Por favor, inicia sesión de nuevo.');
      } else {
        setNotice(r1.data?.message || `Error al guardar (HTTP ${r1.status})`);
      }
      return;
    }

    // 2) Avatar (opcional)
    if (avatarFile) {
      const up = await uploadAvatar(avatarFile);
      if (!up.ok) {
        setNotice(up.data?.message || `Perfil guardado; avatar falló (HTTP ${up.status})`);
        // no salimos: el resto está guardado
      }
    }

    // 3) Refrescar perfil y sesión local
    const r2 = await getMe();
    if (r2.ok) {
      const newUser = r2.data;
      const token = localStorage.getItem('nv_token'); // conserva el token actual
      setSession(token, newUser);

      setForm({
        username: newUser.username || newUser.name || '',
        entityName: newUser.entityName || newUser.entName || '',
        email: newUser.email || '',
        profilePicture: newUser.profilePictureUrl || newUser.profilePicture || '',
      });
      setAvatarPreview(
        newUser.profilePictureUrl || newUser.profilePicture || avatarPreview
      );
    }

    setNotice('✅ Perfil actualizado');
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tu perfil</h1>

      {notice && (
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          {notice}
          {notice.includes('iniciar sesión') && (
            <button
              style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #334155' }}
              onClick={() => (window.location.href = '/login')}
            >
              Ir a login
            </button>
          )}
        </div>
      )}

      <form onSubmit={onSave} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email (solo lectura)
          <input
            name="email"
            value={form.email}
            readOnly
            placeholder="—"
            style={{ width: '100%', padding: 10, borderRadius: 8, opacity: 0.7 }}
          />
        </label>

        <label>
          Usuario
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            required
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          />
        </label>

        <label>
          Nombre entidad / club
          <input
            name="entityName"
            value={form.entityName}
            onChange={onChange}
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          />
        </label>

        <label>
          Avatar (opcional)
          <input type="file" accept="image/*" onChange={onPick} />
        </label>

        {avatarPreview && (
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Previsualización</div>
            <img
              src={avatarPreview}
              alt="avatar"
              style={{
                width: 128,
                height: 128,
                objectFit: 'cover',
                borderRadius: '50%',
                border: '1px solid #243044',
              }}
            />
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#00e5ff',
            color: '#001018',
            fontWeight: 600,
          }}
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}

/*'use client';
import { useEffect, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ username:'', entityName:'', email:'', profilePicture:'' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await getMe();
      let u = null;

      if (r.ok) {
        u = r.data;
      } else if (r.status === 401) {
        setNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      } else {
        // Fallback silencioso a localStorage
        u = getUser();
        if (!u) setNotice('No se pudieron cargar los datos de perfil.');
      }

      if (u) {
        setForm({
          username: u.username || '',
          entityName: u.entityName || '',
          email: u.email || '',
          profilePicture: u.profilePicture || '',
        });
        setAvatarPreview(u.profilePicture || '');
      }
      setLoading(false);
    })();
  }, []);

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function onPick(e) { const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }

  async function onSave(e) {
    e.preventDefault();
    setNotice('Guardando...');
    const r1 = await updateMe({ username: form.username, entityName: form.entityName });
    if (!r1.ok) {
      if (r1.status === 401) setNotice('Sesión caducada. Por favor, inicia sesión de nuevo.');
      else setNotice(r1.data?.message || `Error al guardar (HTTP ${r1.status})`);
      return;
    }
    if (avatarFile) {
      const up = await uploadAvatar(avatarFile);
      if (!up.ok) { setNotice(up.data?.message || `Perfil guardado; avatar falló (HTTP ${up.status})`); return; }
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
    setNotice('✅ Perfil actualizado');
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tu perfil</h1>

      {notice && (
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          {notice}
          {notice.includes('iniciar sesión') && (
            <button
              style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #334155' }}
              onClick={() => (window.location.href = '/login')}
            >
              Ir a login
            </button>
          )}
        </div>
      )}

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
      </form>
    </div>
  );
}
*/
