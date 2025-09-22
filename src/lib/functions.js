// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;            // https://<project>.supabase.co
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;       // anon pública

if (!url || !anon) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// Permite sobreescribir el dominio de Functions (útil si usas un subdominio propio en Vercel)
const functionsUrlRaw = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${url}/functions/v1`;
const functionsUrl = functionsUrlRaw.replace(/\/+$/, ''); // normaliza sin / final

// ---- Singleton sólido con caché global (sobrevive HMR) ----
const globalKey = '__supabase_singleton__';

function create() {
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      // Throttle sano para no saturar
      params: { eventsPerSecond: 3 },
    },
    functions: {
      url: functionsUrl,
    },
    // (opcional) especifica schema si usas otro distinto de 'public'
    // db: { schema: 'public' },
  });
}

export const supabase =
  (globalThis[globalKey] ??= { client: create() }).client;
