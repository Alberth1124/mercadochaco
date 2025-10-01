// src/pages/Exito.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Base de Functions: usa VITE_SUPABASE_FUNCTIONS_URL si está, sino arma la URL desde VITE_SUPABASE_URL
const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

export default function Exito() {
  const { pedidoId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Descargar PDF del recibo (Edge Function: recibo-pdf) usando POST -> Blob
  const descargarRecibo = async () => {
    if (downloading) return;
    setDownloading(true);
    setErrorMsg("");
    try {
      // Si tienes sesión y quieres pasar el token (no es obligatorio en nuestra función):
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token;

      const res = await fetch(`${FUNCTIONS_BASE}/recibo-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}), // opcional
          Accept: "application/pdf",
        },
        body: JSON.stringify({ pedidoId }),
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
      setErrorMsg(e?.message || "No se pudo descargar el recibo");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h3>✅ ¡Pago exitoso!</h3>
      <p className="text-muted">
        Tu pedido <b>{pedidoId}</b> fue confirmado. Hemos registrado también los datos de entrega.
      </p>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <button
          onClick={descargarRecibo}
          className="btn btn-outline-primary"
          disabled={downloading}
        >
          {downloading ? "Generando PDF…" : "Descargar recibo (PDF)"}
        </button>


        <Link to="/mis-pedidos" className="btn btn-success">Ver mis pedidos</Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">Seguir comprando</Link>
      </div>

      {errorMsg && <p style={{ color: "red", marginTop: 12 }}>{errorMsg}</p>}
    </div>
  );
}
