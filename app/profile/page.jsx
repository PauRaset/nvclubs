'use client';
import { useEffect, useMemo, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';

/* Normaliza Instagram a {handle, url} a partir de @usuario o URL */
function normalizeInstagram(input) {
  if (!input) return { handle: '', url: '' };
  let v = String(input).trim();

  // Si es URL, extraer handle
  try {
    if (v.startsWith('http')) {
      const u = new URL(v);
      if (u.hostname.includes('instagram.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        const h = parts[0] || '';
        return h ? { handle: h.replace(/^@/, ''), url: `https://instagram.com/${h}` } : { handle: '', url: '' };
      }
    }
  } catch { /* noop */ }

  // Si viene con @, quitarlo
  v = v.replace(/^@/, '');
  if (!v) return { handle: '', url: '' };
  return { handle: v, url: `https://instagram.com/${v}` };
}

/* Utilidades de estilos (CSS-in-JS con <style jsx>) */
const styles = {
  page: 'nvp',
  header: 'nvp__header',
  nav: 'nvp__nav',
  navLink: 'nvp__navLink',
  navPrimary: 'nvp__navPrimary',
  card: 'nvp__card',
  title: 'nvp__title',
  grid: 'nvp__grid',
  avatarWrap: 'nvp__avatarWrap',
  avatar: 'nvp__avatar',
  input: 'nvp__input',
  inputReadOnly: 'nvp__input--ro',
  label: 'nvp__label',
  labelText: 'nvp__labelText',
  button: 'nvp__button',
  buttonBlock: 'nvp__button--block',
  note: 'nvp__note',
  container: 'nvp__container',
  actions: 'nvp__actions',
  badge: 'nvp__badge',
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: '',
    entityName: '',
    email: '',
    profilePicture: '',
    instagram: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const { handle: igHandle, url: igUrl } = useMemo(
    () => normalizeInstagram(form.instagram),
    [form.instagram]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotice('');

      const r = await getMe();
      let u = null;

      if (r.ok) {
        u = r.data;
      } else if (r.status === 401) {
        setNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      } else {
        u = getUser();
        if (!u) setNotice('No se pudieron cargar los datos de perfil.');
      }

      if (u) {
        const igFromServer = u.instagramId || u.instagram || u.instagramUrl || '';
        const norm = normalizeInstagram(igFromServer);

        const mapped = {
          username: u.username || u.name || '',
          entityName: u.entityName || u.entName || '',
          email: u.email || '',
          profilePicture: u.profilePictureUrl || u.profilePicture || '',
          instagram: norm.handle || igFromServer || '',
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
    setSaving(true);
    setNotice('Guardando...');

    const payload = {
      username: form.username,
      entityName: form.entityName,
      instagramId: igHandle || undefined,
      instagramUrl: igHandle ? `https://instagram.com/${igHandle}` : undefined,
    };

    const r1 = await updateMe(payload);

    if (!r1.ok) {
      setSaving(false);
      if (r1.status === 401) {
        setNotice('Sesión caducada. Por favor, inicia sesión de nuevo.');
      } else {
        setNotice(r1.data?.message || `Error al guardar (HTTP ${r1.status})`);
      }
      return;
    }

    if (avatarFile) {
      const up = await uploadAvatar(avatarFile);
      if (!up.ok) {
        setSaving(false);
        setNotice(up.data?.message || `Perfil guardado; avatar falló (HTTP ${up.status})`);
      }
    }

    const r2 = await getMe();
    if (r2.ok) {
      const newUser = r2.data;
      const token = localStorage.getItem('nv_token');
      setSession(token, newUser);

      const igFromServer = newUser.instagramId || newUser.instagram || newUser.instagramUrl || form.instagram;
      const norm = normalizeInstagram(igFromServer);

      setForm({
        username: newUser.username || newUser.name || '',
        entityName: newUser.entityName || newUser.entName || '',
        email: newUser.email || '',
        profilePicture: newUser.profilePictureUrl || newUser.profilePicture || '',
        instagram: norm.handle || '',
      });
      setAvatarPreview(
        newUser.profilePictureUrl || newUser.profilePicture || avatarPreview
      );
    }

    setSaving(false);
    setNotice('✅ Perfil actualizado');
  }

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;

  return (
    <div className={styles.page}>
      {/* ======= Header / Menú ======= */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>NightVibe</span>
            <span className={styles.badge}>Perfil</span>
          </div>
          <nav className={styles.nav}>
            <a href="/dashboard" className={styles.navLink}>Dashboard</a>
            <a href="/events" className={styles.navLink}>Mis eventos</a>
            <a href="/profile" className={`${styles.navLink} ${styles.navPrimary}`}>Perfil</a>
            <a href="/logout" className={styles.navLink} style={{ border: '1px solid #334155' }}>Salir</a>
          </nav>
        </div>
      </header>

      {/* ======= Contenido ======= */}
      <main className={styles.container} style={{ marginTop: 20, marginBottom: 24 }}>
        {notice && (
          <div className={styles.note}>
            {notice}
            {notice.includes('iniciar sesión') && (
              <button
                className={`${styles.navLink}`}
                style={{
                  marginLeft: 12,
                  background: 'transparent',
                  border: '1px solid #334155'
                }}
                onClick={() => (window.location.href = '/login')}
              >
                Ir a login
              </button>
            )}
          </div>
        )}

        <div className={styles.grid}>
          {/* Columna izquierda: Avatar + acciones */}
          <section className={styles.card}>
            <h2 className={styles.title}>Tu avatar</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', opacity: .6 }}>Sin foto</div>
                  }
                </div>
                <label style={{ fontSize: 14 }}>
                  <div style={{ marginBottom: 6, opacity: .8 }}>Cambiar avatar</div>
                  <input type="file" accept="image/*" onChange={onPick}/>
                </label>
              </div>

              {/* Texto con control de ruptura para que no se desborde */}
              <div className={styles.note}>
                Recomendación: usa una imagen cuadrada (mín. 256×256). Formatos admitidos: JPG, PNG o WebP.
              </div>
            </div>
          </section>

          {/* Columna derecha: Formulario */}
          <section className={styles.card}>
            <h2 className={styles.title}>Datos de tu perfil</h2>
            <form onSubmit={onSave} style={{ display: 'grid', gap: 12 }}>
              <label className={styles.label}>
                <span className={styles.labelText}>Email <i style={{ opacity: .6 }}>(solo lectura)</i></span>
                <input
                  name="email"
                  value={form.email}
                  readOnly
                  placeholder="—"
                  className={`${styles.input} ${styles.inputReadOnly}`}
                />
              </label>

              <div className="nvp__row2">
                <label className={styles.label}>
                  <span className={styles.labelText}>Usuario</span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    required
                    className={styles.input}
                  />
                </label>

                <label className={styles.label}>
                  <span className={styles.labelText}>Nombre entidad / club</span>
                  <input
                    name="entityName"
                    value={form.entityName}
                    onChange={onChange}
                    className={styles.input}
                  />
                </label>
              </div>

              <div className="nvp__row2">
                <label className={styles.label}>
                  <span className={styles.labelText}>Instagram</span>
                  <input
                    name="instagram"
                    value={form.instagram}
                    onChange={onChange}
                    placeholder="@tuusuario o https://instagram.com/tuusuario"
                    className={styles.input}
                  />
                </label>

                <div className={styles.label} style={{ alignSelf: 'end' }}>
                  <span className={styles.labelText}>Acceso rápido</span>
                  <a
                    href={igUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.navLink}`}
                    style={{
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #334155',
                      opacity: igUrl ? 1 : .4,
                      pointerEvents: igUrl ? 'auto' : 'none'
                    }}
                  >
                    Ver Instagram {igHandle ? `(@${igHandle})` : ''}
                  </a>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${styles.button} ${styles.buttonBlock}`}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* ====== CSS responsive ====== */}
      <style jsx>{`
        :global(html), :global(body) {
          background: #0b1220;
        }
        .${styles.page} {
          min-height: 100dvh;
          background: #0b1220;
          color: #e6f0ff;
        }
        .${styles.container} {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .${styles.header} {
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: saturate(140%) blur(6px);
          background: rgba(8, 12, 22, 0.75);
          border-bottom: 1px solid #1e293b;
        }
        .${styles.nav} {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .${styles.navLink} {
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 8px;
          color: #e6f0ff;
          font-size: 14px;
          line-height: 1.2;
          display: inline-block;
        }
        .${styles.navPrimary} {
          background: #00e5ff;
          color: #001018;
          font-weight: 700;
        }
        .${styles.grid} {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 16px;
        }
        .${styles.card} {
          border: 1px solid #243044;
          background: #0f172a;
          border-radius: 14px;
          padding: 16px;
        }
        .${styles.title} {
          font-size: 16px;
          font-weight: 800;
          margin: 2px 0 12px;
        }
        .${styles.avatarWrap} {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .${styles.avatar} {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid #243044;
          background: #0f172a;
          flex: 0 0 auto;
        }
        .${styles.input} {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #2c3a52;
          background: #0b1424;
          color: #e6f0ff;
          outline: none;
        }
        .${styles.inputReadOnly} {
          border-color: #334155;
          background: #0b1220;
          opacity: 0.85;
        }
        .${styles.label} { display: grid; gap: 6px; }
        .${styles.labelText} { font-size: 12px; opacity: .8; }
        .${styles.button} {
          padding: 12px 16px;
          border-radius: 10px;
          background: #00e5ff;
          color: #001018;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }
        .${styles.button}[disabled] { opacity: .6; cursor: not-allowed; }
        .${styles.buttonBlock} { width: 100%; }
        .${styles.actions} {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .${styles.note} {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #101829;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;       /* 👈 evita desbordes */
          word-break: break-word;        /* 👈 por si hay URLs largas */
        }
        .${styles.badge} {
          font-size: 12px;
          opacity: 0.7;
        }
        .nvp__row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* ====== Responsivo ====== */
        @media (max-width: 980px) {
          .${styles.grid} {
            grid-template-columns: 1fr;
          }
          .${styles.actions} {
            justify-content: stretch;
          }
          .${styles.buttonBlock} {
            width: 100%;
          }
        }
        @media (max-width: 640px) {
          .${styles.nav} {
            gap: 6px;
          }
          .nvp__row2 {
            grid-template-columns: 1fr;
          }
          .${styles.avatar} {
            width: 96px;
            height: 96px;
          }
        }
      `}</style>
    </div>
  );
}


/*'use client';
import { useEffect, useMemo, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';

// Normaliza Instagram a {handle, url} a partir de @usuario o URL 
function normalizeInstagram(input) {
  if (!input) return { handle: '', url: '' };
  let v = String(input).trim();

  // Si es URL, extraer handle
  try {
    if (v.startsWith('http')) {
      const u = new URL(v);
      if (u.hostname.includes('instagram.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        const h = parts[0] || '';
        return h ? { handle: h.replace(/^@/, ''), url: `https://instagram.com/${h}` } : { handle: '', url: '' };
      }
    }
  } catch {  }

  // Si viene con @, quitarlo
  v = v.replace(/^@/, '');
  if (!v) return { handle: '', url: '' };
  return { handle: v, url: `https://instagram.com/${v}` };
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: '',
    entityName: '',
    email: '',
    profilePicture: '',
    instagram: '', // entrada libre: @usuario o URL
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const { handle: igHandle, url: igUrl } = useMemo(
    () => normalizeInstagram(form.instagram),
    [form.instagram]
  );

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
        // intentar leer instagram desde varias claves posibles
        const igFromServer = u.instagramId || u.instagram || u.instagramUrl || '';
        const norm = normalizeInstagram(igFromServer);

        const mapped = {
          username: u.username || u.name || '',
          // entityName puede venir como entName en tu backend
          entityName: u.entityName || u.entName || '',
          email: u.email || '',
          // avatar puede venir como profilePictureUrl (nuevo) o profilePicture (antiguo)
          profilePicture: u.profilePictureUrl || u.profilePicture || '',
          instagram: norm.handle || igFromServer || '',
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
    setSaving(true);
    setNotice('Guardando...');

    // 1) Datos básicos: username, entityName e instagram normalizado
    const payload = {
      username: form.username,
      entityName: form.entityName, // en el backend lo mapeamos a entName si procede
      instagramId: igHandle || undefined,      // guardamos el handle limpio
      instagramUrl: igHandle ? `https://instagram.com/${igHandle}` : undefined, // útil para front
    };

    const r1 = await updateMe(payload);

    if (!r1.ok) {
      setSaving(false);
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
        setSaving(false);
        setNotice(up.data?.message || `Perfil guardado; avatar falló (HTTP ${up.status})`);
        // No salimos: lo demás está guardado
      }
    }

    // 3) Refrescar perfil y sesión local
    const r2 = await getMe();
    if (r2.ok) {
      const newUser = r2.data;
      const token = localStorage.getItem('nv_token'); // conserva el token actual
      setSession(token, newUser);

      const igFromServer = newUser.instagramId || newUser.instagram || newUser.instagramUrl || form.instagram;
      const norm = normalizeInstagram(igFromServer);

      setForm({
        username: newUser.username || newUser.name || '',
        entityName: newUser.entityName || newUser.entName || '',
        email: newUser.email || '',
        profilePicture: newUser.profilePictureUrl || newUser.profilePicture || '',
        instagram: norm.handle || '',
      });
      setAvatarPreview(
        newUser.profilePictureUrl || newUser.profilePicture || avatarPreview
      );
    }

    setSaving(false);
    setNotice('✅ Perfil actualizado');
  }

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;

  return (
    <div style={{ minHeight: '100dvh', background: '#0b1220', color: '#e6f0ff' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'saturate(140%) blur(6px)',
          background: 'rgba(8, 12, 22, 0.75)',
          borderBottom: '1px solid #1e293b'
        }}
      >
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>NightVibe</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>— Perfil</span>
          </div>
          <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="/dashboard" style={navLink}>Dashboard</a>
            <a href="/events" style={navLink}>Mis eventos</a>
            <a href="/profile" style={{ ...navLink, background: '#00e5ff', color: '#001018', fontWeight: 700 }}>Perfil</a>
            <a href="/logout" style={{ ...navLink, border: '1px solid #334155' }}>Salir</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
        {notice && (
          <div style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #334155',
            background: '#101829'
          }}>
            {notice}
            {notice.includes('iniciar sesión') && (
              <button
                style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#e6f0ff' }}
                onClick={() => (window.location.href = '/login')}
              >
                Ir a login
              </button>
            )}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 16,
        }}>
          <section style={card}>
            <h2 style={cardTitle}>Tu avatar</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  overflow: 'hidden', border: '1px solid #243044', background: '#0f172a'
                }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', opacity: .6 }}>Sin foto</div>
                  }
                </div>
                <label style={{ fontSize: 14 }}>
                  <div style={{ marginBottom: 6, opacity: .8 }}>Cambiar avatar</div>
                  <input type="file" accept="image/*" onChange={onPick}/>
                </label>
              </div>
              <div style={{ fontSize: 12, opacity: .7 }}>
                Recomendado: imagen cuadrada (mín. 256×256). Formatos JPG/PNG/WebP.
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={cardTitle}>Datos de tu perfil</h2>
            <form onSubmit={onSave} style={{ display: 'grid', gap: 12 }}>
              <label style={label}>
                <span style={labelText}>Email <i style={{ opacity: .6 }}>(solo lectura)</i></span>
                <input
                  name="email"
                  value={form.email}
                  readOnly
                  placeholder="—"
                  style={input({ readOnly: true })}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={label}>
                  <span style={labelText}>Usuario</span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    required
                    style={input()}
                  />
                </label>

                <label style={label}>
                  <span style={labelText}>Nombre entidad / club</span>
                  <input
                    name="entityName"
                    value={form.entityName}
                    onChange={onChange}
                    style={input()}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
                <label style={label}>
                  <span style={labelText}>Instagram</span>
                  <input
                    name="instagram"
                    value={form.instagram}
                    onChange={onChange}
                    placeholder="@tuusuario o https://instagram.com/tuusuario"
                    style={input()}
                  />
                </label>

                <div>
                  <div style={{ fontSize: 12, opacity: .6, marginBottom: 6 }}>Acceso rápido</div>
                  <a
                    href={igUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #334155',
                      opacity: igUrl ? 1 : .4,
                      pointerEvents: igUrl ? 'auto' : 'none',
                      color: '#e6f0ff',
                      textDecoration: 'none'
                    }}
                  >
                    Ver Instagram {igHandle ? `(@${igHandle})` : ''}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#00e5ff',
                    color: '#001018',
                    fontWeight: 700,
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

// ======= estilos utilitarios (inline-friendly) ======= 
const navLink = {
  textDecoration: 'none',
  padding: '6px 10px',
  borderRadius: 8,
  color: '#e6f0ff',
  fontSize: 14
};

const card = {
  border: '1px solid #243044',
  background: '#0f172a',
  borderRadius: 14,
  padding: 16
};

const cardTitle = {
  fontSize: 16,
  fontWeight: 800,
  margin: '2px 0 12px',
};

const label = { display: 'grid', gap: 6 };
const labelText = { fontSize: 12, opacity: .8 };
const input = (opts = {}) => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid ' + (opts.readOnly ? '#334155' : '#2c3a52'),
  background: opts.readOnly ? '#0b1220' : '#0b1424',
  color: '#e6f0ff',
  outline: 'none'
});*/
