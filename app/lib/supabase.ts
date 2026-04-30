import { createClient } from '@supabase/supabase-js';

// Aquí la aplicación va y lee las llaves secretas que guardaste en el .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creamos la conexión oficial
export const supabase = createClient(supabaseUrl, supabaseKey);