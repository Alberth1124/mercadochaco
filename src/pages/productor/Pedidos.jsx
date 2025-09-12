import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Table, Badge, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../../supabaseClient";

const color = (e) => (e === "pagado" ? "success" : e === "pendiente" ? "warning" : "secondary");

export default function Pedidos(){
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState(null);

  useEffect(() => {
    (async ()=>{
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from("v_pedidos_productor") // vista que filtra “mis pedidos”
        .select("*")
        .order("estado", { ascending: true })       // pagados arriba
        .order("creado_en", { ascending: false });
      if (error) setErr(error.message); else setRows(data||[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container py-3">
      <h4>Pedidos</h4>
      {err && <Alert variant="danger">{err}</Alert>}
      {loading ? <div className="text-center py-5"><Spinner animation="border"/></div> :
      <Table responsive bordered hover className="mt-3">
        <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.pedido_id}>
              <td>{new Date(r.creado_en).toLocaleString()}</td>
              <td>{r.pedido_id.slice(0,8)}…</td>
              <td>{[r.cliente_nombres, r.cliente_apellidos].filter(Boolean).join(" ")}</td>
              <td><Badge bg={color(r.estado)}>{r.estado}</Badge></td>
              <td>Bs {Number(r.total||0).toFixed(2)}</td>
              <td><Link to={`/productor/pedidos/${r.pedido_id}`} className="btn btn-sm btn-outline-primary">Ver</Link></td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={6} className="text-center text-muted">No hay pedidos aún</td></tr>}
        </tbody>
      </Table>}
    </div>
  );
}
