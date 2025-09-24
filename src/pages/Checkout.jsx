import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Checkout() {
  const { pedidoId } = useParams();
  const [qrImage, setQrImage] = useState(null);
  const [estadoPago, setEstadoPago] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pedidoId) {
      console.error('Pedido ID no está disponible');
      return;
    }

    generarQR();
  }, [pedidoId]);

  const getMontoPedido = async () => {
    if (!pedidoId) {
      console.error('Pedido ID no está definido');
      return;
    }

    const { data, error } = await supabase
      .from('pedidos')
      .select('total')
      .eq('id', pedidoId)
      .single();

    if (error || !data) {
      console.error('Error al obtener el monto del pedido:', error);
      throw new Error('Pedido no encontrado');
    }

    return data.total;
  };

 const generarQR = async () => {
  setLoading(true);
  try {
    const monto = await getMontoPedido();
    console.log('Monto obtenido:', monto);

    const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
      body: { pedido_id: pedidoId, monto, glosa: `Pedido ${pedidoId}` },
    });

    if (error) {
      console.error('Error al generar el QR:', error);
      return;
    }

    if (data?.base64) {
      setQrImage(`data:image/png;base64,${data.base64}`);
    } else {
      console.error('No se recibió el QR');
    }
  } catch (error) {
    console.error('Error generando el QR:', error);
  } finally {
    setLoading(false);
  }
};



  const verificarEstadoPago = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pagos_sip')
        .select('estado')
        .eq('pedido_id', pedidoId)
        .single();

      if (error) {
        console.error('Error al verificar el estado del pago:', error);
        setEstadoPago('Error al verificar el estado del pago.');
        return;
      }

      if (data?.estado === 'confirmado') {
        setEstadoPago('Pago confirmado. ¡Gracias por tu compra!');
      } else {
        setEstadoPago(`Estado del pago: ${data?.estado || 'Desconocido'}`);
      }
    } catch (error) {
      console.error('Error al verificar el estado del pago:', error);
      setEstadoPago('Error al verificar el estado del pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4>Estado del Pago</h4>
      {loading && <p>Generando QR...</p>}
      {qrImage && (
        <div>
          <img src={qrImage} alt="QR SIP" style={{ maxWidth: 260 }} />
        </div>
      )}
      <button onClick={verificarEstadoPago} disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar Estado de Pago'}
      </button>
      {estadoPago && <p>{estadoPago}</p>}
    </div>
  );
}
