import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { invokeOrFetch } from '../lib/functions';
import { showToast } from '../utils/toast'; // ✅ usa tu ToasterMC

export default function Checkout(){
  const { pedidoId } = useParams();
  const [img, setImg]   = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Exigir sesión
  useEffect(()=>{
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', {
          replace:true,
          state:{ toast:{ title:'Inicia sesión', body:'Necesitas iniciar sesión para pagar.', variant:'warning' } }
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
      // Si ya está pagado, ir directo a entrega
      navigate(`/entrega/${pedidoId}`, { replace:true });
      throw new Error('Pedido ya pagado');
    }
    if (data.estado !== 'pendiente') throw new Error('El pedido no está pendiente');

    return Number(data.total || 0);
  }

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

  useEffect(()=>{ if (pedidoId) generarQR(); /* eslint-disable-next-line */ }, [pedidoId]);

  // ✅ Realtime: confirmado → toast + /entrega/:pedidoId
  useEffect(()=>{
    if (!pedidoId) return;
    const ch = supabase
      .channel(`pago_${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pagos_sip',
        filter: `pedido_id=eq.${pedidoId}`
      }, payload=>{
        if (payload.new?.estado === 'confirmado'){
          showToast({ title: '¡Pago confirmado!', body: 'Ahora completa los datos de entrega.', variant: 'success' });
          navigate(`/entrega/${pedidoId}`, { replace:true });
        }
      })
      .subscribe();

    return ()=> supabase.removeChannel(ch);
  }, [pedidoId, navigate]);

  return (
    <div className="container py-4">
      <h4>Paga con QR</h4>
      {loading && <p>Generando QR…</p>}
      {!loading && img && (
        <>
          <img src={img} alt="QR SIP" style={{maxWidth:260}}/>
          {venc && <p className="text-muted mt-2">Vence: {venc}</p>}
          <div className="mt-3">
            <button className="btn btn-outline-secondary btn-sm" onClick={generarQR}>
              Reemitir QR
            </button>
          </div>
        </>
      )}
    </div>
  );
}
