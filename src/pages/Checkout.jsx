import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { invokeOrFetch } from '../lib/functions';

export default function Checkout(){
  const { pedidoId } = useParams();
  const [img, setImg]   = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 👇 Exigir sesión antes de cualquier cosa
  useEffect(()=>{
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace:true, state:{ toast:{ title:'Inicia sesión', body:'Necesitas iniciar sesión para pagar.', variant:'warning' } }});
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
      // si ya está pagado, no generamos QR y redirigimos
      navigate(`/pedido/${pedidoId}/exito`, { replace:true });
      throw new Error('Pedido ya pagado');
    }
    if (data.estado !== 'pendiente') throw new Error('El pedido no está pendiente');

    return Number(data.total || 0);
  }

  async function generarQR(){
    setLoading(true);
    try{
      // 1) token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesión no válida. Inicia sesión nuevamente.');
      const token = session.access_token;

      // 2) validar pedido + monto
      const monto = await getMontoPedido();

      // 3) invocar función con Authorization: Bearer <token>
      const data = await invokeOrFetch('sip-genera-qr', {
        pedido_id: pedidoId,
        monto,
        glosa: `Pedido ${pedidoId}`
      }, { token }); // <<--- enviamos el token

      // { base64, idQr, expira } esperado
      if (!data?.base64) throw new Error('No se recibió imagen de QR');
      setImg(`data:image/png;base64,${data.base64}`);
      setVenc(data.expira || null);
    } catch (e){
      console.error(e);
      const msg = e?.message || 'No se pudo generar el QR';
      if (!/ya pagado/i.test(msg)) alert(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ if (pedidoId) generarQR(); /* eslint-disable-next-line */ }, [pedidoId]);

  // Realtime: cuando pagos_sip.estado -> confirmado => redirige
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
          navigate(`/pedido/${pedidoId}/exito`, { replace:true });
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
