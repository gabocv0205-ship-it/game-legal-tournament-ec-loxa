import './globals.css';
import ThemeController from './ThemeController';

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
        {children}
        <ThemeController />
      </body>
    </html>
  );
}
