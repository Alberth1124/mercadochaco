import { useParams, Link } from "react-router-dom";

const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function Exito(){
  const { pedidoId } = useParams();
  const reciboHref = `${FUNCTIONS_BASE}/recibo-pdf?pedido_id=${encodeURIComponent(pedidoId)}`;

  return (
    <div className="container py-4" style={{maxWidth:720}}>
      <h3>¡Pago y datos de entrega guardados! 🎉</h3>
      <p className="text-muted">
        Hemos registrado tu pedido y los datos de entrega. Te mantendremos al tanto del envío.
      </p>

      <div className="d-flex gap-2 mt-3">
        <a href={reciboHref} className="btn btn-outline-primary" target="_blank" rel="noreferrer">
          Descargar recibo (PDF)
        </a>
        <Link to="/mis-pedidos" className="btn btn-success">
          Ver mis pedidos
        </Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
