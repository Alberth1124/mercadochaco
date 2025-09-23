// src/pages/Checkout.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { showToast } from '../utils/toast';
import { useCart } from "../context/CartContext";

export default function Checkout() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();

  const [img, setImg] = useState(null);
  const [venc, setVenc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const doneRef = useRef(false);     // navegación una sola vez
  const genLock = useRef(false);     // anti doble generación (click/StrictMode)
  const initLock = useRef(false);    // anti doble init por StrictMode

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
    navigate(`/entrega/${pedidoId}`, { replace: true });
  };

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
  }, []);

  async function getMontoPedido() {
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

  async function generarQR() {
    if (!pedidoId) {
      showToast({ title: 'Error', body: 'Falta pedidoId en la ruta /checkout/:pedidoId', variant: 'danger' });
      return;
    }
    if (genLock.current) return;
    genLock.current = true;
    setLoading(true);

    try {
      const monto = await getMontoPedido();

      const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
        body: { pedido_id: pedidoId, monto, glosa: `Pedido ${pedidoId}` },
      });
      if (error) throw new Error(error.message || JSON.stringify(error));

      const b64 = data?.base64 || data?.objeto?.imagenQr;
      const expir = data?.expira || data?.objeto?.fechaVencimiento || null;

      if (!b64) throw new Error('No se recibió imagen de QR');
      setImg(`data:image/png;base64,${b64}`);
      setVenc(expir);
      showToast({ title: 'QR listo', body: 'Escanéalo con tu app bancaria.', variant: 'info' });
    } catch (e) {
      const msg = e?.message || 'No se pudo generar el QR';
      if (!/ya pagado/i.test(msg)) {
        showToast({ title: 'Error', body: msg, variant: 'danger' });
      }
    } finally {
      setLoading(false);
      setTimeout(() => { genLock.current = false; }, 300);
    }
  }

  async function revisarEstadoSIP() {
    if (!pedidoId) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('sip-estado', {
        body: { pedido_id: pedidoId, apply: true }
      });
      if (error) throw new Error(error.message || JSON.stringify(error));

      const estado = String(data?.estado || '').toLowerCase();
      if (data?.applied || estado === 'pagado' || estado === 'confirmado') {
        goEntregaOnce();
      } else {
        showToast({ title: 'Estado', body: `Actual: ${data?.estado ?? 'desconocido'}`, variant: 'secondary' });
      }
    } catch (e) {
      showToast({ title: 'Error', body: e?.message || 'No se pudo consultar el estado', variant: 'danger' });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    (async () => {
      if (!pedidoId || initLock.current) return;
      initLock.current = true;

      const { data: ped } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoId)
        .maybeSingle();
      if (ped?.estado === 'pagado') { goEntregaOnce(); return; }

      const { data: row } = await supabase
        .from('pagos_sip')
        .select('estado, imagen_qr_base64, expira')
        .eq('pedido_id', pedidoId)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row?.estado === 'pendiente' && row?.imagen_qr_base64) {
        setImg(`data:image/png;base64,${row.imagen_qr_base64}`);
        setVenc(row.expira || null);
        return;
      }

      if (row?.estado === 'confirmado') { goEntregaOnce(); return; }

      await generarQR();
    })();
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
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={generarQR}
              disabled={loading}
            >
              Reemitir QR
            </button>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={revisarEstadoSIP}
              disabled={checking}
            >
              {checking ? 'Revisando…' : 'Revisar estado en SIP'}
            </button>
          </div>
        </>
      )}

      {!loading && !img && (
        <div className="mt-3">
          <button className="btn btn-primary btn-sm" onClick={generarQR} disabled={loading}>
            Generar QR
          </button>
        </div>
      )}
    </div>
  );
}
