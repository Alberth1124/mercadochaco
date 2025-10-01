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
  const [cab, setCab] = useState(null);   // { id, creado_en, estado, total, contacto_*, entrega_* }
  const [items, setItems] = useState([]); // [{ producto_id, producto_nombre, cantidad, precio_unit }]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(()=>{ 
    if (!user?.id) return;

    let mounted = true;
    const cargar = async () => {
      setLoading(true); setErr(null);
      try {
        // 1) Ítems + cabecera base desde la vista (overlay de estado pagado)
        const { data: det, error: e1 } = await supabase
          .from("v_pedidos_productor_detalle")
          .select("*")
          .eq("pedido_id", pedidoId)
          .eq("productor_id", user.id);

        if (e1) throw e1;
        if (!det || det.length === 0) {
          if (mounted) { setErr("No tienes productos en este pedido o no existe."); setItems([]); setCab(null); }
          return;
        }

        const r0 = det[0];
        const baseCab = {
          id: r0.pedido_id,
          creado_en: r0.creado_en,
          estado: r0.estado,
          total: r0.total,
          // si tu vista ya trae estos campos coalescidos, quedarán como fallback
          contacto_nombre: r0.contacto_nombre || "",
          contacto_telefono: r0.contacto_telefono || "",
          entrega_direccion: r0.entrega_direccion || "",
          entrega_referencia: r0.entrega_referencia || "",
        };

        const baseItems = det.map(r => ({
          producto_id: r.producto_id,
          producto_nombre: r.producto_nombre,
          cantidad: r.cantidad,
          precio_unit: r.precio_unit
        }));

        // 2) Entrega directa (garantiza ver lo guardado en Entrega.jsx)
        //    Requiere la política RLS de SELECT para productor (is_productor_in_pedido)
        const { data: ent, error: e2 } = await supabase
          .from("pedidos_entrega")
          .select("contacto_nombre, contacto_telefono, entrega_direccion, entrega_referencia, actualizado_en")
          .eq("pedido_id", pedidoId)
          .maybeSingle();
        if (e2) throw e2;

        const mergedCab = {
          ...baseCab,
          ...(ent || {}),   // prioridad a lo guardado por el cliente
        };

        if (mounted) {
          setCab(mergedCab);
          setItems(baseItems);
        }
      } catch (e) {
        if (mounted) { setErr(e.message || "No se pudo cargar el pedido"); setItems([]); setCab(null); }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargar();

    // 3) Realtime: si el cliente edita entrega, el productor lo ve al instante
    const ch = supabase
      .channel(`prod:entrega:${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_entrega", filter: `pedido_id=eq.${pedidoId}` },
        (payload) => {
          const ne = payload?.new || {};
          // merge suave
          setCab(prev => prev ? ({
            ...prev,
            contacto_nombre: ne.contacto_nombre ?? prev.contacto_nombre,
            contacto_telefono: ne.contacto_telefono ?? prev.contacto_telefono,
            entrega_direccion: ne.entrega_direccion ?? prev.entrega_direccion,
            entrega_referencia: ne.entrega_referencia ?? prev.entrega_referencia,
          }) : prev);
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [pedidoId, user?.id]);

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
        <div><b>Contacto:</b> {cab.contacto_nombre || "—"}{cab.contacto_telefono ? ` — ${cab.contacto_telefono}` : ""}</div>
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
