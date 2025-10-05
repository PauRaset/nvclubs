/*// app/page.jsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Home = listado de tus eventos
  redirect('/(app)/events');
}*/

// app/page.jsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Elige UNA de estas y deja la otra comentada
  redirect('/events');     // ← si tu Home es el listado de eventos
  // redirect('/dashboard'); // ← si prefieres llevarlo al dashboard
}
