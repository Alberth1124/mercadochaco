import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL; // https://vfsboksy...supabase.co
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const functionsUrl =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${url}/functions/v1`).replace(/\/+$/, "");

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  functions: { url: functionsUrl },
});

