import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Table, Badge, Spinner, Alert, Form, Row, Col } from "react-bootstrap";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";

const color = (e) => {
  const s = String(e || "").toLowerCase();
  return s === "pagado" ? "success" : s === "pendiente" ? "warning" : s === "cancelado" ? "danger" : "secondary";
};

export default function Pedidos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState(""); // 🔍 buscador

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data, error } = await supabase
          .from("v_pedidos_productor_detalle") // vista a nivel de ítems
          .select("*")
          .eq("productor_id", user.id)
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

  // Agrupar por pedido y armar resumen de productos
  const pedidos = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.pedido_id)) {
        map.set(r.pedido_id, {
          pedido_id: r.pedido_id,
          creado_en: r.creado_en,
          estado: r.estado,
          // total eliminado
          productos: [], // nombres
        });
      }
      const entry = map.get(r.pedido_id);
      if (r.producto_nombre) entry.productos.push(String(r.producto_nombre));
    }

    // Para mostrar en “Cliente” => nombre del producto (si hay varios, “( +N más )”)
    const list = Array.from(map.values()).map(p => {
      const uniq = Array.from(new Set(p.productos));
      const head = uniq[0] || "—";
      const extra = uniq.length > 1 ? ` (+${uniq.length - 1} más)` : "";
      return { ...p, productoResumen: head + extra, productosSearch: uniq.join(" ") };
    });

    return list;
  }, [rows]);

  // Filtro por buscador: producto / estado / id de pedido
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return pedidos;
    return pedidos.filter(p =>
      p.productoResumen.toLowerCase().includes(term) ||
      p.productosSearch.toLowerCase().includes(term) ||
      String(p.estado || "").toLowerCase().includes(term) ||
      String(p.pedido_id || "").toLowerCase().includes(term)
    );
  }, [q, pedidos]);

  return (
    <div className="container py-3">
      <h4>Pedidos</h4>

      <Row className="g-2 mt-2">
        <Col md={6}>
          <Form.Control
            placeholder="Buscar por producto, estado o ID de pedido…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </Col>
      </Row>

      {err && <Alert variant="danger" className="mt-3">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Producto</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.pedido_id}>
                <td>{new Date(p.creado_en).toLocaleString()}</td>
                <td title={p.pedido_id}>{p.pedido_id.slice(0, 8)}…</td>
                {/* Ahora aquí va el nombre del producto */}
                <td title={p.productosSearch}>{p.productoResumen}</td>
                <td><Badge bg={color(p.estado)}>{String(p.estado)}</Badge></td>
                <td>
                  <Link to={`/productor/pedidos/${p.pedido_id}`} className="btn btn-sm btn-outline-primary">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted">No hay pedidos</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
