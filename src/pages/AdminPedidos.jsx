// src/pages/AdminPedidos.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

// (Opcional) Si ya tienes un componente ReciboButton, usa ese import.
// Aquí lo implementamos inline para que sea 100% autocontenido.
function ReciboButton({ pedidoId, children = "Recibo (PDF)" }) {
  const functionsBase =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
    `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

  const abrir = () => {
    const url = `${functionsBase}/recibo-pdf?pedido_id=${encodeURIComponent(pedidoId)}`;
    window.open(url, "_blank");
  };

  return (
    <button onClick={abrir} style={{ padding: "6px 10px" }}>
      {children}
    </button>
  );
}

export default function AdminPedidos() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);        // v_pedidos_detalle (por ítem)
  const [errorMsg, setErrorMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null); // pedidoId en confirmación
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos"); // 'todos' | 'pendiente' | 'pagado'

  // ========= Helpers UI =========
  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;

  // Carga si el usuario es admin
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsAdmin(false); return; }
        const { data, error } = await supabase
          .from("perfiles")
          .select("es_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (mounted) setIsAdmin(!!data?.es_admin);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Cargar datos base
  async function fetchData() {
    setLoading(true);
    setErrorMsg("");
    try {
      let query = supabase
        .from("v_pedidos_detalle")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(500);

      // Filtro rápido por texto (cliente, email, producto, pedidoId)
      // Nota: PostgREST no soporta fulltext aquí; hacemos filtro en memoria abajo.
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo cargar la lista");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime: si cambian pagos_sip o pedidos → recarga
  useEffect(() => {
    const ch = supabase
      .channel("admin:pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos_sip" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  // Agrupamos líneas por pedido_id para mostrar 1 fila por pedido (resumen)
  const pedidos = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      // Filtros de UI (search/estado) en memoria
      const s = search.trim().toLowerCase();
      if (s) {
        const hay = [
          r.pedido_id,
          r.cliente_email,
          r.cliente_nombre,
          r.producto_nombre,
        ].some(v => String(v || "").toLowerCase().includes(s));
        if (!hay) continue;
      }
      if (estadoFilter !== "todos" && String(r.estado).toLowerCase() !== estadoFilter) continue;

      if (!map.has(r.pedido_id)) {
        map.set(r.pedido_id, {
          pedido_id: r.pedido_id,
          creado_en: r.creado_en,
          estado: r.estado,
          total: r.total,
          cliente: r.cliente_nombre || r.cliente_email || "—",
          contacto: r.contacto_nombre || "—",
          telefono: r.contacto_telefono || "—",
          entrega: r.entrega_direccion || "—",
          items: [],
        });
      }
      map.get(r.pedido_id).items.push({
        producto_id: r.producto_id,
        producto_nombre: r.producto_nombre,
        cantidad: r.cantidad,
        precio_unit: r.precio_unit,
      });
    }
    // Ordenar por creado_en desc
    return Array.from(map.values()).sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  }, [rows, search, estadoFilter]);

  // Confirmar pago (DEV) -> llama a Edge Function admin-confirmar-pago
  const confirmarPagoDev = async (pedidoId) => {
    if (!isAdmin) { alert("Solo administradores."); return; }
    if (!window.confirm(`¿Confirmar pago DEV del pedido ${pedidoId}?`)) return;

    setConfirmingId(pedidoId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-confirmar-pago", {
        body: { pedidoId, observacion: "Confirmación manual desde AdminPedidos.jsx (DEV)" },
      });
      if (error) throw error;
      // Refrescar lista (Realtime también debería disparar, pero lo hacemos inmediato)
      await fetchData();
      alert("Pago confirmado (DEV).");
    } catch (e) {
      alert(e?.message || "No se pudo confirmar el pago");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin — Pedidos</h2>

      {!isAdmin && (
        <p style={{ color: "#b00" }}>
          Esta vista requiere permisos de administrador para confirmar pagos.
        </p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0" }}>
        <input
          placeholder="Buscar (pedido, cliente, producto, email)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "6px 10px", minWidth: 280 }}
        />
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          style={{ padding: "6px 10px" }}
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <button onClick={fetchData} style={{ padding: "6px 10px" }}>Recargar</button>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : errorMsg ? (
        <p style={{ color: "red" }}>{errorMsg}</p>
      ) : pedidos.length === 0 ? (
        <p>No hay pedidos.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f7f7" }}>
              <th style={{ textAlign: "left" }}>Fecha</th>
              <th style={{ textAlign: "left" }}>Pedido</th>
              <th style={{ textAlign: "left" }}>Cliente</th>
              <th style={{ textAlign: "left" }}>Contacto</th>
              <th style={{ textAlign: "left" }}>Entrega</th>
              <th style={{ textAlign: "left" }}>Estado</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "left" }}>Ítems</th>
              <th style={{ textAlign: "left" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const resumenItems =
                p.items.length === 1
                  ? `${p.items[0].producto_nombre} × ${p.items[0].cantidad}`
                  : `${p.items[0].producto_nombre} × ${p.items[0].cantidad} + ${p.items.length - 1} ítem(s)`;
              const esPagado = String(p.estado).toLowerCase() === "pagado";

              return (
                <tr key={p.pedido_id}>
                  <td>{new Date(p.creado_en).toLocaleString()}</td>
                  <td>{p.pedido_id}</td>
                  <td>{p.cliente}</td>
                  <td>
                    {p.contacto}
                    {p.telefono && <div style={{ color: "#777", fontSize: 12 }}>{p.telefono}</div>}
                  </td>
                  <td style={{ maxWidth: 260 }}>{p.entrega}</td>
                  <td>{p.estado}</td>
                  <td style={{ textAlign: "right" }}>{money(p.total)}</td>
                  <td title={p.items.map(it => `${it.producto_nombre} × ${it.cantidad}`).join("\n")}>
                    {resumenItems}
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ReciboButton pedidoId={p.pedido_id} />
                    {isAdmin && !esPagado && (
                      <button
                        onClick={() => confirmarPagoDev(p.pedido_id)}
                        disabled={confirmingId === p.pedido_id}
                        style={{ padding: "6px 10px" }}
                        title="Solo DEV: confirma pago manualmente (sin callback)"
                      >
                        {confirmingId === p.pedido_id ? "Confirmando…" : "Confirmar pago (DEV)"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <div><b>Nota:</b> “Confirmar pago (DEV)” llama a la Edge Function <code>admin-confirmar-pago</code>, que actualiza <code>pagos_sip</code> y ejecuta <code>fn_marcar_pedido_pagado</code> (descuento de stock). En producción debe reemplazarse por el callback oficial de SIP.</div>
      </div>
    </div>
  );
}
