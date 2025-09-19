// src/pages/Checkout.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { showToast } from '../utils/toast';
import { useCart } from "../context/CartContext";

export default function Checkout(){
  const { pedidoId } = useParams();
  const [img, setImg]   = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const doneRef = useRef(false);

  // limpiar carrito
  const { clear: clearCart } = useCart();
  const clearCartSafe = () => {
    try { clearCart?.(); } catch {}
    try { localStorage.removeItem('mc_cart'); } catch {}
  };

  const goEntregaOnce = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearCartSafe();
    showToast({ title: '¡Pago confirmado!', body: 'Ahora completa los datos de entrega.', variant: 'success' });
    navigate(`/entrega/${pedidoId}`, { replace:true });
  };

  // exigir sesión
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', {
          replace: true,
          state: { toast: { title: 'Inicia sesión', body: 'Necesitas iniciar sesión para pagar.', variant: 'warning' } }
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getMontoPedido(){
    const { data, error } = await supabase
      .from('pedidos')
      .select('total, estado')
      .eq('id', pedidoId)
      .maybeSingle();

    if (error || !data) throw new Error('Pedido inválido');

    if (data.estado === 'pagado') {
      goEntregaOnce();
      throw new Error('Pedido ya pagado');
    }
    if (data.estado !== 'pendiente') throw new Error('El pedido no está pendiente');

    return Number(data.total || 0);
  }

  // generar/reenviar QR
  async function generarQR(){
    if (!pedidoId) {
      alert('Falta pedidoId en la ruta /checkout/:pedidoId');
      return;
    }
    setLoading(true);
    try{
      const monto = await getMontoPedido();

      const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
        body: { pedido_id: pedidoId, monto, glosa: `Pedido ${pedidoId}` },
      });
      if (error) throw new Error(error.message || JSON.stringify(error));

      if (!data?.base64) throw new Error('No se recibió imagen de QR');
      setImg(`data:image/png;base64,${data.base64}`);
      setVenc(data.expira || null);
    } catch (e){
      const msg = e?.message || 'No se pudo generar el QR';
      if (!/ya pagado/i.test(msg)) alert(msg);
    } finally {
      setLoading(false);
    }
  }

  // botón “Revisar estado en SIP”
  async function revisarEstadoSIP(){
    if (!pedidoId) return;
    setChecking(true);
    try{
      const { data, error } = await supabase.functions.invoke('sip-estado', {
        body: { pedido_id: pedidoId, apply: true } // apply=true: si está confirmado, marca pagado
      });
      if (error) throw new Error(error.message || JSON.stringify(error));

      const estado = String(data?.estado || '').toLowerCase();
      if (data?.applied || estado === 'pagado' || estado === 'confirmado') {
        goEntregaOnce();
      } else {
        alert(`Estado actual: ${data?.estado ?? 'desconocido'}`);
      }
    } catch(e){
      alert(e?.message || 'No se pudo consultar el estado');
    } finally{
      setChecking(false);
    }
  }

  // chequeo inicial + emitir QR
  useEffect(() => {
    (async () => {
      if (!pedidoId) return;

      const { data: ped } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoId)
        .maybeSingle();
      if (ped?.estado === 'pagado') { goEntregaOnce(); return; }

      const { data: row } = await supabase
        .from('pagos_sip')
        .select('estado')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      if (row?.estado === 'confirmado') { goEntregaOnce(); return; }

      await generarQR();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // realtime pagos_sip
  useEffect(() => {
    if (!pedidoId) return;

    const ch = supabase
      .channel(`pago_${pedidoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pagos_sip',
        filter: `pedido_id=eq.${pedidoId}`
      }, (payload) => {
        const estado = payload?.new?.estado || payload?.old?.estado;
        if (estado === 'confirmado') goEntregaOnce();
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // realtime pedidos → pagado
  useEffect(() => {
    if (!pedidoId) return;

    const ch = supabase
      .channel(`pedido_${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `id=eq.${pedidoId}`
      }, (payload) => {
        if (payload?.new?.estado === 'pagado') goEntregaOnce();
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // fallback polling
  useEffect(() => {
    if (!pedidoId) return;
    const i = setInterval(async () => {
      if (doneRef.current) return;
      const { data } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoId)
        .maybeSingle();
      if (data?.estado === 'pagado') goEntregaOnce();
    }, 3000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  return (
    <div className="container py-4">
      <h4>Paga con QR</h4>

      {loading && <p>Generando QR…</p>}

      {!loading && img && (
        <>
          <img src={img} alt="QR SIP" style={{ maxWidth: 260 }} />
          {venc && <p className="text-muted mt-2">Vence: {venc}</p>}
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={generarQR} disabled={loading}>
              Reemitir QR
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={revisarEstadoSIP} disabled={checking}>
              {checking ? 'Revisando…' : 'Revisar estado en SIP'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
