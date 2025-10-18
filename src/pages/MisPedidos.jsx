// src/pages/MisPedidos.jsx
import { useEffect, useMemo, useState } from "react";
import { Table, Badge, Spinner, Alert, Row, Col, Form } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const FN_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function MisPedidos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState(""); // 🔍 buscador

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from("v_pedidos_detalle")
        .select("*")
        .eq("cliente_id", user.id)          // ← ya agregaste cliente_id en la vista
        .order("creado_en", { ascending: false });
      if (error) setErr(error.message); else setRows(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const color = (estado) =>
    estado === "pagado" ? "success" :
    estado === "pendiente" ? "warning" : "secondary";

  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;

  const descargarRecibo = async (pedidoId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return alert("Debes iniciar sesión.");
      const res = await fetch(`${FN_BASE}/recibo-pdf?pedido_id=${encodeURIComponent(pedidoId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`No se pudo generar el PDF (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo-${pedidoId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || e);
    }
  };

  // 🔎 Filtrado por texto libre
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter(r => {
      const fecha = new Date(r.creado_en).toLocaleString().toLowerCase();
      const pedido = String(r.pedido_id || "").toLowerCase();
      const producto = String(r.producto_nombre || "").toLowerCase();
      const estado = String(r.estado || "").toLowerCase();
      const cant = String(r.cantidad ?? "").toLowerCase();
      const pu = money(r.precio_unit).toLowerCase();
      const subtotal = money(Number(r.cantidad) * Number(r.precio_unit)).toLowerCase();

      return (
        fecha.includes(term) ||
        pedido.includes(term) ||
        producto.includes(term) ||
        estado.includes(term) ||
        cant.includes(term) ||
        pu.includes(term) ||
        subtotal.includes(term)
      );
    });
  }, [rows, q]);

  return (
    <div>
      <h4>Mis pedidos</h4>

      <Row className="g-2 mt-2">
        <Col md={6}>
          <Form.Control
            placeholder="Buscar por fecha, pedido, producto, estado…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Col>
      </Row>

      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>PU</th>
              <th>Subtotal</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => {
              const subtotal = Number(r.cantidad) * Number(r.precio_unit);
              return (
                <tr key={`${r.pedido_id}:${r.producto_id}`}>
                  <td>{new Date(r.creado_en).toLocaleString()}</td>
                  <td>{r.pedido_id.slice(0, 8)}…</td>
                  <td>{r.producto_nombre}</td>
                  <td>{r.cantidad}</td>
                  <td>{money(r.precio_unit)}</td>
                  <td>{money(subtotal)}</td>
                  <td><Badge bg={color(r.estado)}>{r.estado}</Badge></td>
                  <td>
                    {r.estado === "pagado"
                      ? <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => descargarRecibo(r.pedido_id)}
                        >
                          Recibo
                        </button>
                      : "—"}
                  </td>
                </tr>
              );
            })}

            {/* Mensajes de estado */}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted">Aún no tienes pedidos</td></tr>
            )}
            {rows.length > 0 && filtrados.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted">No hay coincidencias para “{q}”.</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
