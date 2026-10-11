// Comprobación de entorno: sin NEXT_PUBLIC_API_BASE válida no se compila ni se arranca
// el portal. Evita que un despliegue mal configurado hable con producción sin avisar.
// La misma regla se aplica en tiempo de ejecución en lib/apiBase.js.
const apiBase = String(process.env.NEXT_PUBLIC_API_BASE || '').trim();
let apiUrl = null;
try {
  apiUrl = new URL(apiBase);
} catch {
  apiUrl = null;
}
if (!apiUrl || (apiUrl.protocol !== 'https:' && apiUrl.protocol !== 'http:')) {
  throw new Error(
    `[next.config] NEXT_PUBLIC_API_BASE ${apiBase ? `no es una URL http(s) válida: "${apiBase}"` : 'no está definida'}. ` +
      'Defínela en .env.local (desarrollo) o en las variables de entorno de Vercel.'
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
