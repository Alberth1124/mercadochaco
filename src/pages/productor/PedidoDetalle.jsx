// src/pages/productor/PedidoDetalle.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Table, Spinner, Alert, Badge } from "react-bootstrap";
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
          // fallback por si tu vista ya trae algunos de estos campos
          contacto_nombre: r0.contacto_nombre || "",
          contacto_telefono: r0.contacto_telefono || "",
          entrega_direccion: r0.entrega_direccion || "",
          entrega_referencia: r0.entrega_referencia || "",
          entrega_departamento: r0.entrega_departamento || "",
          tipo_envio: r0.tipo_envio || "",
          empresa_envio: r0.empresa_envio || ""
        };

        const baseItems = det.map(r => ({
          producto_id: r.producto_id,
          producto_nombre: r.producto_nombre,
          cantidad: r.cantidad,
          precio_unit: r.precio_unit
        }));

        // 2) Entrega directa (garantiza ver lo guardado en Entrega.jsx)
        //    Requiere policy de SELECT para productor (p.ej. EXISTS con el pedido)
        const { data: ent, error: e2 } = await supabase
          .from("pedidos_entrega")
          .select("contacto_nombre, contacto_telefono, entrega_direccion, entrega_referencia, entrega_departamento, tipo_envio, empresa_envio, actualizado_en")
          .eq("pedido_id", pedidoId)
          .maybeSingle();
        if (e2) throw e2;

        const mergedCab = { ...baseCab, ...(ent || {}) };

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
          // merge suave de TODOS los campos nuevos también
          setCab(prev => prev ? ({
            ...prev,
            contacto_nombre:    ne.contacto_nombre    ?? prev.contacto_nombre,
            contacto_telefono:  ne.contacto_telefono  ?? prev.contacto_telefono,
            entrega_direccion:  ne.entrega_direccion  ?? prev.entrega_direccion,
            entrega_referencia: ne.entrega_referencia ?? prev.entrega_referencia,
            entrega_departamento: ne.entrega_departamento ?? prev.entrega_departamento,
            tipo_envio:         ne.tipo_envio         ?? prev.tipo_envio,
            empresa_envio:      ne.empresa_envio      ?? prev.empresa_envio,
          }) : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [pedidoId, user?.id]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border"/></div>;
  if (err) return <Alert variant="danger">{err}</Alert>;
  if (!cab) return <Alert variant="warning">Pedido no encontrado</Alert>;

  const total = items.reduce((s, it)=> s + Number(it.cantidad)*Number(it.precio_unit||0), 0);

  const estadoBadge = (st) => {
    const s = String(st || "").toLowerCase();
    const v = s === "pagado" ? "success" : s === "pendiente" ? "warning" : s === "cancelado" ? "danger" : "secondary";
    return <Badge bg={v}>{String(st)}</Badge>;
  };

  return (
    <div className="container py-3" style={{maxWidth:900}}>
      <h4 className="mb-1">Pedido {cab.id.slice(0,8)}…</h4>
      <div className="mb-2 small text-muted">Fecha: {new Date(cab.creado_en).toLocaleString()}</div>
      <div className="mb-3">{estadoBadge(cab.estado)}</div>

      <div className="mb-3 p-3 border rounded">
        <div><b>Contacto:</b> {cab.contacto_nombre || "—"}{cab.contacto_telefono ? ` — ${cab.contacto_telefono}` : ""}</div>
        <div className="mt-1 d-flex align-items-center" style={{gap:8}}>
          <b>Departamento:</b>
          {cab.entrega_departamento ? <Badge bg="info">{cab.entrega_departamento}</Badge> : <span>—</span>}
        </div>
        <div className="mt-1"><b>Dirección:</b> {cab.entrega_direccion || "—"}</div>
        {cab.entrega_referencia && <div className="mt-1"><b>Referencia:</b> {cab.entrega_referencia}</div>}
        <div className="mt-2 d-flex align-items-center" style={{gap:8}}>
          <b>Tipo de envío:</b>
          {cab.tipo_envio ? <Badge bg="secondary">{cab.tipo_envio}</Badge> : <span>—</span>}
          {cab.empresa_envio ? <span className="ms-2">• Empresa: <b>{cab.empresa_envio}</b></span> : null}
        </div>
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
