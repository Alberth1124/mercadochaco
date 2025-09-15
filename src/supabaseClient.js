import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const fromEnv = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '').replace(/\/+$/, '');
const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
export const FUNCTIONS_BASE = fromEnv || `https://${projectRef}.functions.supabase.co`;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  functions: { url: FUNCTIONS_BASE }, // 👈 clave
});
// Exporta por si alguna vez haces fetch manual (no necesario con .invoke)
export { FUNCTIONS_BASE };
