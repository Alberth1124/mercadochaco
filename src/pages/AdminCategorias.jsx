import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function AdminCategorias(){
  const [rows, setRows] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ id:null, nombre:'', slug:'', activa:true });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = async ()=>{
    setLoading(true);
    const { data, error } = await supabase.from('categorias').select('*').order('nombre');
    if (error) setErr(error.message); else setRows(data||[]);
    setLoading(false);
  };
  useEffect(()=>{ cargar() },[]);

  const onChange = e => setForm(f=>({ ...f, [e.target.name]: e.target.value }));
  const onCheck  = e => setForm(f=>({ ...f, [e.target.name]: e.target.checked }));
  const nuevo    = ()=>{ setForm({ id:null, nombre:'', slug:'', activa:true }); setShow(true); };
  const editar   = (r)=>{ setForm({ ...r }); setShow(true); };

  const guardar = async (e)=>{
    e.preventDefault(); setMsg(null); setErr(null);
    try{
      if (!form.nombre || !form.slug) throw new Error('Nombre y slug son obligatorios');
      if (form.id){
        const { error } = await supabase.from('categorias')
          .update({ nombre: form.nombre, slug: form.slug, activa: form.activa })
          .eq('id', form.id);
        if (error) throw error;
        setMsg('Categoría actualizada');
      } else {
        const { error } = await supabase.from('categorias')
          .insert({ nombre: form.nombre, slug: form.slug, activa: form.activa });
        if (error) throw error;
        setMsg('Categoría creada');
      }
      setShow(false); await cargar();
    }catch(e){ setErr(e.message); }
  };

  const eliminar = async (r)=>{
    if (!confirm('¿Eliminar categoría?')) return;
    const { error } = await supabase.from('categorias').delete().eq('id', r.id);
    if (error) setErr(error.message); else { setMsg('Categoría eliminada'); await cargar(); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Categorías</h4>
        <Button onClick={nuevo}>Nueva</Button>
      </div>
      {msg && <Alert variant="success" className="mt-2">{msg}</Alert>}
      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? <div className="text-center py-5"><Spinner animation="border"/></div> :
      <Table responsive bordered hover className="mt-3">
        <thead><tr><th>Nombre</th><th>Slug</th><th>Activa</th><th></th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.nombre}</td>
              <td>{r.slug}</td>
              <td>{r.activa ? 'Sí' : 'No'}</td>
              <td className="d-flex gap-2">
                <Button size="sm" variant="outline-secondary" onClick={()=>editar(r)}>Editar</Button>
                <Button size="sm" variant="outline-danger" onClick={()=>eliminar(r)}>Eliminar</Button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={4} className="text-center text-muted">Sin categorías</td></tr>}
        </tbody>
      </Table>}

      <Modal show={show} onHide={()=>setShow(false)}>
        <Form onSubmit={guardar}>
          <Modal.Header closeButton><Modal.Title>{form.id?'Editar':'Nueva'} categoría</Modal.Title></Modal.Header>
          <Modal.Body>
            {err && <Alert variant="danger">{err}</Alert>}
            <Form.Group className="mb-2">
              <Form.Label>Nombre</Form.Label>
              <Form.Control name="nombre" value={form.nombre} onChange={onChange} required/>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Slug</Form.Label>
              <Form.Control name="slug" value={form.slug} onChange={onChange} required/>
              <Form.Text className="text-muted">Ej: frutas, verduras, lacteos</Form.Text>
            </Form.Group>
            <Form.Check type="switch" id="activa" name="activa" label="Activa" checked={!!form.activa} onChange={onCheck}/>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={()=>setShow(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
