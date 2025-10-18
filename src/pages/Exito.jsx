// src/pages/Exito.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Base de Functions
const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/+$/, "") ||
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;

// Emojis robustos (codepoints, no literal)
const E = {
  wave: "\u{1F44B}",     // 👋
  cart: "\u{1F6D2}",     // 🛒
  box: "\u{1F4E6}",      // 📦
  truck: "\u{1F69A}",    // 🚚
};

// Detección simple de móvil
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  typeof navigator !== "undefined" ? navigator.userAgent : ""
);

// --- utils WhatsApp simples (sin Cloud API) ---
function normalizeBO(phoneRaw) {
  if (!phoneRaw) return null;
  const digits = String(phoneRaw).replace(/[^\d]/g, "");
  const e164 = digits.startsWith("591") ? digits : `591${digits}`;
  return `+${e164}`;
}
function openWhatsApp(phoneRaw, text) {
  const num = normalizeBO(phoneRaw);
  if (!num) return;
  // En móvil usamos deep link whatsapp://; en desktop, api.whatsapp.com (más estable que wa.me)
  const base = isMobile ? "whatsapp://send" : "https://api.whatsapp.com/send";
  const url = `${base}?phone=${num.replace("+", "")}&text=${encodeURIComponent(text || "")}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Utilidad
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

export default function Exito() {
  const { pedidoId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Descargar PDF del recibo (Edge Function: recibo-pdf)
  const descargarRecibo = async () => {
    if (downloading) return;
    setDownloading(true);
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token;

      const res = await fetch(`${FUNCTIONS_BASE}/recibo-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/pdf",
        },
        body: JSON.stringify({ pedidoId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`No se pudo generar el PDF (${res.status})${txt ? `: ${txt}` : ""}`);
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `recibo-${pedidoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo descargar el recibo");
    } finally {
      setDownloading(false);
    }
  };

  // ---- Notificar por WhatsApp: sin v_pedido_whatsapp, resolviendo todo desde el frontend ----
  const notificarWhatsApp = async () => {
    if (notifying) return;
    setNotifying(true);
    setErrorMsg("");

    try {
      // 1) Ítems del pedido
      const { data: items, error: eItems } = await supabase
        .from("pedidos_items")
        .select("producto_id, cantidad")
        .eq("pedido_id", pedidoId);
      if (eItems) throw eItems;
      if (!items?.length) throw new Error("No se encontraron ítems en el pedido.");

      const prodIds = uniq(items.map((i) => i.producto_id));
      if (!prodIds.length) throw new Error("El pedido no tiene productos válidos.");

      // 2) Productos (para conocer dueño y nombre de producto)
      const { data: prods, error: eProds } = await supabase
        .from("productos")
        .select("id, usuario_id, nombre")
        .in("id", prodIds);
      if (eProds) throw eProds;

      const prodById = new Map((prods || []).map((p) => [p.id, p]));
      const productorUserIds = uniq((prods || []).map((p) => p.usuario_id));
      if (!productorUserIds.length) throw new Error("No se pudo resolver el productor de los productos.");

      // 3) Intentar TELEFONO + NOMBRE desde productores_solicitudes
      let telByUser = new Map();
      let nameByUser = new Map();
      try {
        const { data: sols } = await supabase
          .from("productores_solicitudes")
          .select("usuario_id, telefono, nombres, apellidos, creado_en")
          .in("usuario_id", productorUserIds)
          .order("creado_en", { ascending: false });

        const seen = new Set();
        for (const s of sols || []) {
          if (seen.has(s.usuario_id)) continue;
          seen.add(s.usuario_id);
          const tel = String(s.telefono || "").trim();
          if (tel) telByUser.set(s.usuario_id, tel);
          const nom = [s.nombres, s.apellidos].filter(Boolean).join(" ").trim();
          if (nom) nameByUser.set(s.usuario_id, nom);
        }
      } catch {}

      // 4) Fallback: productores
      const missingForTel = productorUserIds.filter((id) => !telByUser.has(id));
      if (missingForTel.length) {
        try {
          const { data: prs } = await supabase
            .from("productores")
            .select("usuario_id, telefono, nombres, apellidos")
            .in("usuario_id", missingForTel);
          for (const r of prs || []) {
            const tel = String(r.telefono || "").trim();
            if (tel && !telByUser.has(r.usuario_id)) telByUser.set(r.usuario_id, tel);
            const nom = [r.nombres, r.apellidos].filter(Boolean).join(" ").trim();
            if (nom && !nameByUser.has(r.usuario_id)) nameByUser.set(r.usuario_id, nom);
          }
        } catch {}
      }

      // 5) Fallback: perfiles
      const stillMissingTel = productorUserIds.filter((id) => !telByUser.has(id));
      if (stillMissingTel.length) {
        try {
          const { data: perfs } = await supabase
            .from("perfiles")
            .select("id, telefono, nombres, apellidos")
            .in("id", stillMissingTel);
          for (const p of perfs || []) {
            const tel = String(p.telefono || "").trim();
            if (tel && !telByUser.has(p.id)) telByUser.set(p.id, tel);
            const nom = [p.nombres, p.apellidos].filter(Boolean).join(" ").trim();
            if (nom && !nameByUser.has(p.id)) nameByUser.set(p.id, nom);
          }
        } catch {}
      }

      // 6) Agrupar por productor
      const byProd = new Map();
      for (const it of items) {
        const pr = prodById.get(it.producto_id);
        if (!pr) continue;

        const owner = pr.usuario_id;
        if (!byProd.has(owner)) {
          byProd.set(owner, {
            nombre: nameByUser.get(owner) || "Productor",
            telefono: telByUser.get(owner) || null,
            items: [],
          });
        }
        byProd.get(owner).items.push({
          nombre: pr.nombre,
          cantidad: Number(it.cantidad || 0),
        });
      }

      // Filtrar productores sin teléfono
      const productores = Array.from(byProd.entries())
        .map(([userId, v]) => ({ userId, ...v }))
        .filter((p) => !!p.telefono);

      if (!productores.length) {
        throw new Error("Los productores de este pedido no tienen teléfono registrado.");
      }

      // 7) Construir mensaje con emojis (usando constantes E) y abrir chats
      productores.forEach((p, idx) => {
        const lista = p.items.map((it) => `• ${it.nombre} × ${it.cantidad}`).join("\n");
        const msg = [
          `${E.wave} ¡Hola!`,
          `Tienes un nuevo pedido pagado ${E.cart}`,
          "",
          `${E.box} *Pedido:* ${pedidoId}`,
          "Productos asignados a tu tienda:",
          lista,
          "",
          `Revisa la plataforma de *Mercado Chaco* para coordinar el envío ${E.truck}`,
        ].join("\n");

        // Pequeño delay para evitar bloqueos de popups múltiples
        setTimeout(() => openWhatsApp(p.telefono, msg), idx * 300);
      });
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo abrir WhatsApp");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h3>✅ ¡Pago exitoso!</h3>
      <p className="text-muted">
        Tu pedido <b>{pedidoId}</b> fue confirmado. Hemos registrado también los datos de entrega.
      </p>

      <div className="d-flex flex-wrap gap-2 mt-3">
        {/* Notificar por WhatsApp */}
        <button
          onClick={notificarWhatsApp}
          className="btn btn-success"
          disabled={notifying}
          title="Abrirá WhatsApp (web o app) con el mensaje listo para enviar"
        >
          {notifying ? "Preparando WhatsApp…" : "Notificar compra por WhatsApp"}
        </button>

        <button onClick={descargarRecibo} className="btn btn-outline-primary" disabled={downloading}>
          {downloading ? "Generando PDF…" : "Descargar recibo (PDF)"}
        </button>

        <Link to="/mis-pedidos" className="btn btn-success">
          Ver mis pedidos
        </Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">
          Seguir comprando
        </Link>
      </div>

      {errorMsg && <p style={{ color: "red", marginTop: 12 }}>{errorMsg}</p>}
    </div>
  );
}
