import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { FaUser, FaPhone, FaEnvelope, FaLock } from 'react-icons/fa';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import AuthShell from '../components/AuthShell.jsx';

const m = (x) => (x ? 'Ocurrió un error: ' + x : '');

export default function RegistroCliente() {
  const navigate = useNavigate();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { nombres, apellidos, telefono },
          // Puedes configurar redirectTo si quieres forzar un retorno a tu app tras el enlace:
          // emailRedirectTo: `${window.location.origin}/codigo?email=${encodeURIComponent(email)}&type=email`
        },
      });
      if (error) throw error;

      // Opcional: si deseas forzar envío OTP manual extra (además del correo de verificación):
      // await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

      // Redirige al paso de código: tu plantilla ya incluye {{ .Token }} y/o {{ .ConfirmationURL }}
      setMsg('Te enviamos un código de verificación a tu correo.');
      navigate(`/codigo?email=${encodeURIComponent(email)}&type=email`, { replace: true });
      return; // El resto (perfil) lo hará el trigger o al ingresar ya verificado
    } catch (e2) {
      // Mensajes más amables para casos comunes
      const msg = String(e2?.message || '');
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('exists')) {
        setErr('Este correo ya tiene una cuenta registrada. Revisa tu bandeja o intenta recuperar tu contraseña.');
      } else if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
        setErr('Demasiados intentos. Espera 60 segundos antes de reenviar el código.');
      } else {
        setErr(m(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Crear cuenta de cliente">
      {msg && <Alert variant="success">{msg}</Alert>}
      {err && <Alert variant="danger">{err}</Alert>}

      <Form onSubmit={onSubmit}>
        <div className="section-title">Datos personales</div>

        <div className="input-icon mb-2">
          <FaUser className="bi" />
          <Form.Control
            placeholder="Nombres"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            required
          />
        </div>

        <div className="input-icon mb-2">
          <FaUser className="bi" />
          <Form.Control
            placeholder="Apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            required
          />
        </div>

        <div className="input-icon mb-2">
          <FaEnvelope className="bi" />
          <Form.Control
            placeholder="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-icon mb-2">
          <FaLock className="bi" />
          <Form.Control
            placeholder="Contraseña"
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="button"
            className="toggle-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
            <br />
            <br />
          </button>
          <div className="form-text">Mínimo 8 caracteres.</div>
        </div>

        <div className="input-icon mb-3">
          <FaPhone className="bi" />
          <Form.Control
            placeholder="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        <div className="d-grid">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </div>
      </Form>
    </AuthShell>
  );
}
