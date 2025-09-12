import { useEffect, useState } from 'react';
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

  // limpiar carrito de forma segura
  const { clear: clearCart } = useCart(); // sin optional chaining aquí; el contexto debe existir
  const clearCartSafe = () => {
    try { clearCart?.(); } catch {}
    try { localStorage.removeItem('mc_cart'); } catch {}
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
      clearCartSafe(); // 🔹 limpia carrito si ya estaba pagado
      navigate(`/entrega/${pedidoId}`, { replace:true });
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

  // 🔎 A) Chequeo inicial por si el pago ya está confirmado
  useEffect(() => {
    (async () => {
      if (!pedidoId) return;
      const { data: row, error } = await supabase
        .from('pagos_sip')
        .select('estado')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      if (!error && row?.estado === 'confirmado') {
        clearCartSafe(); // 🔹 limpia carrito
        showToast({ title: '¡Pago confirmado!', body: 'Ahora completa los datos de entrega.', variant: 'success' });
        navigate(`/entrega/${pedidoId}`, { replace:true });
        return;
      }

      // Si no estaba confirmado, genera (o reemite) el QR
      await generarQR();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // 🔔 B) Realtime: si cambia pagos_sip → confirmado => redirigir
  useEffect(() => {
    if (!pedidoId) return;

    const channel = supabase
      .channel(`pago_${pedidoId}`)
      .on('postgres_changes', {
        event: '*',                // escucha INSERT y UPDATE
        schema: 'public',
        table: 'pagos_sip',
        filter: `pedido_id=eq.${pedidoId}`
      }, (payload) => {
        const estado = payload?.new?.estado || payload?.old?.estado;
        if (estado === 'confirmado') {
          clearCartSafe(); // 🔹 limpia carrito
          showToast({ title: '¡Pago confirmado!', body: 'Ahora completa los datos de entrega.', variant: 'success' });
          navigate(`/entrega/${pedidoId}`, { replace:true });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [pedidoId, navigate]);

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
            {/* Si agregaste el fallback "Revisar estado en SIP", el botón puede ir aquí */}
          </div>
        </>
      )}
    </div>
  );
}
