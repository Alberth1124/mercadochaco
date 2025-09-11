import { useMemo, useState } from "react";
import { Table, Button, ButtonGroup, Alert, Card } from "react-bootstrap";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Formatea dinero sin reventar si llega undefined/NaN
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export default function Carrito() {
  const { items, total, updateQty, remove, clear } = useCart();
  const [updating, setUpdating] = useState(null);
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  // Total “a prueba de balas”: si el del contexto no es numérico, se recalcula local
  const safeTotal = useMemo(() => {
    if (Number.isFinite(Number(total))) return Number(total);
    return (items || []).reduce((acc, it) => {
      const precio = Number(it?.producto?.precio ?? it?.precio ?? 0);
      const qty = Number(it?.cantidad ?? 0);
      return acc + (Number.isFinite(precio) ? precio : 0) * (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }, [items, total]);

  const onChangeQty = async (producto_id, newVal) => {
    setUpdating(producto_id);
    try {
      const qty = Math.max(0, parseInt(newVal || 0, 10));
      await updateQty(producto_id, qty);
    } finally {
      setUpdating(null);
    }
  };

  const inc = async (it) => onChangeQty(it.producto_id, Number(it.cantidad || 0) + 1);
  const dec = async (it) => onChangeQty(it.producto_id, Math.max(0, Number(it.cantidad || 0) - 1));

  // === CONTINUAR AL PAGO ===
  const continuarPago = async () => {
    if (!items || !items.length) return;
    setPlacing(true);
    try {
      // 1) Sesión
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes iniciar sesión para pagar.");
        setPlacing(false);
        return;
      }

      // 2) Crear pedido pendiente
      const totalNumber = Number(safeTotal) || 0;
      const { data: pedido, error: errPedido } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: user.id,
          total: totalNumber,
          estado: "pendiente",
        })
        .select("id")
        .single();

      if (errPedido) throw errPedido;
      const pedidoId = pedido.id;

      // 3) Insertar items del pedido
      const rows = (items || []).map((it) => ({
        pedido_id: pedidoId,
        producto_id: it.producto_id || it?.producto?.id || it?.id,
        cantidad: Number(it?.cantidad || 0),
        // Usa la columna correcta de tu esquema: precio_unit
        precio_unit: Number(it?.producto?.precio ?? it?.precio ?? 0),
      })).filter(r => r.producto_id && r.cantidad > 0);

      if (!rows.length) {
        // Limpieza si no hay filas válidas
        await supabase.from("pedidos").delete().eq("id", pedidoId);
        throw new Error("No hay items válidos en el carrito.");
      }

      const { error: errItems } = await supabase.from("pedidos_items").insert(rows);
      if (errItems) {
        // Rollback simple si falla items
        await supabase.from("pedidos").delete().eq("id", pedidoId);
        throw errItems;
      }

      // 4) Navegar al Checkout: allí se invoca sip-genera-qr y se muestra el QR
      navigate(`/checkout/${pedidoId}`);

      // (Opcional) vaciar carrito después de navegar
      // clear();

    } catch (e) {
      console.error(e);
      alert(e.message || "No se pudo crear el pedido.");
    } finally {
      setPlacing(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <Card className="mt-3">
        <Card.Body>
          <Alert variant="info" className="mb-0">
            Tu carrito está vacío. 🛒
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="container mt-3">
      <h2 className="mb-3">Tu carrito</h2>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Producto</th>
            <th style={{ width: 120 }}>Precio</th>
            <th style={{ width: 170 }}>Cantidad</th>
            <th style={{ width: 140 }}>Subtotal</th>
            <th style={{ width: 120 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const id = it.producto_id || it?.producto?.id || it?.id;
            const nombre = it?.producto?.nombre ?? it?.nombre ?? "Producto";
            const precio = Number(it?.producto?.precio ?? it?.precio ?? 0);
            const qty = Number(it?.cantidad ?? 0);
            const line = (Number.isFinite(precio) ? precio : 0) * (Number.isFinite(qty) ? qty : 0);

            return (
              <tr key={id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {it?.producto?.imagen_portada_url ? (
                      <img
                        src={it.producto.imagen_portada_url}
                        alt={nombre}
                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}
                    <div>
                      <div className="fw-semibold">{nombre}</div>
                      {it?.producto?.slug ? (
                        <small className="text-muted">/{it.producto.slug}</small>
                      ) : null}
                    </div>
                  </div>
                </td>

                <td>Bs {money(precio)}</td>

                <td>
                  <div className="d-flex align-items-center" style={{ gap: 8 }}>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={updating === id || qty <= 0}
                      onClick={() => dec(it)}
                    >
                      −
                    </Button>
                    <input
                      type="number"
                      min={0}
                      className="form-control form-control-sm text-center"
                      style={{ width: 72 }}
                      value={qty}
                      onChange={(e) => onChangeQty(id, e.target.value)}
                      disabled={updating === id}
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={updating === id}
                      onClick={() => inc(it)}
                    >
                      +
                    </Button>
                  </div>
                </td>

                <td>Bs {money(line)}</td>

                <td>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={updating === id}
                    onClick={() => remove(id)}
                  >
                    Quitar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={3} className="text-end fw-semibold">
              Total
            </td>
            <td className="fw-bold">Bs {money(safeTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </Table>

      <div className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={clear}>
          Vaciar carrito
        </Button>
        <Button
          variant="success"
          onClick={continuarPago}
          disabled={placing || !items.length}
        >
          {placing ? "Creando pedido..." : "Continuar al pago"}
        </Button>
      </div>
    </div>
  );
}
