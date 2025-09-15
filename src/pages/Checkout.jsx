// src/pages/Checkout.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { invokeOrFetch } from '../lib/functions';
import { showToast } from '../utils/toast';
import { useCart } from "../context/CartContext";

export default function Checkout(){
  const { pedidoId } = useParams();
  const [img, setImg]   = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // evita doble navegación/limpieza
  const doneRef = useRef(false);

  // limpiar carrito de forma segura
  const { clear: clearCart } = useCart(); // el contexto debe existir
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

  // Exigir sesión
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

  // Obtiene total y valida estado del pedido
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

  // Genera/Reemite QR
  async function generarQR(){
    setLoading(true);
    try{
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesión no válida. Inicia sesión nuevamente.');
      const token = session.access_token;

      const monto = await getMontoPedido();

      const data = await invokeOrFetch('sip-genera-qr', {
        pedido_id: pedidoId,
        monto,
        glosa: `Pedido ${pedidoId}`
      }, { token });

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

  // A) Chequeo inicial pagos_sip (por si ya estaba confirmado) + emitir QR
  useEffect(() => {
    (async () => {
      if (!pedidoId) return;

      // si ya está pagado (por seguridad extra)
      const { data: ped } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoId)
        .maybeSingle();
      if (ped?.estado === 'pagado') {
        goEntregaOnce();
        return;
      }

      // chequear pagos_sip
      const { data: row } = await supabase
        .from('pagos_sip')
        .select('estado')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      if (row?.estado === 'confirmado') {
        goEntregaOnce();
        return;
      }

      // Si no estaba confirmado, genera (o reemite) el QR
      await generarQR();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // B1) Realtime: pagos_sip → confirmado => redirigir
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
        if (estado === 'confirmado') {
          goEntregaOnce();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // B2) Realtime adicional: pedidos → pagado (por si el callback marca directo el pedido)
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
        if (payload?.new?.estado === 'pagado') {
          goEntregaOnce();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // C) Fallback polling cada 3s (invisible para el cliente)
  useEffect(() => {
    if (!pedidoId) return;
    const i = setInterval(async () => {
      if (doneRef.current) return;
      const { data } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoId)
        .maybeSingle();
      if (data?.estado === 'pagado') {
        goEntregaOnce();
      }
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
            {/* Si agregas el botón "Revisar estado en SIP", colócalo aquí (no afecta la vista actual) */}
          </div>
        </>
      )}
    </div>
  );
}
