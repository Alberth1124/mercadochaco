// src/lib/functions.js
export async function invokeOrFetch(functionName, body, { token }) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // Enviar el token de autorización
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY  // Enviar el apikey para autenticación
    },
    body: JSON.stringify(body)
  });

  // Verifica si la respuesta es válida
  if (!response.ok) {
    throw new Error(`Error al invocar la función ${functionName}: ${response.statusText}`);
  }

  return response.json();
}
