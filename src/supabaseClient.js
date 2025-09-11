// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Toma las variables y limpia espacios/slashes finales
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawUrl.replace(/\/+$/, ""); // quita "/" al final
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] Faltan variables de entorno: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Opcional pero recomendado para SPA modernas:
    flowType: "pkce",
  },
  // Para Edge Functions (evita 404 en Vercel al invocarlas)
  functions: {
    url: `${supabaseUrl}/functions/v1`,
  },
  // Opcional: encabezado para identificar el cliente en logs
  global: {
    headers: { "x-client-info": "mercadochaco-web" },
  },
});
