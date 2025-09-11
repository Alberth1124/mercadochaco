import { supabase, functionsUrl } from '../supabaseClient';

export async function invokeOrFetch(name, body, options = {}) {
  // 1) intento con invoke (gestiona CORS/domino)
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: options.headers,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn(`[invoke] fallo ${name}:`, err?.message || err);

    // 2) fallback con fetch a la URL completa
    const res = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Function ${name} (${res.status}): ${text || 'sin detalle'}`);
    try { return JSON.parse(text); } catch { return text; }
  }
}
