// src/lib/functions.js
import { supabase } from "../supabaseClient";

function functionsBase() {
  const direct = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "");
  if (direct) return direct; // p.ej. https://<ref>.functions.supabase.co
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  return `${url}/functions/v1`;
}

/**
 * Invoca una Edge Function.
 * - Si hay token, lo manda en Authorization
 * - NO envía 'apikey' (no necesario para Functions)
 * - Devuelve JSON si el servidor responde JSON; si no, texto
 */
export async function invokeOrFetch(functionName, body, { token } = {}) {
  const base = functionsBase();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`; // solo si hay

  const res = await fetch(`${base}/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = typeof payload === "string" ? payload : (payload?.error || JSON.stringify(payload));
    throw new Error(`invoke ${functionName} ${res.status}: ${msg}`);
  }
  return payload;
}

/**
 * Alternativa: usa el cliente oficial, que agrega el token automáticamente.
 */
export async function invokeWithClient(functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: body ?? {} });
  if (error) throw error;
  return data;
}
