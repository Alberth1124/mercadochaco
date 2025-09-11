import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Form, Button } from "react-bootstrap";

export default function ProductChat({ productoId }){
  const { user, perfil } = useAuth();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  useEffect(()=>{
    let sub;
    (async ()=>{
      const { data, error } = await supabase
        .from('productos_mensajes')
        .select('id, autor_id, mensaje, creado_en, perfiles:autor_id(nombres,apellidos)')
        .eq('producto_id', productoId).order('creado_en', { ascending:true });
      if (!error) setItems(data || []);
      sub = supabase
        .channel(`msg_${productoId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table:'productos_mensajes', filter:`producto_id=eq.${productoId}` },
          payload => setItems(prev => [...prev, { ...payload.new, perfiles:{nombres:perfil?.nombres, apellidos:perfil?.apellidos} }])
        ).subscribe();
    })();
    return ()=>{ sub && supabase.removeChannel(sub); };
  },[productoId]);

  useEffect(()=>{ boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight }); },[items]);

  const send = async (e)=>{
    e.preventDefault();
    if (!user) return alert('Inicia sesión para escribir.');
    if (!text.trim()) return;
    await supabase.from('productos_mensajes').insert({
      producto_id: productoId, autor_id: user.id, mensaje: text.trim()
    });
    setText("");
  };

  return (
    <div className="mt-3">
      <div className="fw-bold mb-2">Comentarios</div>
      <div ref={boxRef} style={{maxHeight:260, overflow:'auto', border:'1px solid #f1f3f1ff', borderRadius:8, padding:8, background:'#0bda617a'}}>
        {items.map(m=>(
          <div key={m.id} className="mb-2">
            <div className="small text-muted">
              {m.perfiles?.nombres} {m.perfiles?.apellidos} — {new Date(m.creado_en).toLocaleString()}
            </div>
            <div>{m.mensaje}</div>
          </div>
        ))}
        {!items.length && <div className="text-muted small">Aún no hay mensajes.</div>}
      </div>
      <Form onSubmit={send} className="d-flex gap-2 mt-2">
        <Form.Control placeholder="Escribe tu comentario…" value={text} onChange={e=>setText(e.target.value)} />
        <Button type="submit" variant="success">Enviar</Button>
      </Form>
    </div>
  );
}
