// src/pages/Checkout.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const FN_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function Checkout() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [alias, setAlias] = useState(null);
  const [estado, setEstado] = useState('PENDIENTE');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pollTimer = useRef(null);

  // Canal Realtime
  const channel = useMemo(() => supabase.channel(`sip:${pedidoId}`), [pedidoId]);

  // 1) Genera QR al montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase.functions.invoke('sip-genera-qr', {
          body: { pedidoId },
        });
        if (error) throw error;

        // Acepta base64 con/sin prefijo
        const raw = data?.qr_image_base64 || null;
        const src = raw ? (String(raw).startsWith('data:') ? raw : `data:image/png;base64,${raw}`) : null;

        if (mounted) {
          setQr(src);
          setAlias(data?.alias || null);
          setEstado('PENDIENTE');
        }
      } catch (e) {
        setErrorMsg(e?.message || 'Error generando QR');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pedidoId]);

  // 2) Suscripción Realtime a pagos_sip y pedidos (cualquiera que cambie)
  useEffect(() => {
    const onChange = (payload) => {
      const newEstado = (payload?.new?.estado || payload?.new?.status || '').toString().toUpperCase();
      if (newEstado === 'PAGADO') {
        setEstado('PAGADO');
        // Ir a captura de datos de entrega
        navigate(`/entrega/${pedidoId}`);
      }
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_sip', filter: `pedido_id=eq.${pedidoId}` }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` }, onChange)
      .subscribe((status) => {
        // Si el WS no conecta, dejamos el polling encendido (abajo)
        // console.log('Realtime status:', status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [channel, navigate, pedidoId]);

  // 3) Polling de respaldo (si WS falla por red/extensiones)
  useEffect(() => {
    // cada 4s, consulta el estado desde pagos_sip
    const startPolling = () => {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('pagos_sip')
            .select('estado')
            .eq('pedido_id', pedidoId)
            .maybeSingle();
          if (!error) {
            const st = (data?.estado || '').toString().toUpperCase();
            if (st === 'PAGADO') {
              clearInterval(pollTimer.current); pollTimer.current = null;
              setEstado('PAGADO');
              navigate(`/entrega/${pedidoId}`);
            }
          }
        } catch {}
      }, 4000);
    };

    // arranca polling de inmediato; si Realtime funciona, redirigirá antes
    startPolling();
    return () => { if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; } };
  }, [pedidoId, navigate]);

  // 4) Verificar estado (botón) — lee de DB, no usa sip-estado
  async function verificarEstado() {
    setChecking(true); setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('pagos_sip')
        .select('estado, alias')
        .eq('pedido_id', pedidoId)
        .maybeSingle();
      if (error) throw error;
      const next = (data?.estado || '').toString().toUpperCase();
      if (next === 'PAGADO') {
        setEstado('PAGADO');
        navigate(`/entrega/${pedidoId}`);
      } else {
        setEstado(next || 'PENDIENTE');
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

      {!loading && !qr && !errorMsg && <p>No se pudo obtener el QR. Intenta nuevamente.</p>}

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
