// app/register/page.jsx
export const metadata = { title: 'Registro de clubs · NightVibe' };

import RegistrationRequestForm from '@/components/RegistrationRequestForm';

export default function RegisterPage() {
  return (
    <main style={{ padding: 24, color: '#e5e7eb' }}>
      <h1 style={{ marginBottom: 16 }}>Registro de clubs</h1>
      <p style={{ marginTop: 0, marginBottom: 16, color: '#94a3b8' }}>
        Rellena la solicitud para crear tu cuenta de organizador. Te enviaremos un email para verificar la dirección.
      </p>
      <RegistrationRequestForm />
    </main>
  );
}