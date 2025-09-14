import { useEffect, useState, Fragment } from 'react';
import { Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function AdminPedidos(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [act, setAct] = useState({ id: null, op: null });

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

  const color = (estado) =>
    estado==='pagado' ? 'success' :
    estado==='pendiente' ? 'warning' : 'secondary';

  // === RPCs definitivos ===
  const marcarPagado = async (pedido_id)=>{
    setErr(null); setAct({ id: pedido_id, op: 'pagado' });
    try{
       const { error } = await supabase.rpc('admin_confirma_pago_fix', { p_pedido: pedido_id });
      if (error) throw error;
      await cargar();
    }catch(e){ setErr(e.message||String(e)); }
    finally{ setAct({ id:null, op:null }); }
  };

  const cambiar = async (pedido_id, estado)=>{
    setErr(null); setAct({ id: pedido_id, op: estado });
    try{
      const { error } = await supabase.rpc('admin_set_estado_simple_fix', { p_pedido: pedido_id, p_estado: estado });
      if (error) throw error;
      await cargar();
    }catch(e){ setErr(e.message||String(e)); }
    finally{ setAct({ id:null, op:null }); }
  };

  // Agrupar por pedido
  const pedidosMap = new Map();
  for (const r of rows) {
    if (!pedidosMap.has(r.pedido_id)) {
      pedidosMap.set(r.pedido_id, {
        pedido_id: r.pedido_id,
        cliente_email: r.cliente_email,
        estado: r.estado,
        creado_en: r.creado_en,
        total: r.total,
        items: []
      });
    }
    pedidosMap.get(r.pedido_id).items.push(r);
  }
  const pedidos = Array.from(pedidosMap.values());

  const isRowBusy = (p, op) => act.id === p.pedido_id && (act.op === op);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Pedidos (Admin)</h4>
        <Button variant="outline-secondary" onClick={cargar} disabled={loading}>
          {loading ? <Spinner size="sm"/> : 'Refrescar'}
        </Button>
      </div>

      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border"/></div>
      ) : (
        <Table responsive bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p=>(
              <Fragment key={p.pedido_id}>
                <tr>
                  <td>{new Date(p.creado_en).toLocaleString()}</td>
                  <td>{p.pedido_id}</td>
                  <td>{p.cliente_email}</td>
                  <td><Badge bg={color(p.estado)}>{p.estado}</Badge></td>
                  <td>Bs {Number(p.total||0).toFixed(2)}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={()=>marcarPagado(p.pedido_id)}
                      disabled={p.estado==='pagado' || isRowBusy(p,'pagado')}
                    >
                      {isRowBusy(p,'pagado') ? <Spinner size="sm" /> : 'Marcar pagado'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={()=>cambiar(p.pedido_id, 'pendiente')}
                      disabled={p.estado==='pendiente' || isRowBusy(p,'pendiente')}
                    >
                      {isRowBusy(p,'pendiente') ? <Spinner size="sm" /> : 'Pendiente'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={()=>cambiar(p.pedido_id, 'cancelado')}
                      disabled={p.estado==='cancelado' || isRowBusy(p,'cancelado')}
                    >
                      {isRowBusy(p,'cancelado') ? <Spinner size="sm" /> : 'Cancelar'}
                    </Button>
                  </td>
                </tr>

                {/* Detalle */}
                <tr key={`det-${p.pedido_id}`}>
                  <td colSpan={6} className="p-0">
                    <Table size="sm" bordered className="mb-0">
                      <thead><tr><th style={{width:'40%'}}>Producto</th><th>Cant.</th><th>PU</th><th>Subtotal</th></tr></thead>
                      <tbody>
                        {p.items.map(it=>(
                          <tr key={`${p.pedido_id}:${it.producto_id}`}>
                            <td>{it.producto_nombre}</td>
                            <td>{it.cantidad}</td>
                            <td>Bs {Number(it.precio_unit||0).toFixed(2)}</td>
                            <td>Bs {(Number(it.cantidad)*Number(it.precio_unit||0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </td>
                </tr>
              </Fragment>
            ))}
            {pedidos.length===0 && (
              <tr><td colSpan={6} className="text-center text-muted">Sin pedidos</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
