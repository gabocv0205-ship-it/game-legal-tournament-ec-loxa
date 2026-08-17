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
  themeColor: '#eef8ef',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-admin-theme="light" data-public-theme="light" suppressHydrationWarning>
      <body className="bg-[#eef8ef] text-[#06140c]">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
