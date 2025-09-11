import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function PedidoDetalleProductor() {
  const { pedidoId } = useParams();
  const [cab, setCab] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: head } = await supabase
        .from("v_pedidos_productor")
        .select("*")
        .eq("pedido_id", pedidoId)
        .single();
      setCab(head);

      const { data: its } = await supabase
        .from("pedidos_items")
        .select(`
          id, cantidad, precio_unit,
          productos!inner(id, nombre)
        `)
        .eq("pedido_id", pedidoId);
      setItems(its || []);
    })();
  }, [pedidoId]);

  if (!cab) return <p>Cargando…</p>;

  return (
    <div className="container" style={{maxWidth: 780, margin: "20px auto"}}>
      <h2>Pedido {pedidoId}</h2>
      <p><b>Cliente:</b> {cab.cliente_nombres} {cab.cliente_apellidos}</p>
      <p><b>Contacto:</b> {cab.contacto_nombre} — {cab.contacto_telefono}</p>
      <p><b>Entrega:</b> {cab.entrega_direccion}</p>
      {cab.entrega_referencia && <p><b>Referencia:</b> {cab.entrega_referencia}</p>}

      <h3>Ítems (tus productos)</h3>
      <ul>
        {items?.map(it => (
          <li key={it.id}>{it.productos?.nombre} × {it.cantidad} (Bs {Number(it.precio_unit).toFixed(2)})</li>
        ))}
      </ul>
    </div>
  );
}
