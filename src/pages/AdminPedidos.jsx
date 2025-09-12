import { useEffect, useState, Fragment } from 'react';
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

  const color = (estado) =>
    estado === 'pagado' ? 'success' :
    estado === 'pendiente' ? 'warning' :
    'secondary';

  const cambiar = async (pedido_id, estado)=>{
    setErr(null);
    const { error } = await supabase.rpc('admin_cambiar_estado_pedido', { p_pedido: pedido_id, p_estado: estado });
    if (error) setErr(error.message); else await cargar();
  };

  const marcarPagado = async (pedido_id)=>{
    setErr(null);
    const { error } = await supabase.rpc('admin_confirma_pago', { p_pedido: pedido_id });
    if (error) { setErr(error.message); return; }
    await cargar();
  };

  // === Agrupar por pedido (mantenemos total_qr calculado pero NO lo mostramos) ===
  const pedidosMap = new Map();
  for (const r of rows) {
    const montoQR = Number(
      r.qr_monto ?? r.monto_qr ?? r.sip_monto ?? r.monto ?? r.total ?? 0
    );

    if (!pedidosMap.has(r.pedido_id)) {
      pedidosMap.set(r.pedido_id, {
        pedido_id: r.pedido_id,
        estado: r.estado,
        creado_en: r.creado_en,
        total_qr: montoQR, // calculado pero NO renderizado
        items: []
      });
    }
    const p = pedidosMap.get(r.pedido_id);
    p.items.push(r);
    if (montoQR && !Number.isNaN(montoQR)) p.total_qr = montoQR;
  }
  const pedidos = Array.from(pedidosMap.values());

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
        <Table responsive bordered hover size="sm" className="mt-3">
          <thead>
            {/* ⬇️ Quitamos la columna "Total (QR)" */}
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pedidos.map(p=>(
              <Fragment key={p.pedido_id}>
                <tr>
                  <td>{new Date(p.creado_en).toLocaleString()}</td>
                  <td>{p.pedido_id}</td>
                  <td><Badge bg={color(p.estado)}>{p.estado}</Badge></td>
                  <td className="d-flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={()=>marcarPagado(p.pedido_id)}
                      disabled={p.estado==='pagado'}
                    >
                      Marcar pagado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={()=>cambiar(p.pedido_id, 'pendiente')}
                      disabled={p.estado==='pendiente'}
                    >
                      Pendiente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={()=>cambiar(p.pedido_id, 'cancelado')}
                      disabled={p.estado==='cancelado'}
                    >
                      Cancelar
                    </Button>
                  </td>
                </tr>

                {/* Detalle: ⬇️ solo mostramos Producto y Cant., ocultamos PU y Subtotal */}
                <tr>
                  {/* colSpan ajustado de 5 → 4 por quitar "Total (QR)" */}
                  <td colSpan={4} className="p-0">
                    <Table size="sm" bordered className="mb-0">
                      <thead>
                        <tr>
                          <th style={{width:'60%'}}>Producto</th>
                          <th>Cant.</th>
                          {/* PU / Subtotal ocultos */}
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map(it=>(
                          <tr key={`${p.pedido_id}-${it.producto_id}`}>
                            <td>{it.producto_nombre}</td>
                            <td>{it.cantidad}</td>
                            {/* PU/Subtotal no renderizados */}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </td>
                </tr>
              </Fragment>
            ))}
            {pedidos.length===0 && (
              <tr>
                {/* colSpan ajustado de 5 → 4 */}
                <td colSpan={4} className="text-center text-muted">Sin pedidos</td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
