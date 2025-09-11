import { useEffect, useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function Restablecer(){
  const [ready, setReady] = useState(false);
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    // Al volver desde el email, Supabase coloca un token en la URL/hash y crea sesión temporal.
    // Esperamos a que esté la sesión para permitir el cambio.
    (async ()=>{
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
    })();
  },[]);

  const cambiar = async (e)=>{
    e.preventDefault(); setErr(null); setMsg(null); setLoading(true);
    try{
      if (pass1.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (pass1 !== pass2) throw new Error('Las contraseñas no coinciden.');
      const { error } = await supabase.auth.updateUser({ password: pass1 });
      if (error) throw error;
      setMsg('Tu contraseña fue actualizada. Ya puedes iniciar sesión.');
    } catch(e2){ setErr('No se pudo actualizar: ' + e2.message); }
    finally{ setLoading(false); }
  };

  if (!ready)
    return <div className="text-center py-5">Validando enlace…</div>;

  return (
    <Card className="mx-auto" style={{maxWidth:520}}>
      <Card.Body>
        <h4 className="mb-3">Restablecer contraseña</h4>
        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}
        <Form onSubmit={cambiar}>
          <Form.Group className="mb-2">
            <Form.Label>Nueva contraseña</Form.Label>
            <Form.Control type="password" value={pass1} onChange={e=>setPass1(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Repetir contraseña</Form.Label>
            <Form.Control type="password" value={pass2} onChange={e=>setPass2(e.target.value)} required />
          </Form.Group>
          <div className="d-grid">
            <Button type="submit" disabled={loading}>{loading ? <Spinner size="sm"/> : 'Guardar contraseña'}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
