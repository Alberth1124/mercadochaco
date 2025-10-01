// src/pages/Entrega.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Entrega() {
  const { pedidoId } = useParams();
  const nav = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [form, setForm] = useState({
    contacto_nombre: '',
    contacto_telefono: '',
    entrega_direccion: '',
    entrega_referencia: ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setErr('');
      // Carga base: pedido + (si existe) entrega
      const [{ data: ped, error: e1 }, { data: ent, error: e2 }] = await Promise.all([
        supabase.from('pedidos').select('id, estado').eq('id', pedidoId).single(),
        supabase.from('pedidos_entrega').select('*').eq('pedido_id', pedidoId).maybeSingle(),
      ]);
      if (e1) return setErr(e1.message);
      setPedido(ped);
      setForm({
        contacto_nombre:   ent?.contacto_nombre   || '',
        contacto_telefono: ent?.contacto_telefono || '',
        entrega_direccion: ent?.entrega_direccion || '',
        entrega_referencia:ent?.entrega_referencia|| '',
      });
    })();
  }, [pedidoId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async () => {
    setSaving(true); setErr('');
    try {
      const payload = {
        pedido_id: pedidoId,
        contacto_nombre:   form.contacto_nombre?.trim()    || null,
        contacto_telefono: form.contacto_telefono?.trim()  || null,
        entrega_direccion: form.entrega_direccion?.trim()  || null,
        entrega_referencia:form.entrega_referencia?.trim() || null,
      };
      const { error } = await supabase
        .from('pedidos_entrega')
        .upsert(payload, { onConflict: 'pedido_id' }); // 👈 evita duplicados
      if (error) throw error;
      nav(`/exito/${pedidoId}`);
    } catch (e) {
      setErr(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h3>Datos de entrega</h3>
      {pedido && <p className="text-muted">Pedido: {pedido.id} — Estado: {pedido.estado}</p>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="mb-3">
        <label className="form-label">Nombre de contacto</label>
        <input name="contacto_nombre" className="form-control" value={form.contacto_nombre} onChange={onChange} />
      </div>
      <div className="mb-3">
        <label className="form-label">Teléfono</label>
        <input name="contacto_telefono" className="form-control" value={form.contacto_telefono} onChange={onChange} />
      </div>
      <div className="mb-3">
        <label className="form-label">Dirección de entrega</label>
        <input name="entrega_direccion" className="form-control" value={form.entrega_direccion} onChange={onChange} />
      </div>
      <div className="mb-3">
        <label className="form-label">Referencia</label>
        <input name="entrega_referencia" className="form-control" value={form.entrega_referencia} onChange={onChange} />
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn.success btn-success" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar y continuar'}
        </button>
        <Link to={`/checkout/${pedidoId}`} className="btn btn-outline-secondary">Volver</Link>
      </div>
    </div>
  );
}
