// app/page.jsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Home = listado de tus eventos
  redirect('/(app)/events');
}


/*// app/page.jsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige la home del panel al login
  redirect('/login');
}
*/
