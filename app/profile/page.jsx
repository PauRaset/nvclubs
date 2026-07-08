'use client';
import { useEffect, useMemo, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';
import TopNav from '@/components/TopNav';
import RequireClub from '@/components/RequireClub';
import { toast } from '@/components/Toast';

function normalizeInstagram(input) {
  if (!input) return { handle: '', url: '' };
  let v = String(input).trim();

  try {
    if (v.startsWith('http')) {
      const u = new URL(v);
      if (u.hostname.includes('instagram.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        const h = parts[0] || '';
        return h ? { handle: h.replace(/^@/, ''), url: `https://instagram.com/${h}` } : { handle: '', url: '' };
      }
    }
  } catch {}

  v = v.replace(/^@/, '');
  if (!v) return { handle: '', url: '' };
  return { handle: v, url: `https://instagram.com/${v}` };
}

function ProfileInner() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotice('');

      const r = await getMe();
      let u = null;

      if (r.ok) {
        u = r.data;
      } else if (r.status === 401) {
        if (!cancelled) setNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      } else {
        u = getUser();
        if (!u && !cancelled) setNotice('No se pudieron cargar los datos de perfil.');
      }

      if (u && !cancelled) {
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

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
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
    setNotice('Perfil actualizado');
    toast.success('Perfil actualizado correctamente.');
  }

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setNotice('Cerrando sesión...');

    try {
      try {
        setSession('', null);
      } catch {}
      try {
        localStorage.removeItem('nv_token');
        localStorage.removeItem('nv_user');
        localStorage.removeItem('user');
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
    } finally {
      window.location.href = '/login';
    }
  }

  if (loading) {
    return (
      <main className="nv-page">
        <TopNav active="profile" />
        <div className="nv-shell" style={{ maxWidth: 1180 }}>
          <section className="nv-card">
            <div className="nv-skeleton" style={{ height: 20, width: '35%' }} />
            <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '70%', marginTop: 16 }} />
            <div className="nv-skeleton nv-skeleton-line" style={{ width: '55%' }} />
          </section>
          <section className="nv-card" style={{ minHeight: 220 }}>
            <div className="nv-skeleton" style={{ height: 132, width: 132, borderRadius: '50%' }} />
            <div className="nv-skeleton nv-skeleton-line lg" style={{ width: '40%', marginTop: 18 }} />
            <div className="nv-skeleton nv-skeleton-line" style={{ width: '60%' }} />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="nv-page">
      <TopNav active="profile" />

      <div className="nv-shell" style={{ maxWidth: 1180 }}>
        <section className="nv-hero nv-hero-split">
          <div>
            <div className="nv-badge">Perfil del club</div>
            <h1 className="nv-h1" style={{ marginTop: 14 }}>Tu perfil</h1>
            <p className="nv-lead" style={{ marginTop: 12, maxWidth: 760 }}>
              Gestiona la identidad visual y los datos principales de tu club. Aquí podrás actualizar
              tu avatar, nombre visible e Instagram para que toda la presencia del panel quede limpia y profesional.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="nv-btn nv-btn-danger"
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        </section>

        {notice && (
          <div className="nv-notice nv-notice-info" role="status" aria-live="polite">
            {notice}
            {notice.includes('iniciar sesión') && (
              <button
                className="nv-btn nv-btn-ghost"
                style={{ marginLeft: 12 }}
                onClick={() => (window.location.href = '/login')}
              >
                Ir a login
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
          <div className="nv-stack">
            <section className="nv-card">
              <h2 className="nv-h3">Imagen del club</h2>
              <p className="nv-lead nv-small" style={{ marginTop: 6 }}>
                La foto de perfil es una de las partes más visibles del panel.
              </p>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 132,
                    height: 132,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1px solid var(--nv-border-strong)',
                    background: 'rgba(255,255,255,0.03)',
                    flex: '0 0 auto',
                  }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="nv-muted nv-small" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                      Sin foto
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 10, minWidth: 0, flex: '1 1 180px' }}>
                  <div className="nv-h4">
                    {form.entityName || form.username || 'Tu club'}
                  </div>
                  <div className="nv-muted nv-small" style={{ wordBreak: 'break-word' }}>
                    {form.email || 'Sin correo disponible'}
                  </div>

                  <label className="nv-btn nv-btn-ghost" style={{ width: 'fit-content' }}>
                    Cambiar avatar
                    <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="nv-notice nv-notice-info" style={{ marginTop: 16 }}>
                Recomendación: usa una imagen cuadrada, limpia y reconocible. Formatos admitidos: JPG, PNG o WebP.
              </div>
            </section>

            <section className="nv-card">
              <h2 className="nv-h3">Resumen rápido</h2>
              <p className="nv-lead nv-small" style={{ marginTop: 6 }}>Datos principales del perfil de club.</p>

              <div className="nv-stack" style={{ marginTop: 16 }}>
                <article className="nv-card-soft" style={{ padding: 14 }}>
                  <div className="nv-kpi-label" style={{ marginBottom: 6 }}>Usuario</div>
                  <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{form.username || 'Pendiente'}</div>
                </article>
                <article className="nv-card-soft" style={{ padding: 14 }}>
                  <div className="nv-kpi-label" style={{ marginBottom: 6 }}>Entidad</div>
                  <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{form.entityName || 'Pendiente'}</div>
                </article>
                <article className="nv-card-soft" style={{ padding: 14 }}>
                  <div className="nv-kpi-label" style={{ marginBottom: 6 }}>Instagram</div>
                  <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{igHandle ? `@${igHandle}` : 'No conectado'}</div>
                </article>
              </div>
            </section>
          </div>

          <div className="nv-stack">
            <section className="nv-card">
              <h2 className="nv-h3">Datos de tu perfil</h2>
              <p className="nv-lead nv-small" style={{ marginTop: 6 }}>Actualiza la identidad pública del club dentro del panel.</p>

              <form onSubmit={onSave} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <label className="nv-field">
                  <span className="nv-label">Email <i style={{ opacity: 0.6 }}>(solo lectura)</i></span>
                  <input
                    name="email"
                    value={form.email}
                    readOnly
                    placeholder="—"
                    className="nv-input"
                    style={{ opacity: 0.75 }}
                  />
                </label>

                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <label className="nv-field">
                    <span className="nv-label">Usuario</span>
                    <input
                      name="username"
                      value={form.username}
                      onChange={onChange}
                      required
                      className="nv-input"
                    />
                  </label>

                  <label className="nv-field">
                    <span className="nv-label">Nombre entidad / club</span>
                    <input
                      name="entityName"
                      value={form.entityName}
                      onChange={onChange}
                      className="nv-input"
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end' }}>
                  <label className="nv-field">
                    <span className="nv-label">Instagram</span>
                    <input
                      name="instagram"
                      value={form.instagram}
                      onChange={onChange}
                      placeholder="@tuusuario o https://instagram.com/tuusuario"
                      className="nv-input"
                    />
                  </label>

                  <div className="nv-field">
                    <span className="nv-label">Acceso rápido</span>
                    <a
                      href={igUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nv-btn nv-btn-ghost"
                      style={{
                        justifyContent: 'center',
                        opacity: igUrl ? 1 : 0.45,
                        pointerEvents: igUrl ? 'auto' : 'none',
                      }}
                    >
                      Ver Instagram {igHandle ? `(@${igHandle})` : ''}
                    </a>
                  </div>
                </div>

                <div className="nv-notice nv-notice-info">
                  Consejo: usa el mismo nombre, avatar e Instagram que el público ya reconoce. Eso hace que el club se vea más sólido y coherente dentro de NightVibe.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="nv-btn nv-btn-ghost"
                    onClick={() => window.location.reload()}
                  >
                    Restaurar vista
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="nv-btn nv-btn-primary"
                    style={{ minWidth: 180 }}
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <RequireClub>
      <ProfileInner />
    </RequireClub>
  );
}
