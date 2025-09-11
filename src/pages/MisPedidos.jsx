// src/pages/MisPedidos.jsx
import { useEffect, useState } from "react";
import { Table, Badge, Spinner, Alert } from "react-bootstrap";
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

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("v_pedidos_detalle")
        .select("*")
        .eq("cliente_id", user.id)
        .order("creado_en", { ascending: false });
      if (error) setErr(error.message);
      else setRows(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const color = (estado) =>
    estado === "pagado" ? "success" : estado === "pendiente" ? "warning" : "secondary";

  return (
    <div>
      <h4>Mis pedidos</h4>
      {err && <Alert variant="danger">{err}</Alert>}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
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
              <th>Acciones</th> {/* 👈 añadido */}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.pedido_id}:${r.producto_id}`}>
                <td>{new Date(r.creado_en).toLocaleString()}</td>
                <td>{r.pedido_id.slice(0, 8)}…</td>
                <td>{r.producto_nombre}</td>
                <td>{r.cantidad}</td>
                <td>Bs {Number(r.precio_unit).toFixed(2)}</td>
                <td>Bs {(r.cantidad * r.precio_unit).toFixed(2)}</td>
                <td>
                  <Badge bg={color(r.estado)}>{r.estado}</Badge>
                </td>
                <td>
                  {r.estado === "pagado" ? (
                    <a
                      href={`${FN_BASE}/recibo-pdf?pedido_id=${encodeURIComponent(r.pedido_id)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Recibo
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  Aún no tienes pedidos
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
