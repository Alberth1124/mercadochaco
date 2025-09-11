import { useEffect, useState } from 'react';
import { Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function AdminPedidos(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const cargar = async ()=>{
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from('v_pedidos_detalle')
      .select('*')
      .order('creado_en', { ascending:false });
    if (error) setErr(error.message); else setRows(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ cargar() },[]);

  const color = (estado) => estado==='pagado' ? 'success' : estado==='pendiente' ? 'warning' : 'secondary';

  const cambiar = async (pedido_id, estado)=>{
    const { error } = await supabase.rpc('admin_cambiar_estado_pedido', { p_pedido: pedido_id, p_estado: estado });
    if (error) setErr(error.message); else await cargar();
  };

  // agrupar por pedido
  const pedidos = Array.from(new Map(rows.map(r => [r.pedido_id, {
    pedido_id: r.pedido_id,
    cliente_email: r.cliente_email,
    estado: r.estado,
    creado_en: r.creado_en,
    total: r.total,
    items: []
  }])).values());

  rows.forEach(r=>{
    const p = pedidos.find(x => x.pedido_id === r.pedido_id);
    p?.items.push(r);
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Pedidos (Admin)</h4>
        <Button variant="outline-secondary" onClick={cargar} disabled={loading}>
          {loading ? <Spinner size="sm"/> : 'Refrescar'}
        </Button>
      </div>
      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? <div className="text-center py-5"><Spinner animation="border"/></div> :
      <Table responsive bordered hover className="mt-3">
        <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>
          {pedidos.map(p=>(
            <>
              <tr key={p.pedido_id}>
                <td>{new Date(p.creado_en).toLocaleString()}</td>
                <td>{p.pedido_id}</td>
                <td>{p.cliente_email}</td>
                <td><Badge bg={color(p.estado)}>{p.estado}</Badge></td>
                <td>Bs {Number(p.total).toFixed(2)}</td>
                <td className="d-flex gap-2">
                  <Button size="sm" variant="outline-success" onClick={()=>cambiar(p.pedido_id, 'pagado')} disabled={p.estado==='pagado'}>Marcar pagado</Button>
                  <Button size="sm" variant="outline-secondary" onClick={()=>cambiar(p.pedido_id, 'pendiente')} disabled={p.estado==='pendiente'}>Pendiente</Button>
                  <Button size="sm" variant="outline-danger" onClick={()=>cambiar(p.pedido_id, 'cancelado')} disabled={p.estado==='cancelado'}>Cancelar</Button>
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="p-0">
                  <Table size="sm" bordered className="mb-0">
                    <thead><tr><th style={{width:'40%'}}>Producto</th><th>Cant.</th><th>PU</th><th>Subtotal</th></tr></thead>
                    <tbody>
                      {p.items.map(it=>(
                        <tr key={it.producto_id}>
                          <td>{it.producto_nombre}</td>
                          <td>{it.cantidad}</td>
                          <td>Bs {Number(it.precio_unit).toFixed(2)}</td>
                          <td>Bs {(it.cantidad*it.precio_unit).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </td>
              </tr>
            </>
          ))}
          {pedidos.length===0 && <tr><td colSpan={6} className="text-center text-muted">Sin pedidos</td></tr>}
        </tbody>
      </Table>}
    </div>
  );
}
