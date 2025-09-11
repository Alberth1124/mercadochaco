import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function Codigo(){
  const [qp] = useSearchParams();
  const navigate = useNavigate();

  const email = qp.get('email') || '';
  // type=email (confirmación de registro) | recovery (recuperación)
  const type  = (qp.get('type') || 'email').toLowerCase();

  const [token, setToken] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cool, setCool] = useState(0);

  // contador de reenvío (60s, recomendado por Supabase)
  useEffect(()=>{
    if (cool > 0) {
      const t = setTimeout(()=>setCool(cool-1), 1000);
      return ()=>clearTimeout(t);
    }
  }, [cool]);

  const title = useMemo(()=> type === 'recovery' ? 'Código de recuperación' : 'Verifica tu correo', [type]);

  const onVerify = async (e)=>{
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try{
      // verifyOtp soporta types: 'email' (signup/sign-in) y 'recovery' (reset) para email
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
      if (error) throw error;

      if (type === 'recovery') {
        // Con sesión temporal creada, vamos a la pantalla para fijar la nueva contraseña
        navigate('/recuperar', { replace: true });
      } else {
        // Confirmación de email: ya hay sesión => a Home (o Bienvenido)
        navigate('/bienvenido', { replace: true });
      }
    } catch (e) {
      setErr(e.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async ()=>{
    setErr(null); setMsg(null);
    try{
      if (type === 'recovery') {
        // Enviar email de recuperación (tu plantilla ya incluye {{ .Token }})
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/recuperar`
        });
        if (error) throw error;
      } else {
        // Reenviar OTP de verificación de email
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false }
        });
        if (error) throw error;
      }
      setMsg('Código reenviado. Revisa tu correo.');
      setCool(60); // enfriamiento recomendado
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="container py-4">
      <Card className="mx-auto" style={{maxWidth: 420}}>
        <Card.Body>
          <h4 className="mb-3">{title}</h4>
          <p className="text-muted">Hemos enviado un código a <b>{email}</b>.</p>

          {msg && <Alert variant="success">{msg}</Alert>}
          {err && <Alert variant="danger">{err}</Alert>}

          <Form onSubmit={onVerify}>
            <Form.Group className="mb-3">
              <Form.Label>Código de 6 dígitos</Form.Label>
              <Form.Control value={token} onChange={e=>setToken(e.target.value.trim())}
                inputMode="numeric" autoFocus maxLength={6} placeholder="123456" required />
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? 'Verificando…' : 'Verificar'}</Button>
              <Button variant="outline-secondary" type="button" onClick={onResend} disabled={cool>0}>
                {cool>0 ? `Reenviar en ${cool}s` : 'Reenviar código'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
