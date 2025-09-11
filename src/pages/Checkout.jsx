// src/pages/Checkout.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Checkout(){
  const { pedidoId } = useParams();             // viene de /checkout/:pedidoId
  const [img, setImg] = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1) Traer el total del pedido (para no hardcodear el monto)
  async function getMontoPedido(){
    const { data, error } = await supabase
      .from('pedidos')
      .select('total, estado')
      .eq('id', pedidoId)
      .maybeSingle();
    if (error || !data) throw new Error('Pedido inválido');
    if (data.estado !== 'pendiente') throw new Error('El pedido no está pendiente');
    return Number(data.total || 0);
  }

  // 2) Generar el QR a través de la Edge Function
  async function generarQR(){
    setLoading(true);
    try{
      const monto = await getMontoPedido();
      // IMPORTANTE: usa invoke() del SDK (maneja CORS y dominio de funciones)
      const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
        body: { pedido_id: pedidoId, monto, glosa: `Pedido ${pedidoId}` }
      });
      if (error) throw error;
      // data: { base64, idQr, expira }
      setImg(`data:image/png;base64,${data.base64}`);
      setVenc(data.expira);
    } catch (e){
      alert(e.message || 'No se pudo generar el QR');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ generarQR(); /* al entrar a la pantalla */ }, [pedidoId]);

  // 3) Realtime: escuchar el cambio de estado del pago
  useEffect(()=>{
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
