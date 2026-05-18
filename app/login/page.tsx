"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Usamos el cliente estándar para el formulario de login (lado del cliente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas o usuario no autorizado.");
      setLoading(false);
    } else {
      // SALTO DIRECTO: Obliga al navegador a recargar y llevar las cookies de seguridad
      window.location.href = '/dashboard';
    }
  };
