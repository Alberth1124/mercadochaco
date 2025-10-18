// src/pages/PanelProductor.jsx
import { useEffect, useMemo, useState } from "react";
import { Table, Badge, Spinner, Alert, Row, Col, Form, Button } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [q, setQ] = useState(""); // 🔍 buscador

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true); setErr(null);
      try {
        // Traemos producto_id para mapear stock
        const { data, error } = await supabase
          .from("v_pedidos_productor_detalle")
          .select("producto_id, creado_en, producto_nombre, cliente_nombre, cliente_email, cantidad, precio_unit, estado")
          .eq("productor_id", user.id)     // solo mis productos
          .eq("estado", "pagado")          // solo ítems pagados
          .order("creado_en", { ascending: false });
        if (error) throw error;

        const baseRows = data || [];

        // === Traer stock desde productos ===
        const ids = Array.from(new Set(baseRows.map(r => r.producto_id).filter(Boolean)));
        let stockMap = new Map();
        if (ids.length) {
          const { data: stocks, error: e2 } = await supabase
            .from("productos")
            .select("id, stock")               // <- si tu columna se llama distinto, cámbiala aquí
            .in("id", ids);
          if (e2) throw e2;
          stockMap = new Map((stocks || []).map(s => [s.id, Number(s.stock) || 0]));
        }

        // Mezclar stock en cada fila
        const withStock = baseRows.map(r => ({ ...r, stock: stockMap.get(r.producto_id) ?? null }));
        setRows(withStock);
      } catch (e) {
        setErr(e.message || "No se pudo cargar");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // Filtrado por buscador (producto, cliente, estado, fecha, subtotal)
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => {
      const fecha = new Date(r.creado_en).toLocaleString().toLowerCase();
      const cliente = String(r.cliente_nombre || r.cliente_email || "—").toLowerCase();
      const producto = String(r.producto_nombre || "").toLowerCase();
      const estado = String(r.estado || "").toLowerCase();
      const subtotal = money(Number(r.cantidad) * Number(r.precio_unit || 0)).toLowerCase();
      return (
        fecha.includes(term) ||
        cliente.includes(term) ||
        producto.includes(term) ||
        estado.includes(term) ||
        subtotal.includes(term)
      );
    });
  }, [rows, q]);

  const totalFiltrado = useMemo(
    () => filtrados.reduce((acc, r) => acc + Number(r.cantidad) * Number(r.precio_unit || 0), 0),
    [filtrados]
  );

  // ===== Exportar a PDF (ahora con STOCK y rojo si < 3) =====
  const exportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 12;
    const pageW = doc.internal.pageSize.getWidth();
    let y = margin;

    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("Mis ventas (productor)", margin, y); y += 8;

    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Filtrado: "${q || "Todos los Productos"}"`, margin, y);
    doc.text(`Total vendido: Bs ${totalFiltrado.toFixed(2)}`, pageW / 2, y);
    y += 6;

    const head = [["Fecha", "Producto", "Cliente", "Cant.", "Stock", "Subtotal", "Estado"]];
    const body = filtrados.map(r => ([
      new Date(r.creado_en).toLocaleString(),
      r.producto_nombre || "—",
      r.cliente_nombre || r.cliente_email || "—",
      String(r.cantidad ?? 0),
      (Number.isFinite(Number(r.stock)) ? String(Number(r.stock)) : "—"),
      (Number(r.cantidad) * Number(r.precio_unit || 0)).toFixed(2),
      String(r.estado || "—"),
    ]));

    autoTable(doc, {
      startY: y,
      head,
      body,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [230, 230, 230] },
      columnStyles: {
        0: { cellWidth: 37 },               // Fecha
        1: { cellWidth: 48 },               // Producto
        2: { cellWidth: 40 },               // Cliente
        3: { cellWidth: 14, halign: "right" }, // Cant.
        4: { cellWidth: 14, halign: "right" }, // Stock
        5: { cellWidth: 24, halign: "right" }, // Subtotal
        6: { cellWidth: 17 },               // Estado
      },
      margin: { left: margin, right: margin },
      // 🔴 resaltar stock < 3 en el PDF
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = Number(data.cell.raw);
          if (Number.isFinite(val) && val < 3) {
            data.cell.styles.textColor = [200, 0, 0];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const fname = `ventas-productor_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.pdf`;
    doc.save(fname);
  };

  const StockCell = ({ value }) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return <span className="text-muted">—</span>;
    const low = n < 3;
    return <span className={low ? "text-danger fw-bold" : ""}>{n}</span>;
  };

  return (
    <div className="container py-3">
      <h4>Mis ventas</h4>

      <Row className="g-2 mt-2 align-items-center">
        <Col md={6}>
          <Form.Control
            placeholder="Buscar por producto, cliente, estado o fecha…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Col>
        <Col md="auto">
          <Button variant="primary" onClick={exportPDF} disabled={loading || filtrados.length === 0}>
            Descargar Inventario
          </Button>
        </Col>
        <Col className="text-muted">
          Total mostrado: <strong>{money(totalFiltrado)}</strong>
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
              <th>Producto</th>
              <th>Cliente</th>
              <th>Cantidad</th>
              <th>Stock</th>
              <th>Subtotal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted">No hay ventas</td></tr>
            )}

            {filtrados.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.creado_en).toLocaleString()}</td>
                <td>{r.producto_nombre}</td>
                <td>{r.cliente_nombre || r.cliente_email || "—"}</td>
                <td>{r.cantidad}</td>
                <td><StockCell value={r.stock} /></td>
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
