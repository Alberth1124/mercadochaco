// src/supabaseClient.ts (o .js)
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseUrl = rawUrl ? rawUrl.replace(/\/+$/, '') : '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// 👇 Usa dominio de Functions si lo defines; si no, fallback seguro
const rawFns = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();
export const functionsUrl =
  (rawFns && rawFns.replace(/\/+$/, '')) ||
  (supabaseUrl ? `${supabaseUrl}/functions/v1` : '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  functions: { url: functionsUrl }, // <- CLAVE
});
