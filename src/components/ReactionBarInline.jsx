// src/components/ReactionBarInline.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { FaThumbsUp, FaHeart, FaStar } from "react-icons/fa";

/**
 * Uso:
 * <ReactionBarInline productoId={id} />
 * Para ponerlo ENCIMA de una imagen: envuélvelo en un contenedor con position:relative
 * y pásale style={{position:'absolute', bottom:8, left:8}} al wrapperClassName si deseas.
 */

export default function ReactionBarInline({ productoId, className = "", style = {} }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ me_gusta: 0, me_encanta: 0, recomendado: 0 });
  const [mine, setMine] = useState(null);

  async function load() {
    const { data: c } = await supabase
      .from("v_reacciones_conteos")
      .select("*")
      .eq("producto_id", productoId)
      .maybeSingle();

    setCounts({
      me_gusta: c?.me_gusta || 0,
      me_encanta: c?.me_encanta || 0,
      recomendado: c?.recomendado || 0,
    });

    if (user) {
      const { data: r } = await supabase
        .from("productos_reacciones")
        .select("tipo")
        .eq("producto_id", productoId)
        .eq("usuario_id", user.id)
        .maybeSingle();
      setMine(r?.tipo || null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, user?.id]);

  const toggle = async (tipo) => {
    if (!user) return alert("Inicia sesión para reaccionar.");
    const next = mine === tipo ? null : tipo;

    if (next) {
      await supabase.from("productos_reacciones").upsert(
        { producto_id: productoId, usuario_id: user.id, tipo: next },
        { onConflict: "producto_id,usuario_id" }
      );
    } else {
      await supabase
        .from("productos_reacciones")
        .delete()
        .eq("producto_id", productoId)
        .eq("usuario_id", user.id);
    }
    await load();
  };

  const Btn = ({ id, icon, label, color, count }) => {
    const active = mine === id;
    return (
      <button
        type="button"
        className={`rx-btn ${id} ${active ? "active" : ""}`}
        onClick={() => toggle(id)}
        aria-pressed={active}
        title={label}
      >
        <span className="rx-icon">{icon}</span>
        <span className="rx-label">{label}</span>
        <span className="rx-count">{count || 0}</span>

        <style>{`
          .rx-btn.${id}{
            --c:${color};
            border-color: var(--c);
            color: var(--c);
          }
          .rx-btn.${id}:hover{ background: ${hexToRgba(color, 0.10)}; }
          .rx-btn.${id}.active{
            background: var(--c);
            color: #fff;
          }
          .rx-btn.${id}.active .rx-count{ color:#fff; }
        `}</style>
      </button>
    );
  };

  return (
    <div className={`rx-actions ${className}`} style={style}>
      <Btn
        id="me_gusta"
        icon={<FaThumbsUp />}
        label="Me gusta"
        color="#16a34a" /* verde */
        count={counts.me_gusta}
      />
      <Btn
        id="me_encanta"
        icon={<FaHeart />}
        label="Me encanta"
        color="#e11d48" /* rojo */
        count={counts.me_encanta}
      />
      <Btn
        id="recomendado"
        icon={<FaStar />}
        label="Recomendado"
        color="#f59e0b" /* amarillo */
        count={counts.recomendado}
      />

      <style>{`
        /* Wrapper minimal: SIN tarjeta ni fondo */
        .rx-actions{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          align-items:center;
        }

        /* Botón base (transparente) */
        .rx-btn{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          background:transparent;
          border:2px solid transparent;
          border-radius:9999px;
          font-weight:700;
          line-height:1;
          cursor:pointer;
          transition: background .15s ease, color .15s ease, transform .05s ease, border-color .15s ease;
          user-select:none;
        }
        .rx-btn:active{ transform:scale(.98); }

        .rx-icon{
          display:inline-flex;
          line-height:0;
        }
        .rx-icon svg{ width:18px; height:18px; }

        .rx-label{ font-size:14px; }
        .rx-count{
          font-size:12px;
          font-weight:700;
          margin-left:2px;
          color:#4b5563;
        }

        /* ======= Responsive ======= */
        /* Móvil: solo iconos (para ahorrar espacio) */
        @media (max-width: 480px){
          .rx-btn{ padding:8px; }
          .rx-label, .rx-count{ display:none; }
          .rx-icon svg{ width:20px; height:20px; }
        }

        /* Tablet: icono + texto, sin ocultar contador */
        @media (min-width: 481px) and (max-width: 1024px){
          .rx-btn{ padding:8px 10px; }
          .rx-label{ font-size:14px; }
          .rx-count{ display:inline; }
        }

        /* Desktop: un poco más grande */
        @media (min-width: 1025px){
          .rx-label{ font-size:15px; }
          .rx-icon svg{ width:18px; height:18px; }
        }

        /* Modo oscuro automático (opcional, no cambia el look base) */
        @media (prefers-color-scheme: dark){
          .rx-count{ color:#cbd5e1; }
        }
      `}</style>
    </div>
  );
}

/* Utilidad para crear fondos "tinte" al hacer hover */
function hexToRgba(hex, alpha = 1) {
  try {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}
