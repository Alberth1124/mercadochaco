import { useEffect, useState } from 'react';
import { Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function PanelProductor(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const cargar = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from('pedidos_items')
      .select(`
        id, cantidad, precio_unit,
        pedido:pedido_id(id, estado, creado_en),
        producto:producto_id(nombre)
      `)
      .order('id', { ascending:false });
    if (error) setErr(error.message); else setRows(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ cargar() },[]);

  const color = (estado) => estado==='pagado' ? 'success' : estado==='pendiente' ? 'warning' : 'secondary';

  return (
    <div>
      <h4>Mis ventas</h4>
      {err && <Alert variant="danger">{err}</Alert>}
      {loading ? <div className="text-center py-5"><Spinner animation="border" /></div> :
      <Table responsive bordered hover className="mt-3">
        <thead><tr><th>Fecha</th><th>Pedido</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{new Date(r.pedido.creado_en).toLocaleString()}</td>
              <td>{r.pedido.id.slice(0,8)}…</td>
              <td>{r.producto?.nombre}</td>
              <td>{r.cantidad}</td>
              <td>Bs {Number(r.precio_unit).toFixed(2)}</td>
              <td>Bs {(r.cantidad * r.precio_unit).toFixed(2)}</td>
              <td><Badge bg={color(r.pedido.estado)}>{r.pedido.estado}</Badge></td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={7} className="text-center text-muted">Aún no tienes ventas</td></tr>}
        </tbody>
      </Table>}
    </div>
  );
}
