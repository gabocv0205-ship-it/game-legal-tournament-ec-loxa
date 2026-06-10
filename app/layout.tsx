import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0a0a0a] text-white">
        {children}
      </body>
    </html>
  );
}
