// app/page.js
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige la home del panel al login
  redirect('/login');
}
