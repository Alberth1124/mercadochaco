import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF, FaLock, FaUser } from 'react-icons/fa';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { showToast } from '../utils/toast';
import '../styles/login.css';

function keyFor(email) {
  return `loginFails:${(email || '').toLowerCase().trim()}`;
}
function getFails(email) {
  return Number(localStorage.getItem(keyFor(email)) || 0);
}
function setFails(email, n) {
  localStorage.setItem(keyFor(email), String(n));
}

const msgES = (m) => {
  if (!m) return '';
  m = m.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.';
  if (m.includes('network')) return 'Error de red. Revisa tu conexión.';
  return 'Ocurrió un error: ' + m;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [show, setShow]   = useState(false);
  const [msg, setMsg]     = useState(null);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Mostrar toast si viene desde otra ruta
  useEffect(() => {
    const t = location.state?.toast;
    if (t) showToast(t);
  }, [location.state]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

      if (error) {
        const m = String(error.message || '').toLowerCase();

        // Caso especial: correo no confirmado -> flujo OTP
        if (m.includes('email not confirmed')) {
          setLoading(false);
          return navigate(`/codigo?email=${encodeURIComponent(email)}&type=email`);
        }

        // Otros errores: contar fallos por email
        const nf = getFails(email) + 1;
        setFails(email, nf);

        if (nf >= 3) {
          try {
            // Llamada correcta a Edge Function (usa el dominio de Supabase del proyecto)
            await supabase.functions.invoke('alert-login', {
              body: { email, ip: undefined },
            });
          } catch {
            // no bloquear la UX si la alerta falla
          } finally {
            setFails(email, 0); // reset para no spamear
          }
        }

        setMsg('Correo o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      // Éxito
      setFails(email, 0);
      navigate('/bienvenido');
    } catch (e2) {
      setMsg('Ocurrió un problema, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const withProvider = async (provider) => {
    setMsg(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="login-bg">
      <Card className="login-panel p-4">
        <div className="text-center">
          <img src="img/logocaba.png" alt="Logo Chaco" className="avatar-circle" />
          <div className="mt-2 brand h3 m-0">Inicia sesión</div>
          <br />
        </div>

        {msg && <Alert variant="light" className="py-2">{msg}</Alert>}

        <Form onSubmit={onSubmit}>
          <div className="input-icon mb-3">
            <FaUser className="bi" />
            <Form.Control
              placeholder="Correo electrónico"
              autoComplete="username"
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
              autoComplete="current-password"
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-eye"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {show ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
            </button>
          </div>

          <div className="d-flex justify-content-between small mb-3">
            <Link
              to={`/codigo?type=recovery${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className="link-light"
              style={{ opacity: 0.9 }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <Link to="/registro-cliente" className="link-light" style={{ opacity: 0.9 }}>
              Registrar nuevo cliente
            </Link>
          </div>

          <br />
          <div className="d-grid mb-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Ingresando…' : 'INGRESAR'}
            </Button>
          </div>
        </Form>

        {/* Social SOLO en login */}
        <Row className="g-2">
          <Col xs={12} sm={6}>
            <Button className="w-100 btn-google" onClick={() => withProvider('google')}>
              <span className="me-2"><FcGoogle size={18} /></span> Continuar con Google
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button className="w-100 btn-facebook" onClick={() => withProvider('facebook')}>
              <span className="me-2"><FaFacebookF size={16} /></span> Continuar con Facebook
            </Button>
          </Col>
        </Row>

        <div className="text-center mt-3 small" style={{ opacity: 0.9 }}>
          ¿Quieres vender? <Link to="/registro-cliente" className="link-light">Registra un productor</Link>
        </div>
      </Card>
    </div>
  );
}
