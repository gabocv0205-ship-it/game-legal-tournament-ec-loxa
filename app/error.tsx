"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/monitoring/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: error.message, digest: error.digest, path: window.location.pathname }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <section className="max-w-lg text-center bg-[#141414] border border-red-900/60 rounded-2xl p-8">
        <p className="text-red-400 text-xs font-black uppercase tracking-widest">Incidente registrado</p>
        <h1 className="text-2xl font-black uppercase mt-3">No pudimos completar esta operación</h1>
        <p className="text-gray-400 text-sm mt-3">El error fue enviado al registro técnico. Puedes intentar nuevamente sin perder el contexto del torneo.</p>
        <button onClick={reset} className="mt-6 bg-[#D4A017] text-black px-6 py-3 rounded-xl font-black uppercase text-xs">Reintentar</button>
      </section>
    </main>
  );
}
