import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Entrega() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    contacto_nombre: "",
    contacto_telefono: "",
    entrega_direccion: "",
    entrega_referencia: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Verificar estado del pedido y precargar campos
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .select("id, contacto_nombre, contacto_telefono, entrega_direccion, entrega_referencia, estado")
        .eq("id", pedidoId)
        .single();

      if (error || !pedido) {
        console.error(error);
        navigate("/catalogo", { replace: true });
        return;
      }

      // Si alguien entra sin pagar, devuélvelo al checkout
      if (pedido.estado !== "pagado") {
        navigate(`/checkout/${pedidoId}`, { replace: true });
        return;
      }

      setForm({
        contacto_nombre: pedido?.contacto_nombre || "",
        contacto_telefono: pedido?.contacto_telefono || "",
        entrega_direccion: pedido?.entrega_direccion || "",
        entrega_referencia: pedido?.entrega_referencia || ""
      });
      setLoading(false);
    })();
  }, [pedidoId, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("pedidos")
      .update({
        contacto_nombre: form.contacto_nombre,
        contacto_telefono: form.contacto_telefono,
        entrega_direccion: form.entrega_direccion,
        entrega_referencia: form.entrega_referencia,
        entrega_confirmada: true
      })
      .eq("id", pedidoId);
    if (error) { alert(error.message); return; }
    navigate(`/exito/${pedidoId}`);
  };

  if (loading) return <p>Cargando…</p>;
  return (
    <div className="container" style={{maxWidth: 680, margin: "20px auto"}}>
      <h2>Datos de entrega</h2>
      <form onSubmit={onSubmit}>
        <label>Nombre de contacto</label>
        <input
          value={form.contacto_nombre}
          onChange={(e)=>setForm(f=>({...f, contacto_nombre:e.target.value}))}
          required
        />

        <label>Teléfono</label>
        <input
          type="tel"
          value={form.contacto_telefono}
          onChange={(e)=>setForm(f=>({...f, contacto_telefono:e.target.value}))}
          required
        />

        <label>Dirección</label>
        <textarea
          value={form.entrega_direccion}
          onChange={(e)=>setForm(f=>({...f, entrega_direccion:e.target.value}))}
          required
        />

        <label>Referencia (opcional)</label>
        <textarea
          value={form.entrega_referencia}
          onChange={(e)=>setForm(f=>({...f, entrega_referencia:e.target.value}))}
        />

        <button type="submit">Confirmar</button>
      </form>
    </div>
  );
}
