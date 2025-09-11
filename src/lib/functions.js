import { supabase, functionsUrl } from '../supabaseClient';

export async function invokeOrFetch(name, body, options = {}) {
  // Obtiene el access_token actual (si hay sesión)
  const { data: { session } } = await supabase.auth.getSession();
  const auth = session ? { Authorization: `Bearer ${session.access_token}` } : {};

  // 1) Intento con invoke (adjuntando siempre el JWT)
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: { ...auth, ...(options.headers || {}) },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn(`[invoke] fallo ${name}:`, err?.status || '', err?.message || err);

    // 2) Fallback con fetch directo a la URL de funciones (también con JWT)
    const res = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth, ...(options.headers || {}) },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Function ${name} (${res.status}): ${text || 'sin detalle'}`);
    try { return JSON.parse(text); } catch { return text; }
  }
}
