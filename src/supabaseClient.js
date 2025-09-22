// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;            // https://<project>.supabase.co
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;      // anon pública

if (!url || !anon) {
  // Falla temprano si falta configuración
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// Permite sobreescribir el dominio de Functions (útil si usas un subdominio propio en Vercel)
const functionsUrlRaw =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${url}/functions/v1`;
const functionsUrl = functionsUrlRaw.replace(/\/+$/, ''); // sin / al final

// Singleton para evitar doble instanciación (y duplicar suscripciones Realtime)
let _client;
export const supabase = (() => {
  if (_client) return _client;

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      // Limita eventos por segundo para no saturar en páginas muy activas
      params: { eventsPerSecond: 3 },
    },
    functions: {
      url: functionsUrl,
    },
  });

  return _client;
})();
