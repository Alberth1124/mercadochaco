import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Table, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function PedidoDetalleProductor(){
  const { pedidoId } = useParams();
  const { user } = useAuth();
  const [cab, setCab] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(()=>{ (async ()=>{
    setLoading(true); setErr(null);

    // Cabecera (RLS permite al productor leer si participa)
    const { data: c, error: e1 } = await supabase
      .from("pedidos")
      .select("id, creado_en, estado, total, contacto_nombre, contacto_telefono, entrega_direccion, entrega_referencia")
      .eq("id", pedidoId)
      .maybeSingle();
    if (e1) { setErr(e1.message); setLoading(false); return; }
    setCab(c);

    // Solo los ítems de ESTE productor (join interno por usuario_id)
    const { data: it, error: e2 } = await supabase
      .from("pedidos_items")
      .select("cantidad, precio_unit, productos!inner(id, nombre, usuario_id)")
      .eq("pedido_id", pedidoId)
      .eq("productos.usuario_id", user.id);
    if (e2) setErr(e2.message); else setItems(it||[]);
    setLoading(false);
  })(); }, [pedidoId, user?.id]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border"/></div>;
  if (err) return <Alert variant="danger">{err}</Alert>;
  if (!cab) return <Alert variant="warning">Pedido no encontrado</Alert>;

  const total = items.reduce((s, it)=> s + Number(it.cantidad)*Number(it.precio_unit||0), 0);
  return (
    <div className="container py-3" style={{maxWidth:900}}>
      <h4>Pedido {cab.id.slice(0,8)}…</h4>
      <p><b>Fecha:</b> {new Date(cab.creado_en).toLocaleString()}</p>
      <p><b>Estado:</b> {cab.estado}</p>
      <div className="mb-3 p-3 border rounded">
        <div><b>Contacto:</b> {cab.contacto_nombre} — {cab.contacto_telefono}</div>
        <div><b>Dirección:</b> {cab.entrega_direccion}</div>
        {cab.entrega_referencia && <div><b>Referencia:</b> {cab.entrega_referencia}</div>}
      </div>

      <h6>Productos de mi tienda</h6>
      <Table bordered hover>
        <thead><tr><th>Producto</th><th>Cant.</th><th>PU</th><th>Subtotal</th></tr></thead>
        <tbody>
          {items.map((it, i)=>(
            <tr key={i}>
              <td>{it.productos?.nombre}</td>
              <td>{it.cantidad}</td>
              <td>Bs {Number(it.precio_unit||0).toFixed(2)}</td>
              <td>Bs {(Number(it.cantidad)*Number(it.precio_unit||0)).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="text-end"><b>Total</b></td>
            <td><b>Bs {total.toFixed(2)}</b></td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}
