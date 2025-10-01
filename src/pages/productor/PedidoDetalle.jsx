// src/pages/productor/PedidoDetalle.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Table, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";

const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;

export default function PedidoDetalleProductor(){
  const { pedidoId } = useParams();
  const { user } = useAuth();
  const [cab, setCab] = useState(null);   // { creado_en, estado, total, entrega_* }
  const [items, setItems] = useState([]); // [{ producto_nombre, cantidad, precio_unit }]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(()=>{ (async ()=>{
    if (!user?.id) return;
    setLoading(true); setErr(null);
    try {
      // Traemos SOLO las filas del productor para este pedido, desde la vista con overlay de estado
      const { data, error } = await supabase
        .from("v_pedidos_productor_detalle")
        .select("*")
        .eq("pedido_id", pedidoId)
        .eq("productor_id", user.id);
      if (error) throw error;

      if (!data || data.length === 0) {
        setErr("No tienes productos en este pedido o no existe.");
        setItems([]); setCab(null);
      } else {
        // Cabecera (tomamos de la primera fila)
        const r0 = data[0];
        setCab({
          id: r0.pedido_id,
          creado_en: r0.creado_en,
          estado: r0.estado,
          total: r0.total,
          // Entrega: priorizado desde pedidos_entrega por cómo está construida la vista
          contacto_nombre: r0.contacto_nombre || "",
          contacto_telefono: r0.contacto_telefono || "",
          entrega_direccion: r0.entrega_direccion || "",
          entrega_referencia: r0.entrega_referencia || "",
        });
        // Ítems de este productor
        setItems(data.map(r => ({
          producto_id: r.producto_id,
          producto_nombre: r.producto_nombre,
          cantidad: r.cantidad,
          precio_unit: r.precio_unit
        })));
      }
    } catch (e) {
      setErr(e.message || "No se pudo cargar el pedido");
      setItems([]); setCab(null);
    } finally {
      setLoading(false);
    }
  })(); }, [pedidoId, user?.id]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border"/></div>;
  if (err) return <Alert variant="danger">{err}</Alert>;
  if (!cab) return <Alert variant="warning">Pedido no encontrado</Alert>;

  const total = items.reduce((s, it)=> s + Number(it.cantidad)*Number(it.precio_unit||0), 0);

  return (
    <div className="container py-3" style={{maxWidth:900}}>
      <h4>Pedido {cab.id.slice(0,8)}…</h4>
      <p><b>Fecha:</b> {new Date(cab.creado_en).toLocaleString()}</p>
      <p><b>Estado:</b> {String(cab.estado)}</p>

      <div className="mb-3 p-3 border rounded">
        <div><b>Contacto:</b> {cab.contacto_nombre || "—"} {cab.contacto_telefono ? `— ${cab.contacto_telefono}` : ""}</div>
        <div><b>Dirección:</b> {cab.entrega_direccion || "—"}</div>
        {cab.entrega_referencia && <div><b>Referencia:</b> {cab.entrega_referencia}</div>}
      </div>

      <h6>Productos de mi tienda</h6>
      <Table bordered hover>
        <thead><tr><th>Producto</th><th>Cant.</th><th>PU</th><th>Subtotal</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.producto_id}>
              <td>{it.producto_nombre}</td>
              <td>{it.cantidad}</td>
              <td>{money(it.precio_unit)}</td>
              <td>{money(Number(it.cantidad)*Number(it.precio_unit||0))}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="text-end"><b>Total</b></td>
            <td><b>{money(total)}</b></td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}
