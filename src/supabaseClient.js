import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;        // p.ej. https://xxxx.supabase.co
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;   // tu anon key

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
  // forzamos la URL de funciones para evitar rutas relativas
  functions: { url: `${url}/functions/v1` }
});

// Exporto la url por si usamos fallback con fetch:
export const functionsUrl = `${url}/functions/v1`;
