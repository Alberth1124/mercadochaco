import { useEffect, useState } from 'react';
import { Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function MisPedidos(){
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(()=>{
    (async ()=>{
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from('v_pedidos_detalle')
        .select('*')
        .eq('cliente_id', user.id)
        .order('creado_en', { ascending:false });
      if (error) setErr(error.message); else setRows(data||[]);
      setLoading(false);
    })();
  }, [user.id]);

  const color = (estado) => estado==='pagado' ? 'success' : estado==='pendiente' ? 'warning' : 'secondary';

  return (
    <div>
      <h4>Mis pedidos</h4>
      {err && <Alert variant="danger">{err}</Alert>}
      {loading ? <div className="text-center py-5"><Spinner animation="border"/></div> :
      <Table responsive bordered hover className="mt-3">
        <thead><tr><th>Fecha</th><th>Pedido</th><th>Producto</th><th>Cant.</th><th>PU</th><th>Subtotal</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={`${r.pedido_id}:${r.producto_id}`}>
              <td>{new Date(r.creado_en).toLocaleString()}</td>
              <td>{r.pedido_id.slice(0,8)}…</td>
              <td>{r.producto_nombre}</td>
              <td>{r.cantidad}</td>
              <td>Bs {Number(r.precio_unit).toFixed(2)}</td>
              <td>Bs {(r.cantidad*r.precio_unit).toFixed(2)}</td>
              <td><Badge bg={color(r.estado)}>{r.estado}</Badge></td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={7} className="text-center text-muted">Aún no tienes pedidos</td></tr>}
        </tbody>
      </Table>}
    </div>
  );
}
