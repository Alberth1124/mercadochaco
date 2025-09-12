// src/pages/Exito.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { enviarEmailDemo, abrirPreviewEmailDemo } from "../lib/demoMail";

const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

export default function Exito() {
  const { pedidoId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  // ↓↓↓ Descargar PDF del recibo (Edge Function: recibo-pdf)
  const descargarRecibo = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Debes iniciar sesión.");

      const url = `${FUNCTIONS_BASE}/recibo-pdf?pedido_id=${encodeURIComponent(pedidoId)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`No se pudo generar el PDF (${res.status})${txt ? `: ${txt}` : ""}`);
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `recibo-${pedidoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch (e) {
      alert(e.message || e);
    } finally {
      setDownloading(false);
    }
  };

  // ↓↓↓ Enviar email DEMO + abrir previsualización (send-email-demo + email-preview-demo)
  const enviarReciboDemo = async () => {
    if (emailing) return;
    setEmailing(true);
    try {
      // destinatario: email del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Debes iniciar sesión (no hay email de usuario).");
      const to = user.email;

      // obtener total del pedido para el cuerpo del correo
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .select("id,total")
        .eq("id", pedidoId)
        .single();

      if (error || !pedido) throw new Error("No se pudo leer el pedido.");

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
          <h2 style="margin:0 0 8px;">Recibo de tu pedido #${pedido.id}</h2>
          <p style="margin:0 0 8px;">Total: <b>Bs ${Number(pedido.total || 0).toFixed(2)}</b></p>
          <p style="margin:0;">¡Gracias por tu compra en Mercado Chaco!</p>
        </div>
      `;

      const id = await enviarEmailDemo({
        to,
        subject: `Recibo pedido #${pedido.id}`,
        html,
      });

      // abrir previsualización del “correo”
      await abrirPreviewEmailDemo(id);
    } catch (e) {
      alert(e.message || e);
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h3>¡Pago y datos de entrega guardados! 🎉</h3>
      <p className="text-muted">
        Hemos registrado tu pedido y los datos de entrega. Te mantendremos al tanto del envío.
      </p>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <button
          onClick={descargarRecibo}
          className="btn btn-outline-primary"
          disabled={downloading}
        >
          {downloading ? "Preparando PDF…" : "Descargar recibo (PDF)"}
        </button>

        <button
          onClick={enviarReciboDemo}
          className="btn btn-outline-dark"
          disabled={emailing}
          title="Guarda el correo demo en la tabla y abre la previsualización"
        >
          {emailing ? "Preparando correo…" : "Ver correo recibo (DEMO)"}
        </button>

        <Link to="/mis-pedidos" className="btn btn-success">Ver mis pedidos</Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">Seguir comprando</Link>
      </div>
    </div>
  );
}
