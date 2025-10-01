import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Entrega() {
  const { pedidoId } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState({
    contacto_nombre: "",
    contacto_telefono: "",
    entrega_direccion: "",
    entrega_referencia: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Cargar si ya existe
  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // RLS: solo dueño puede leer/editar
        const { data, error } = await supabase
          .from("pedidos_entrega")
          .select("*")
          .eq("pedido_id", pedidoId)
          .maybeSingle();
        if (error) throw error;
        if (data) setForm({
          contacto_nombre: data.contacto_nombre || "",
          contacto_telefono: data.contacto_telefono || "",
          entrega_direccion: data.entrega_direccion || "",
          entrega_referencia: data.entrega_referencia || ""
        });
      } catch (e) {
        setErr(e.message || "No se pudo cargar la entrega");
      } finally {
        setLoading(false);
      }
    })();
  }, [pedidoId]);

  const onChange = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const guardar = async () => {
    setSaving(true); setErr("");
    try {
      // UPSERT: inserta si no existe, actualiza si existe
      const { error } = await supabase
        .from("pedidos_entrega")
        .upsert({ pedido_id: pedidoId, ...form })
        .select()
        .single();
      if (error) throw error;

      // (Opcional) marca en pedidos una bandera “entrega_confirmada”
      await supabase.from("pedidos")
        .update({ entrega_confirmada: true })
        .eq("id", pedidoId);

      // Ir al éxito (descargar recibo, etc.)
      nav(`/exito/${pedidoId}`);
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

      <div className="mb-3">
        <label className="form-label">Nombre de contacto</label>
        <input className="form-control" value={form.contacto_nombre} onChange={onChange("contacto_nombre")} />
      </div>
      <div className="mb-3">
        <label className="form-label">Teléfono de contacto</label>
        <input className="form-control" value={form.contacto_telefono} onChange={onChange("contacto_telefono")} />
      </div>
      <div className="mb-3">
        <label className="form-label">Dirección</label>
        <textarea className="form-control" rows={2} value={form.entrega_direccion} onChange={onChange("entrega_direccion")} />
      </div>
      <div className="mb-3">
        <label className="form-label">Referencia (opcional)</label>
        <input className="form-control" value={form.entrega_referencia} onChange={onChange("entrega_referencia")} />
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
