"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

// Usamos el cliente estándar para el formulario de login (lado del cliente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas o usuario no autorizado.");
      setLoading(false);
    } else {
      // SALTO DIRECTO: Obliga al navegador a recargar y llevar las cookies de seguridad
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#0a1628] p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">GAME-LEGAL</h1>
          <p className="text-blue-300 text-xs font-bold tracking-widest mt-1">TOURNAMENT PRO</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Acceso a Organizadores</h2>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-red-200">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@torneo.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-2 disabled:opacity-70"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión Segura'}
            </button>
          </form>
          
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
            <Lock size={12} /> Entorno protegido con encriptación de extremo a extremo
          </p>
        </div>
      </div>
    </div>
  );
}
