import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

export default function PedidosProductor() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
     .from("v_pedidos_productor")
     .select("*")
     .order("estado", { ascending: true })         // pagado arriba (si prefieres)
     .order("creado_en", { ascending: false });
      if (error) { console.error(error); return; }
      setRows(data || []);
    })();
  }, []);

  return (
    <div className="container">
      <h2>Pedidos (mis productos)</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.pedido_id}>
              <td>{new Date(r.creado_en).toLocaleString()}</td>
              <td>{r.pedido_id}</td>
              <td>{r.cliente_nombres} {r.cliente_apellidos}</td>
              <td>{r.estado}</td>
              <td><Link to={`/productor/pedidos/${r.pedido_id}`}>Ver</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
