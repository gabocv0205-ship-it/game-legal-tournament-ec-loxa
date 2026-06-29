import './globals.css';
import type { Metadata, Viewport } from 'next';
import PwaRegister from './PwaRegister';
import ThemeController from './ThemeController';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var pref = localStorage.getItem('gamelegal-theme') || 'system';
                  var theme = pref === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                    : pref;
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.dataset.themePreference = pref;
                } catch (e) {
                  document.documentElement.dataset.theme = 'dark';
                  document.documentElement.dataset.themePreference = 'system';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#0a0a0a] text-white">
        <PwaRegister />
        {children}
        <ThemeController />
      </body>
    </html>
  );
}
