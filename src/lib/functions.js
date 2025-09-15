// src/lib/functions.js
import { supabase, FUNCTIONS_BASE } from '../supabaseClient';

export async function invokeOrFetch(name, body, options = {}) {
  // 1) Intento con invoke (la SDK adjunta el JWT si hay sesión)
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      // headers opcionales que necesites, pero NO pongas Authorization aquí
      headers: { ...(options.headers || {}) },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn(`[invoke] fallo ${name}:`, err?.status || '', err?.message || err);
    // 2) Fallback con fetch directo a la URL de functions
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    // agrega JWT si hay sesión (para RLS) — opcional
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch {}

    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Function ${name} (${res.status}): ${text || 'sin detalle'}`);
    try { return JSON.parse(text); } catch { return text; }
  }
}
