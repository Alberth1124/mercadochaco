import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Table, Form, Button, Spinner, Badge } from 'react-bootstrap';

const PAGE_SIZE = 20;

export default function AdminUsuarios(){
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(()=>{
    (async ()=>{
      const { data: flag } = await supabase.rpc('es_admin_rpc');
      setIsAdmin(!!flag);
      setReady(true);
    })();
  },[]);

  useEffect(()=>{
    if (!isAdmin) return;
    const t = setTimeout(()=>{ load(); }, 300);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line
  }, [q, page, isAdmin]);

  async function load(){
    setLoading(true);
    try{
      const [{ data: list, error: e1 }, { data: count, error: e2 }] = await Promise.all([
        supabase.rpc('admin_list_users', { p_q: q, p_limit: PAGE_SIZE, p_offset: page*PAGE_SIZE }),
        supabase.rpc('admin_count_users', { p_q: q })
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setRows(list || []);
      setTotal(Number(count || 0));
    } catch (e){
      console.error(e);
      alert(e.message || 'No se pudo cargar usuarios.');
    } finally { setLoading(false); }
  }

  if (!ready) return null;
  if (!isAdmin) return <div className="container py-4"><h5>Solo administradores.</h5></div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0">Usuarios registrados</h4>
        <Form className="d-flex" style={{gap:8}}>
          <Form.Control
            placeholder="Buscar por nombre o correo…"
            value={q}
            onChange={e=>{ setPage(0); setQ(e.target.value); }}
            style={{minWidth:280}}
          />
        </Form>
      </div>

      {loading ? <Spinner/> : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Admin</th>
              <th>Registrado</th>
              <th>Último acceso</th>
              <th>Contraseña</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.nombres || '—'}</td>
                <td>{r.apellidos || '—'}</td>
                <td>{r.email}</td>
                <td>{r.telefono || '—'}</td>
                <td>{r.rol || 'cliente'}</td>
                <td>{r.es_admin ? <Badge bg="success">Sí</Badge> : <Badge bg="secondary">No</Badge>}</td>
                <td>{r.creado_en ? new Date(r.creado_en).toLocaleString() : '—'}</td>
                <td>{r.ultimo_login ? new Date(r.ultimo_login).toLocaleString() : '—'}</td>
                <td title="Por seguridad no se puede visualizar">
                  ••••••••
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="d-flex justify-content-end align-items-center gap-2">
        <span className="text-muted">Página {page+1} de {pages}</span>
        <Button variant="outline-secondary" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Anterior</Button>
        <Button variant="outline-secondary" disabled={page>=pages-1} onClick={()=>setPage(p=>Math.min(pages-1,p+1))}>Siguiente</Button>
      </div>

      <p className="text-muted mt-3" style={{fontSize:'.9rem'}}>
        Nota: Las contraseñas no son accesibles (Supabase almacena <i>hashes</i> irreversibles).
      </p>
    </div>
  );
}
