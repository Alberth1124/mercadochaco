// src/pages/Checkout.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Checkout() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [alias, setAlias] = useState(null);
  const [estado, setEstado] = useState('PENDIENTE');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Canal Realtime (memorizado por pedido)
  const channel = useMemo(() => {
    return supabase.channel(`sip:${pedidoId}`);
  }, [pedidoId]);

  // Generar QR al montar
  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
          body: { pedidoId },
        });
        if (error) throw error;
        // data: { alias, qr_image_base64, fecha_vencimiento, ... }
        if (mounted) {
          setQr(data?.qr_image_base64 ? `data:image/png;base64,${data.qr_image_base64}` : null);
          setAlias(data?.alias || null);
          setEstado('PENDIENTE');
        }
      } catch (e) {
        setErrorMsg(e?.message || 'Error generando QR');
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [pedidoId]);

  // Suscripción Realtime a pagos_sip (estado de pago)
  useEffect(() => {
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pagos_sip', filter: `pedido_id=eq.${pedidoId}` },
        payload => {
          const next = (payload?.new?.estado || payload?.new?.status || '').toUpperCase();
          if (next) {
            setEstado(next);
            if (next === 'PAGADO') {
              navigate(`/exito/${pedidoId}`);
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channel, navigate, pedidoId]);

  async function verificarEstado() {
    setChecking(true);
    setErrorMsg('');
    try {
      const body = alias ? { alias } : { pedidoId };
      const { data, error } = await supabase.functions.invoke('sip-estado', { body });
      if (error) throw error;
      const next = (data?.estadoActual || '').toUpperCase();
      if (next) {
        setEstado(next);
        if (next === 'PAGADO') {
          navigate(`/exito/${pedidoId}`);
        }
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Error verificando estado');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '24px auto', padding: 16 }}>
      <h2>Pago con QR SIP</h2>

      {loading && <p>Generando QR…</p>}
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      {!loading && !qr && !errorMsg && (
        <p>No se pudo obtener el QR. Intenta nuevamente.</p>
      )}

      {!loading && qr && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
          <img src={qr} alt="QR SIP" style={{ width: 260, height: 260, border: '1px solid #EEE' }} />
          <div>
            <p><b>Estado:</b> {estado}</p>
            <p><b>Alias:</b> {alias || '—'}</p>
            <button onClick={verificarEstado} disabled={checking} style={{ padding: '8px 12px' }}>
              {checking ? 'Verificando…' : 'Verificar estado'}
            </button>
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Escanea el código con tu app bancaria y confirma el pago.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
