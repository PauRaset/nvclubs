import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastHost from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "NightVibe · Panel de Clubs",
    template: "%s · NightVibe",
  },
  description:
    "Panel de gestión para clubs de NightVibe: eventos, entradas, cobros con Stripe, check-in QR, promociones y estadísticas.",
  applicationName: "NightVibe Clubs",
  icons: { icon: "/favicon.ico", apple: "/logo.png" },
  openGraph: {
    title: "NightVibe · Panel de Clubs",
    description:
      "Gestiona eventos, entradas, cobros, check-in QR, promociones y estadísticas de tu club en NightVibe.",
    siteName: "NightVibe Clubs",
    type: "website",
    locale: "es_ES",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "NightVibe · Panel de Clubs",
    description: "El panel de gestión para clubs de NightVibe.",
    images: ["/logo.png"],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // soporte para notches
  themeColor: '#070b14',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
