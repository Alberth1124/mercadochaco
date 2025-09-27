// src/pages/AdminPedidos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const functionsBase =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

export default function AdminPedidos() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ===== Utils =====
  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
  const color = (estado) =>
    String(estado).toLowerCase() === "pagado"
      ? "success"
      : String(estado).toLowerCase() === "pendiente"
      ? "warning"
      : String(estado).toLowerCase() === "cancelado"
      ? "danger"
      : "secondary";

  // ===== Cargar si usuario es admin =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return setIsAdmin(false);
        const { data, error } = await supabase
          .from("perfiles")
          .select("es_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (mounted) setIsAdmin(!!data?.es_admin);
      } catch {
        setIsAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ===== Carga base =====
  const cargar = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("v_pedidos_detalle")
        .select("*")
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar la lista");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ===== Realtime: recargar cuando cambien pagos_sip o pedidos =====
  useEffect(() => {
    const ch = supabase
      .channel("admin:pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos_sip" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ===== Agrupar filas por pedido =====
  const pedidos = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.pedido_id)) {
        map.set(r.pedido_id, {
          pedido_id: r.pedido_id,
          cliente_email: r.cliente_email,
          estado: r.estado,
          creado_en: r.creado_en,
          total: r.total,
          items: [],
        });
      }
      map.get(r.pedido_id).items.push(r);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
    );
  }, [rows]);
  
 const confirmarPagoDev = async (pedido_id) => {
  if (!isAdmin) { setErr("Solo administradores pueden confirmar pagos."); return; }
  if (!window.confirm(`¿Confirmar pago (DEV) del pedido ${pedido_id}?`)) return;

  setConfirmingId(pedido_id); setErr(null);
  try {
    const { data, error } = await supabase.rpc("fn_admin_confirmar_pago_dev_auth", {
      p_pedido: pedido_id,
      p_alias: null,
      p_payload: { manual_dev: true, source: "admin-ui", ts: new Date().toISOString() }
    });
    if (error) {
      console.error("RPC error:", error);               // 👈 verás .code/.details en consola
      throw new Error(error.message || "RPC falló");
    }
    alert("Pago confirmado (DEV).");
    await cargar();
  } catch (e) {
    setErr(e.message || "No se pudo confirmar el pago");
  } finally {
    setConfirmingId(null);
  }
};

  // ===== Descargar recibo (PDF) =====
  const descargarRecibo = (pedido_id) => {
    const url = `${functionsBase}/recibo-pdf?pedido_id=${encodeURIComponent(pedido_id)}`;
    window.open(url, "_blank");
  };

  // ===== (Opcional) forzar estados legacy con RPC existente =====
  const cambiarEstadoRPC = async (pedido_id, estado) => {
    try {
      const { error } = await supabase.rpc("admin_cambiar_estado_pedido", {
        p_pedido: pedido_id,
        p_estado: estado,
      });
      if (error) throw error;
      await cargar();
    } catch (e) {
      setErr(e.message || "No se pudo cambiar el estado");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Pedidos (Admin)</h4>
        <div className="d-flex gap-2">
          {!isAdmin && (
            <Badge bg="secondary" title="Esta vista requiere permisos de admin">
              Modo lectura
            </Badge>
          )}
          <Button variant="outline-secondary" onClick={cargar} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Refrescar"}
          </Button>
        </div>
      </div>

      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted">Sin pedidos</td></tr>
            )}

            {pedidos.map((p) => (
              <React.Fragment key={p.pedido_id}>
                <tr>
                  <td>{new Date(p.creado_en).toLocaleString()}</td>
                  <td>{p.pedido_id}</td>
                  <td>{p.cliente_email}</td>
                  <td><Badge bg={color(p.estado)}>{p.estado}</Badge></td>
                  <td>{money(p.total)}</td>
                  <td className="d-flex flex-wrap gap-2">
                    {/* Confirmar pago (DEV) → actualiza pagos_sip + stock y dispara Realtime */}
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => confirmarPagoDev(p.pedido_id)}
                      disabled={!isAdmin || String(p.estado).toLowerCase() === "pagado" || confirmingId === p.pedido_id}
                      title="Confirma pago sin depender del callback de SIP (solo pruebas DEV)"
                    >
                      {confirmingId === p.pedido_id ? "Confirmando…" : "Marcar pagado (DEV)"}
                    </Button>

                    {/* Recibo PDF */}
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => descargarRecibo(p.pedido_id)}
                    >
                      Recibo (PDF)
                    </Button>

                    {/* Opcional: tus botones legacy por RPC (no disparan Realtime del cliente) */}
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => cambiarEstadoRPC(p.pedido_id, "pendiente")}
                      disabled={String(p.estado).toLowerCase() === "pendiente"}
                      title="(Opcional) Cambiar con RPC legacy"
                    >
                      Pendiente (RPC)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => cambiarEstadoRPC(p.pedido_id, "cancelado")}
                      disabled={String(p.estado).toLowerCase() === "cancelado"}
                      title="(Opcional) Cambiar con RPC legacy"
                    >
                      Cancelar (RPC)
                    </Button>
                  </td>
                </tr>

                {/* Subtabla de ítems */}
                <tr>
                  <td colSpan={6} className="p-0">
                    <Table size="sm" bordered className="mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "40%" }}>Producto</th>
                          <th>Cant.</th>
                          <th>PU</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((it) => (
                          <tr key={`${p.pedido_id}-${it.producto_id}`}>
                            <td>{it.producto_nombre}</td>
                            <td>{it.cantidad}</td>
                            <td>{money(it.precio_unit)}</td>
                            <td>{money(it.cantidad * it.precio_unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
