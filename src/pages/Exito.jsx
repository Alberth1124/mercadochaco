// src/pages/Exito.jsx
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function Exito(){
  const { pedidoId } = useParams();

  const descargarRecibo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return alert("Debes iniciar sesión.");

      const res = await fetch(
        `${FUNCTIONS_BASE}/recibo-pdf?pedido_id=${encodeURIComponent(pedidoId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`No se pudo generar el PDF (${res.status}): ${txt}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo-${pedidoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || e);
    }
  };

  return (
    <div className="container py-4" style={{maxWidth:720}}>
      <h3>¡Pago y datos de entrega guardados! 🎉</h3>
      <p className="text-muted">
        Hemos registrado tu pedido y los datos de entrega. Te mantendremos al tanto del envío.
      </p>

      <div className="d-flex gap-2 mt-3">
        <button onClick={descargarRecibo} className="btn btn-outline-primary">
          Descargar recibo (PDF)
        </button>
        <Link to="/mis-pedidos" className="btn btn-success">Ver mis pedidos</Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">Seguir comprando</Link>
      </div>
    </div>
  );
}
