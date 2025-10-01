import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Table, Badge, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";

const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
const color = (e) => {
  const s = String(e || "").toLowerCase();
  return s === "pagado" ? "success" : s === "pendiente" ? "warning" : s === "cancelado" ? "danger" : "secondary";
};

export default function Pedidos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data, error } = await supabase
          .from("v_pedidos_productor_detalle")         // 👈 vista nueva
          .select("*")
          .eq("productor_id", user.id)                 // 👈 filtro clave
          .order("creado_en", { ascending: false });
        if (error) throw error;
        setRows(data || []);
      } catch (e) {
        setErr(e.message || "No se pudo cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // Agrupar por pedido (porque la vista está a nivel de ítems)
  const pedidos = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.pedido_id)) {
        map.set(r.pedido_id, {
          pedido_id: r.pedido_id,
          creado_en: r.creado_en,
          estado: r.estado,
          total: r.total,
          cliente_email: r.cliente_email || "",
          cliente_nombre: r.cliente_nombre || "",
          items: [],
        });
      }
      map.get(r.pedido_id).items.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  return (
    <div className="container py-3">
      <h4>Pedidos</h4>
      {err && <Alert variant="danger">{err}</Alert>}
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <>
                <tr key={p.pedido_id}>
                  <td>{new Date(p.creado_en).toLocaleString()}</td>
                  <td>{p.pedido_id.slice(0, 8)}…</td>
                  <td>{p.cliente_nombre || p.cliente_email || "—"}</td>
                  <td><Badge bg={color(p.estado)}>{String(p.estado)}</Badge></td>
                  <td>{money(p.total)}</td>
                  <td>
                    <Link to={`/productor/pedidos/${p.pedido_id}`} className="btn btn-sm btn-outline-primary">
                      Ver
                    </Link>
                  </td>
                </tr>

                {/* Subtabla de ítems */}
                <tr>
                  <td colSpan={6} className="p-0">
                    <Table size="sm" bordered className="mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "45%" }}>Producto</th>
                          <th>Cant.</th>
                          <th>PU</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((it) => (
                          <tr key={`${p.pedido_id}:${it.producto_id}`}>
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
              </>
            ))}
            {pedidos.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted">No hay pedidos aún</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
