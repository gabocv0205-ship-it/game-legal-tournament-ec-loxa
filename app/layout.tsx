import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* SCRIPT DE EMERGENCIA: Fuerza el diseño ignorando los errores de Vercel */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
