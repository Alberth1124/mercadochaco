// src/pages/PanelProductor.jsx
import { useEffect, useState } from "react";
import { Table, Badge, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
const badgeColor = (e) => {
  const s = String(e || "").toLowerCase();
  return s === "pagado" ? "success" : s === "pendiente" ? "warning" : s === "cancelado" ? "danger" : "secondary";
};

export default function PanelProductor() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true); setErr(null);
      try {
        // Vista con overlay de estado desde pagos_sip
        const { data, error } = await supabase
          .from("v_pedidos_productor_detalle")
          .select("creado_en, producto_nombre, cliente_nombre, cliente_email, cantidad, precio_unit, estado")
          .eq("productor_id", user.id)     // solo mis productos
          .eq("estado", "pagado")          // solo ítems pagados
          .order("creado_en", { ascending: false });
        if (error) throw error;
        setRows(data || []);
      } catch (e) {
        setErr(e.message || "No se pudo cargar");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <div className="container py-3">
      <h4>Mis ventas</h4>

      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted">Aún no tienes ventas</td></tr>
            )}

            {rows.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.creado_en).toLocaleString()}</td>
                <td>{r.producto_nombre}</td>
                <td>{r.cliente_nombre || r.cliente_email || "—"}</td>
                <td>{r.cantidad}</td>
                <td>{money(Number(r.cantidad) * Number(r.precio_unit || 0))}</td>
                <td><Badge bg={badgeColor(r.estado)}>{String(r.estado)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
