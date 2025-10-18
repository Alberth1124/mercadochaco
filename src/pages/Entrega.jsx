// src/pages/Entrega.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

// 9 departamentos de Bolivia (lo que se guarda exactamente)
const DEPARTAMENTOS = [
  "La Paz","Santa Cruz","Cochabamba","Oruro","Potosí","Chuquisaca","Tarija","Beni","Pando"
];
// Tipos de envío
const TIPOS_ENVIO = ["transporte","aéreo"]; // se guarda así mismo

export default function Entrega() {
  const { pedidoId } = useParams();
  const nav = useNavigate();

  const [form, setForm] = useState({
    contacto_nombre: "",
    contacto_telefono: "",
    entrega_departamento: "",  // select
    entrega_direccion: "",     // dirección exacta (única)
    entrega_referencia: "",
    tipo_envio: "",            // select
    empresa_envio: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  // cargar si ya existe
  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const { data, error } = await supabase
          .from("pedidos_entrega")
          .select("*")
          .eq("pedido_id", pedidoId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setForm({
            contacto_nombre: data.contacto_nombre || "",
            contacto_telefono: data.contacto_telefono || "",
            entrega_departamento: data.entrega_departamento || "",
            entrega_direccion: data.entrega_direccion || "",
            entrega_referencia: data.entrega_referencia || "",
            tipo_envio: data.tipo_envio || "",
            empresa_envio: data.empresa_envio || ""
          });
        }
      } catch (e) {
        setErr(e.message || "No se pudo cargar la entrega");
      } finally {
        setLoading(false);
      }
    })();
  }, [pedidoId]);

  const onChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const validar = () => {
    if (!form.contacto_nombre.trim())      return "Falta el nombre de contacto";
    if (!form.contacto_telefono.trim())    return "Falta el teléfono de contacto";
    if (!form.entrega_departamento.trim()) return "Selecciona un departamento";
    if (!form.entrega_direccion.trim())    return "Falta la dirección exacta";
    if (!form.tipo_envio)                  return "Selecciona el tipo de envío";
    return "";
  };

  const guardar = async () => {
    const v = validar();
    if (v) { setErr(v); return; }

    setSaving(true); setErr("");
    try {
      const payload = { pedido_id: pedidoId, ...form };

      // UPSERT (1 fila por pedido)
      const { error } = await supabase
        .from("pedidos_entrega")
        .upsert(payload, { onConflict: "pedido_id" })
        .select()
        .single();
      if (error) throw error;

      // marca bandera en pedidos (opcional)
      await supabase.from("pedidos")
        .update({ entrega_confirmada: true })
        .eq("id", pedidoId);

      // vuelve al flujo de pago (QR)
      nav(`/checkout/${pedidoId}`);
    } catch (e) {
      setErr(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container py-4">Cargando…</div>;

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h3>Datos de entrega</h3>
      {err && <div className="alert alert-danger">{err}</div>}

      {/* Contacto */}
      <div className="mb-3">
        <label className="form-label">Nombre de contacto</label>
        <input
          className="form-control"
          value={form.contacto_nombre}
          onChange={onChange("contacto_nombre")}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Teléfono de contacto</label>
        <input
          className="form-control"
          value={form.contacto_telefono}
          onChange={onChange("contacto_telefono")}
        />
      </div>

      {/* Departamento (SELECT) — debajo del teléfono */}
      <div className="mb-3">
        <label className="form-label">Departamento</label>
        <select
          className="form-select"
          value={form.entrega_departamento}
          onChange={onChange("entrega_departamento")}
        >
          <option value="">Selecciona…</option>
          {DEPARTAMENTOS.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>

      {/* Dirección exacta (única) */}
      <div className="mb-3">
        <label className="form-label">Dirección</label>
        <textarea
          className="form-control"
          rows={2}
          placeholder="Provincias o Municipios"
          value={form.entrega_direccion}
          onChange={onChange("entrega_direccion")}
        />
      </div>

      {/* Referencia */}
      <div className="mb-3">
        <label className="form-label">Referencia (opcional)</label>
        <input
          className="form-control"
          value={form.entrega_referencia}
          onChange={onChange("entrega_referencia")}
        />
      </div>

      {/* Tipo de envío (SELECT) */}
      <div className="mb-3">
        <label className="form-label">Tipo de envío</label>
        <select
          className="form-select"
          value={form.tipo_envio}
          onChange={onChange("tipo_envio")}
        >
          <option value="">Selecciona…</option>
          {TIPOS_ENVIO.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Empresa de envío (preferencia) */}
      <div className="mb-3">
        <label className="form-label">Empresa de envío (preferencia)</label>
        <input
          className="form-control"
          placeholder="Ej.: Trans Copacabana / BOA / Ecojet…"
          value={form.empresa_envio}
          onChange={onChange("empresa_envio")}
        />
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-success" onClick={guardar} disabled={saving}>
          {saving ? "Guardando…" : "Guardar y continuar"}
        </button>
        <Link to={`/checkout/${pedidoId}`} className="btn btn-outline-secondary">Volver</Link>
      </div>
    </div>
  );
}
