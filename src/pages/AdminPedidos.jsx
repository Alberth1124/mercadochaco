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

  // Cambiar estado (genérico)
  const cambiar = async (pedido_id, estado)=>{
    setErr(null);
    const { error } = await supabase.rpc('admin_cambiar_estado_pedido', { p_pedido: pedido_id, p_estado: estado });
    if (error) setErr(error.message); else await cargar();
  };

  // Confirmar pago (usa tu función nueva)
  const marcarPagado = async (pedido_id)=>{
    setErr(null);
    const { error } = await supabase.rpc('admin_confirma_pago', { p_pedido: pedido_id });
    if (error) { setErr(error.message); return; }
    await cargar();
  };

  // === Agrupar por pedido ===
  const pedidosMap = new Map();
  for (const r of rows) {
    // detectar "monto QR" si existe en la vista (nombres comunes)
    const montoQR = Number(
      r.qr_monto ?? r.monto_qr ?? r.sip_monto ?? r.monto ?? r.total ?? 0
    );

    if (!pedidosMap.has(r.pedido_id)) {
      pedidosMap.set(r.pedido_id, {
        pedido_id: r.pedido_id,
        // cliente_email: r.cliente_email,    // ← removido del render
        estado: r.estado,
        creado_en: r.creado_en,
        total_qr: montoQR, // mostramos esto como “Total (QR)”
        items: []
      });
    }
    const p = pedidosMap.get(r.pedido_id);
    p.items.push(r);
    // si por algún motivo en otras filas viene un total_qr válido, lo actualizamos
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
            {/* Quitamos la columna Cliente */}
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Estado</th>
              <th>Total (QR)</th>
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
                  <td>Bs {Number(p.total_qr || 0).toFixed(2)}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    {/* Nuevo flujo: confirmar pago */}
                    <Button
                      size="sm"
                      variant="success"
                      onClick={()=>marcarPagado(p.pedido_id)}
                      disabled={p.estado==='pagado'}
                    >
                      Marcar pagado
                    </Button>

                    {/* Flujos existentes */}
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

                {/* Detalle de items (se mantiene). Si quieres ocultarlo, borra este bloque */}
                <tr>
                  <td colSpan={5} className="p-0">
                    <Table size="sm" bordered className="mb-0">
                      <thead>
                        <tr>
                          <th style={{width:'40%'}}>Producto</th>
                          <th>Cant.</th>
                          <th>PU</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map(it=>(
                          <tr key={`${p.pedido_id}-${it.producto_id}`}>
                            <td>{it.producto_nombre}</td>
                            <td>{it.cantidad}</td>
                            <td>Bs {Number(it.precio_unit).toFixed(2)}</td>
                            <td>Bs {(Number(it.cantidad)*Number(it.precio_unit)).toFixed(2)}</td>
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
                <td colSpan={5} className="text-center text-muted">Sin pedidos</td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
