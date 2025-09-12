// src/lib/demoMail.js
import { supabase } from "../supabaseClient";

const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

export async function enviarEmailDemo({ to, subject, html }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Inicia sesión.");

  const res = await fetch(`${FUNCTIONS_BASE}/send-email-demo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ to, subject, html }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo crear el email demo.");
  return json.id; // ← guarda este id para previsualizar
}

export async function abrirPreviewEmailDemo(id) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Inicia sesión.");

  const url = `${FUNCTIONS_BASE}/email-preview-demo?id=${encodeURIComponent(id)}`;
  // Abrir nueva pestaña con el html (RLS protege por usuario)
  window.open(url, "_blank", "noopener,noreferrer");
}
