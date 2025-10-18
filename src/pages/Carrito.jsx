import { useMemo, useState } from "react";
import { Table, Button, Alert, Card } from "react-bootstrap";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FaArrowLeft } from "react-icons/fa";

// Formatea dinero sin reventar si llega undefined/NaN
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

// Normaliza un item
const getIds = (it) => ({
  id: it.producto_id || it?.producto?.id || it?.id,
  precio: Number(it?.producto?.precio ?? it?.precio ?? 0),
  qty: Number(it?.cantidad ?? 0),
});

export default function Carrito() {
  const { items, total, updateQty, remove, clear } = useCart();
  const [updating, setUpdating] = useState(null);
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  // Dedupe de items (si hay mismo producto dos veces)
  const itemsDedup = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      const { id, precio, qty } = getIds(it);
      if (!id || qty <= 0) return;
      const prev = map.get(id)?.qty || 0;
      map.set(id, {
        ...it,
        producto_id: id,
        cantidad: prev + qty,
        precio: Number.isFinite(precio) ? precio : 0,
      });
    });
    return Array.from(map.values());
  }, [items]);

  // Total “a prueba de balas”
  const safeTotal = useMemo(() => {
    if (Number.isFinite(Number(total))) return Number(total);
    return (itemsDedup || []).reduce((acc, it) => {
      const p = Number(it?.producto?.precio ?? it?.precio ?? 0);
      const q = Number(it?.cantidad ?? 0);
      return acc + (Number.isFinite(p) ? p : 0) * (Number.isFinite(q) ? q : 0);
    }, 0);
  }, [itemsDedup, total]);

  const onChangeQty = async (producto_id, newVal) => {
    setUpdating(producto_id);
    try {
      const qty = Math.max(0, parseInt(newVal || 0, 10));
      await updateQty(producto_id, qty);
    } finally {
      setUpdating(null);
    }
  };

  const inc = async (it) => onChangeQty(getIds(it).id, Number(it.cantidad || 0) + 1);
  const dec = async (it) => onChangeQty(getIds(it).id, Math.max(0, Number(it.cantidad || 0) - 1));

  // === CONTINUAR AL PAGO ===
  const continuarPago = async () => {
    if (!itemsDedup.length) return;
    if (safeTotal <= 0) { alert("El total debe ser mayor a cero."); return; }

    // Evita doble click
    if (placing) return;
    setPlacing(true);

    try {
      // 1) Sesión
      const { data: { user }, error: errUser } = await supabase.auth.getUser();
      if (errUser) throw errUser;
      if (!user) {
        alert("Debes iniciar sesión para pagar.");
        setPlacing(false);
        navigate("/login?next=/carrito");
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
      const rows = itemsDedup.map((it) => ({
        pedido_id: pedidoId,
        producto_id: getIds(it).id,
        cantidad: Number(it?.cantidad || 0),
        // Usa el nombre de columna real de tu tabla (aquí: precio_unit)
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

      // 4) Ir primero a datos de entrega
      navigate(`/entrega/${pedidoId}`);

      // (Opcional) vaciar carrito después de navegar
      // clear();
    } catch (e) {
      console.error(e);
      alert(e.message || "No se pudo crear el pedido.");
    } finally {
      setPlacing(false);
    }
  };

  if (!itemsDedup.length) {
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

  const renderRowData = (it) => {
    const id = getIds(it).id;
    const nombre = it?.producto?.nombre ?? it?.nombre ?? "Producto";
    const precio = Number(it?.producto?.precio ?? it?.precio ?? 0);
    const qty = Number(it?.cantidad ?? 0);
    const line = (Number.isFinite(precio) ? precio : 0) * (Number.isFinite(qty) ? qty : 0);
    const img = it?.producto?.imagen_portada_url || null;
    const slug = it?.producto?.slug;
    return { id, nombre, precio, qty, line, img, slug };
  };

  return (
    <div className="container mt-3">
       {/* Flecha volver atrás */}
      <button
        type="button"
       className="btn btn-link p-0 mb-2"
        onClick={() => navigate(-1)}
        aria-label="Volver"
        title="Volver"
      >
        <FaArrowLeft size={22} style={{ color: "var(--mc-green-600)" }} />
      </button>
      <h2 className="mb-3">Tu carrito</h2>

      {/* ====== Desktop/Tablet (md y arriba): Tabla ====== */}
      <div className="d-none d-md-block">
        <Table striped bordered hover responsive="md">
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
            {itemsDedup.map((it) => {
              const { id, nombre, precio, qty, line, img, slug } = renderRowData(it);
              return (
                <tr key={id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {img ? (
                        <img
                          src={img}
                          alt={nombre}
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : null}
                      <div>
                        <div className="fw-semibold">{nombre}</div>
                        {slug ? <small className="text-muted">/{slug}</small> : null}
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
              <td colSpan={3} className="text-end fw-semibold">Total</td>
              <td className="fw-bold">Bs {money(safeTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </Table>

        <div className="d-flex justify-content-between">
          <Button variant="outline-secondary" onClick={clear}>Vaciar carrito</Button>
          <Button variant="success" onClick={continuarPago} disabled={placing || !itemsDedup.length}>
             {placing ? "Creando pedido..." : "Comprar ahora"}
          </Button>
        </div>
      </div>

      {/* ====== Móvil (xs–sm): Tarjetas ====== */}
      <div className="d-md-none">
        <div className="d-flex flex-column gap-2">
          {itemsDedup.map((it) => {
            const { id, nombre, precio, qty, line, img, slug } = renderRowData(it);
            return (
              <Card key={id} className="shadow-sm">
                <Card.Body className="py-2">
                  <div className="d-flex" style={{ gap: 10 }}>
                    {img ? (
                      <img
                        src={img}
                        alt={nombre}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}

                    <div className="flex-grow-1">
                      <div className="fw-semibold">
                        {nombre} {slug ? <small className="text-muted">/{slug}</small> : null}
                      </div>
                      <div className="small text-muted">Bs {money(precio)} c/u</div>

                      <div className="d-flex align-items-center mt-2" style={{ gap: 8 }}>
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
                          style={{ width: 64 }}
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
                    </div>

                    <div className="text-end">
                      <div className="fw-bold">Bs {money(line)}</div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="mt-2"
                        disabled={updating === id}
                        onClick={() => remove(id)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>

        {/* Resumen y acciones */}
        <Card className="mt-3">
          <Card.Body className="py-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="fw-semibold">Total</div>
              <div className="fw-bold">Bs {money(safeTotal)}</div>
            </div>
            <div className="d-grid gap-2 mt-2">
              <Button
               variant="success"
               onClick={continuarPago}
               disabled={placing || !itemsDedup.length}
              >
               {placing ? "Creando pedido..." : "Comprar ahora"}
              </Button>

              <Button variant="outline-secondary" onClick={clear}>
                Vaciar carrito
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
