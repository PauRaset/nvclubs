'use client';
import { useEffect, useMemo, useState } from 'react';
import { getUser, setSession } from '@/lib/apiClient';
import { getMe, updateMe, uploadAvatar } from '@/lib/userApi';
import TopNav from '@/components/TopNav';

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

const styles = {
  page: 'nvp',
  container: 'nvp__container',
  hero: 'nvp__hero',
  heroLeft: 'nvp__heroLeft',
  heroRight: 'nvp__heroRight',
  heroBadge: 'nvp__heroBadge',
  heroTitle: 'nvp__heroTitle',
  heroText: 'nvp__heroText',
  card: 'nvp__card',
  title: 'nvp__title',
  subtitle: 'nvp__subtitle',
  grid: 'nvp__grid',
  leftCol: 'nvp__leftCol',
  rightCol: 'nvp__rightCol',
  avatarWrap: 'nvp__avatarWrap',
  avatar: 'nvp__avatar',
  avatarMeta: 'nvp__avatarMeta',
  infoGrid: 'nvp__infoGrid',
  miniStat: 'nvp__miniStat',
  miniStatLabel: 'nvp__miniStatLabel',
  miniStatValue: 'nvp__miniStatValue',
  input: 'nvp__input',
  inputReadOnly: 'nvp__input--ro',
  label: 'nvp__label',
  labelText: 'nvp__labelText',
  button: 'nvp__button',
  buttonBlock: 'nvp__button--block',
  buttonGhost: 'nvp__buttonGhost',
  buttonDanger: 'nvp__buttonDanger',
  note: 'nvp__note',
  notice: 'nvp__notice',
  actions: 'nvp__actions',
  sectionHead: 'nvp__sectionHead',
  helper: 'nvp__helper',
};

export default function ProfilePage() {
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
    setNotice('✅ Perfil actualizado');
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
      <div className={styles.page}>
        <TopNav active="profile" />
        <main className={styles.container} style={{ marginTop: 20, marginBottom: 24 }}>
          <section className={styles.card}>
            <div className={styles.notice}>Cargando perfil...</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TopNav active="profile" />

      <main className={styles.container} style={{ marginTop: 20, marginBottom: 24 }}>
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>Perfil del club</div>
            <h1 className={styles.heroTitle}>Tu perfil</h1>
            <p className={styles.heroText}>
              Gestiona la identidad visual y los datos principales de tu club. Aquí podrás actualizar
              tu avatar, nombre visible e Instagram para que toda la presencia del panel quede limpia y profesional.
            </p>
          </div>

          <div className={styles.heroRight}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        </section>

        {notice && (
          <div className={styles.notice}>
            {notice}
            {notice.includes('iniciar sesión') && (
              <button
                className={`${styles.button} ${styles.buttonGhost}`}
                style={{ marginLeft: 12 }}
                onClick={() => (window.location.href = '/login')}
              >
                Ir a login
              </button>
            )}
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.title}>Imagen del club</h2>
                  <p className={styles.subtitle}>La foto de perfil es una de las partes más visibles del panel.</p>
                </div>
              </div>

              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', opacity: 0.6 }}>
                      Sin foto
                    </div>
                  )}
                </div>

                <div className={styles.avatarMeta}>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
                    {form.entityName || form.username || 'Tu club'}
                  </div>
                  <div className={styles.helper}>
                    {form.email || 'Sin correo disponible'}
                  </div>

                  <label className={`${styles.button} ${styles.buttonGhost}`} style={{ width: 'fit-content' }}>
                    Cambiar avatar
                    <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className={styles.note}>
                Recomendación: usa una imagen cuadrada, limpia y reconocible. Formatos admitidos: JPG, PNG o WebP.
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.title}>Resumen rápido</h2>
                  <p className={styles.subtitle}>Datos principales del perfil de club.</p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <article className={styles.miniStat}>
                  <div className={styles.miniStatLabel}>Usuario</div>
                  <div className={styles.miniStatValue}>{form.username || 'Pendiente'}</div>
                </article>
                <article className={styles.miniStat}>
                  <div className={styles.miniStatLabel}>Entidad</div>
                  <div className={styles.miniStatValue}>{form.entityName || 'Pendiente'}</div>
                </article>
                <article className={styles.miniStat}>
                  <div className={styles.miniStatLabel}>Instagram</div>
                  <div className={styles.miniStatValue}>{igHandle ? `@${igHandle}` : 'No conectado'}</div>
                </article>
              </div>
            </section>
          </div>

          <div className={styles.rightCol}>
            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.title}>Datos de tu perfil</h2>
                  <p className={styles.subtitle}>Actualiza la identidad pública del club dentro del panel.</p>
                </div>
              </div>

              <form onSubmit={onSave} style={{ display: 'grid', gap: 14 }}>
                <label className={styles.label}>
                  <span className={styles.labelText}>Email <i style={{ opacity: 0.6 }}>(solo lectura)</i></span>
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
                      className={`${styles.button} ${styles.buttonGhost}`}
                      style={{
                        textDecoration: 'none',
                        justifyContent: 'center',
                        opacity: igUrl ? 1 : 0.45,
                        pointerEvents: igUrl ? 'auto' : 'none',
                      }}
                    >
                      Ver Instagram {igHandle ? `(@${igHandle})` : ''}
                    </a>
                  </div>
                </div>

                <div className={styles.note}>
                  Consejo: usa el mismo nombre, avatar e Instagram que el público ya reconoce. Eso hace que el club se vea más sólido y coherente dentro de NightVibe.
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonGhost}`}
                    onClick={() => window.location.reload()}
                  >
                    Restaurar vista
                  </button>
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
        </div>
      </main>

      <style jsx>{`
        :global(html), :global(body) {
          background: #0b1220;
        }
        .${styles.page} {
          min-height: 100dvh;
          background: radial-gradient(circle at top, rgba(0,229,255,0.08), transparent 0 24%), #0b1220;
          color: #e6f0ff;
        }
        .${styles.container} {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 16px;
          display: grid;
          gap: 18px;
        }
        .${styles.hero} {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) auto;
          gap: 18px;
          align-items: center;
          padding: 26px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(0,229,255,0.12), rgba(15,22,41,0.96));
          border: 1px solid rgba(0,229,255,0.18);
          box-shadow: 0 18px 50px rgba(0,0,0,0.24);
        }
        .${styles.heroBadge} {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(0,229,255,0.2);
          background: rgba(0,229,255,0.08);
          color: #7dd3fc;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 14px;
        }
        .${styles.heroTitle} {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.02;
          letter-spacing: -0.03em;
          font-weight: 900;
        }
        .${styles.heroText} {
          color: #cbd5e1;
          line-height: 1.65;
          font-size: 15px;
          margin: 12px 0 0;
          max-width: 760px;
        }
        .${styles.grid} {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .${styles.leftCol}, .${styles.rightCol} {
          display: grid;
          gap: 16px;
        }
        .${styles.card} {
          border: 1px solid rgba(255,255,255,0.06);
          background: #0f172a;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.2);
        }
        .${styles.sectionHead} {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .${styles.title} {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .${styles.subtitle} {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin: 8px 0 0;
        }
        .${styles.avatarWrap} {
          display: grid;
          grid-template-columns: 132px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
        }
        .${styles.avatar} {
          width: 132px;
          height: 132px;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid #243044;
          background: #0b1424;
          flex: 0 0 auto;
        }
        .${styles.avatarMeta} {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        .${styles.infoGrid} {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .${styles.miniStat} {
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .${styles.miniStatLabel} {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .${styles.miniStatValue} {
          font-size: 15px;
          line-height: 1.5;
          font-weight: 800;
          word-break: break-word;
        }
        .${styles.input} {
          width: 100%;
          padding: 12px 14px;
          min-height: 48px;
          border-radius: 12px;
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
        .${styles.label} {
          display: grid;
          gap: 6px;
        }
        .${styles.labelText} {
          font-size: 12px;
          opacity: 0.82;
          font-weight: 700;
        }
        .${styles.button} {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          min-height: 46px;
          border-radius: 12px;
          background: #00e5ff;
          color: #001018;
          font-weight: 800;
          border: 1px solid #00d4eb;
          cursor: pointer;
          box-shadow: 0 12px 32px rgba(0,229,255,0.2);
        }
        .${styles.buttonGhost} {
          background: rgba(255,255,255,0.03);
          color: #e6f0ff;
          border: 1px solid #334155;
          box-shadow: none;
        }
        .${styles.buttonDanger} {
          background: rgba(244,63,94,0.08);
          color: #fecdd3;
          border: 1px solid rgba(244,63,94,0.2);
          box-shadow: none;
        }
        .${styles.button}[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .${styles.buttonBlock} {
          min-width: 180px;
        }
        .${styles.actions} {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .${styles.note}, .${styles.notice} {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #334155;
          background: #101829;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .${styles.notice} {
          border-color: rgba(0,229,255,0.16);
          background: rgba(0,229,255,0.06);
          color: #dff9ff;
        }
        .${styles.helper} {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }
        .nvp__row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 980px) {
          .${styles.hero} {
            grid-template-columns: 1fr;
          }
          .${styles.grid} {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .nvp__row2 {
            grid-template-columns: 1fr;
          }
          .${styles.avatarWrap} {
            grid-template-columns: 1fr;
          }
          .${styles.avatar} {
            width: 110px;
            height: 110px;
          }
          .${styles.actions} {
            justify-content: stretch;
          }
          .${styles.buttonBlock} {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
