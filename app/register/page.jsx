// app/register/page.jsx
export const metadata = { title: 'Registro de clubs · NightVibe' };

import RegistrationRequestForm from '@/components/RegistrationRequestForm';

export default function RegisterPage() {
  return (
    <main className="nv-page">
      <div className="nv-shell">
        <section className="nv-hero">
          <div className="nv-badge">Registro de clubs</div>
          <h1 className="nv-h1" style={{ marginTop: 16 }}>
            Crea tu cuenta de <span className="nv-accent-text">organizador</span>
          </h1>
          <p className="nv-lead" style={{ marginTop: 14, maxWidth: 560 }}>
            Rellena la solicitud para crear tu cuenta de organizador. Te enviaremos
            un email para verificar la dirección.
          </p>
        </section>

        <RegistrationRequestForm />
      </div>
    </main>
  );
}
