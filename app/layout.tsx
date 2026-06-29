import './globals.css';
import type { Metadata, Viewport } from 'next';
import PwaRegister from './PwaRegister';

export const metadata: Metadata = {
  title: 'Game Legal Tournament',
  description: 'Plataforma profesional para gestion y publicacion de torneos deportivos.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Game Legal',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#050807',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[#0a0a0a] text-white">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
