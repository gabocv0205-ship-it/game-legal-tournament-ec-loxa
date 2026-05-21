import Script from 'next/script';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0a0a0a] text-white">
        {children}
        {/* Este Script inyecta los estilos a la fuerza */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
