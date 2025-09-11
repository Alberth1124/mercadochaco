import { useEffect, useState } from 'react';
import { Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaPhone, FaMapMarkerAlt, FaSeedling, FaIdCard } from 'react-icons/fa';
import AuthShell from '../components/AuthShell.jsx';
import CameraCapture from '../components/CameraCapture.jsx';
import '../styles/solicitud.css';

function ImgEjemplo({ src, alt }) {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return <img src={src} alt={alt} className="guia-ejemplo" onError={() => setShow(false)} />;
}

export default function SolicitudProductor() {
  const { user, perfil } = useAuth();

  const [form, setForm] = useState({
    nombres: '', apellidos: '', ci: '', telefono: '',
    pais: 'Bolivia', departamento: '', municipio: '', comunidad: '', actividad: ''
  });

  const [dniFront, setDniFront] = useState(null);
  const [dniBack,  setDniBack]  = useState(null);
  const [cred,     setCred]     = useState(null); // opcional
  const [selfie,   setSelfie]   = useState(null);

  // previews
  const [prevFront, setPrevFront] = useState(null);
  const [prevBack,  setPrevBack]  = useState(null);
  const [prevCred,  setPrevCred]  = useState(null);
  const [prevSelf,  setPrevSelf]  = useState(null);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (perfil) {
      setForm((f) => ({
        ...f,
        nombres: perfil.nombres || '',
        apellidos: perfil.apellidos || '',
        telefono: perfil.telefono || ''
      }));
    }
  }, [perfil]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const uploadPriv = async (file, label) => {
    if (!file) return null;
    const safeName = file.name?.replace(/\s+/g, '_') || `${label}.jpg`;
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { data, error } = await supabase
      .storage
      .from('identidades')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (error) throw error;
    return data.path;
  };

  const enviar = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    try {
      if (!user?.id) throw new Error('Debes iniciar sesión para enviar la solicitud.');
      setSaving(true);

      const ci = (form.ci || '').trim();
      const tel = (form.telefono || '').trim();

      if (!ci) throw new Error('Ingresa tu CI.');
      if (!tel) throw new Error('Ingresa tu teléfono.');
      if (!dniFront || !dniBack || !selfie) {
        throw new Error('Captura/sube el frente, reverso y una selfie en vivo.');
      }

      const pFront = await uploadPriv(dniFront, 'carnet_frente');
      const pBack  = await uploadPriv(dniBack,  'carnet_reverso');
      const pSelf  = await uploadPriv(selfie,   'selfie');
      const pCred  = cred ? await uploadPriv(cred, 'credencial') : null;

      const { error } = await supabase.from('productores_solicitudes').upsert({
        usuario_id: user.id,
        nombres: form.nombres,
        apellidos: form.apellidos,
        ci,
        telefono: tel,
        pais: form.pais,
        departamento: form.departamento,
        municipio: form.municipio,
        comunidad: form.comunidad,
        actividad: form.actividad,
        documento_frente_path: pFront,
        documento_reverso_path: pBack,
        selfie_path: pSelf,
        credencial_path: pCred,
        estado: 'pendiente'
      }, { onConflict: 'usuario_id' });

      if (error) throw error;
      setMsg('Solicitud enviada. Un administrador revisará tu información.');
    } catch (e2) {
      setErr(e2.message || 'Ocurrió un error al enviar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell
      title="Solicitud para Productor"
      subtitle="Vende directo desde el Chaco. Nosotros te ayudamos con la verificación."
      bullets={[
        'Carga tus documentos con la cámara',
        'Muestra tu actividad y ubicación',
        'La revisión la hace un administrador'
      ]}
    >
      {msg && <Alert variant="success">{msg}</Alert>}
      {err && <Alert variant="danger">{err}</Alert>}

      {/* FORMULARIO */}
      <Form onSubmit={enviar} noValidate>

        {/* DATOS */}
        <div className="section-title"><FaUser className="me-2" />Datos personales</div>
        <Row className="g-2 mb-3">
          <Col md={6}>
            <div className="input-icon">
              <FaUser className="bi" />
              <Form.Control
                name="nombres"
                placeholder="Nombres"
                value={form.nombres}
                onChange={onChange}
                required
                autoComplete="given-name"
                disabled={saving}
              />
            </div>
          </Col>
          <Col md={6}>
            <div className="input-icon">
              <FaUser className="bi" />
              <Form.Control
                name="apellidos"
                placeholder="Apellidos"
                value={form.apellidos}
                onChange={onChange}
                required
                autoComplete="family-name"
                disabled={saving}
              />
            </div>
          </Col>
        </Row>

        <div className="input-icon mb-3">
          <FaIdCard className="bi" />
          <Form.Control
            name="ci"
            placeholder="CI / N° de documento"
            value={form.ci}
            onChange={onChange}
            required
            inputMode="text"
            disabled={saving}
          />
        </div>

        <div className="input-icon mb-3">
          <FaPhone className="bi" />
          <Form.Control
            name="telefono"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={onChange}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={saving}
          />
        </div>

        {/* UBICACIÓN */}
        <div className="section-title"><FaMapMarkerAlt className="me-2" />Ubicación</div>
        <Row className="g-2 mb-3">
          <Col md={3}>
            <Form.Control
              name="pais"
              placeholder="País"
              value={form.pais}
              onChange={onChange}
              required
              disabled={saving}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              name="departamento"
              placeholder="Departamento"
              value={form.departamento}
              onChange={onChange}
              required
              disabled={saving}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              name="municipio"
              placeholder="Municipio"
              value={form.municipio}
              onChange={onChange}
              required
              disabled={saving}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              name="comunidad"
              placeholder="Comunidad"
              value={form.comunidad}
              onChange={onChange}
              required
              disabled={saving}
            />
          </Col>
        </Row>
        <div className="form-text">
          Formato sugerido: <b>Bolivia - Tarija - Villa Montes - Caigua</b>
        </div>

        {/* ACTIVIDAD */}
        <div className="section-title"><FaSeedling className="me-2" />Actividad</div>
        <Form.Group className="mb-3">
          <Form.Control
            as="textarea"
            rows={3}
            name="actividad"
            placeholder="¿Qué produce o venderá?"
            value={form.actividad}
            onChange={onChange}
            required
            disabled={saving}
          />
        </Form.Group>

        {/* GUÍA */}
        <div className="dropzone mb-3">
          <span className="badge-tip">Consejo</span>
          <div className="help-muted mt-1">
            Usa buena luz, evita reflejos y encuadra el documento dentro del marco punteado.
          </div>
          <div className="d-flex gap-3 mt-2 flex-wrap">
            <ImgEjemplo src="/img/guia-carnet-frente.png"  alt="Ejemplo carnet frente" />
            <ImgEjemplo src="/img/guia-carnet-reverso.png" alt="Ejemplo carnet reverso" />
            <ImgEjemplo src="/img/guia-selfie.png"        alt="Ejemplo selfie" />
            <ImgEjemplo src="/img/guia-credencial.png"    alt="Ejemplo credencial" />
          </div>
        </div>

        {/* CÁMARA / CAPTURAS */}
        <Row className="g-3">
          <Col md={6}>
            <CameraCapture
              label="Carnet - Frente"
              facing="environment"
              aspect={1.6}
              overlay="carnet"
              onCapture={(file, url) => { setDniFront(file); setPrevFront(url); }}
              disabled={saving}
            />
            {prevFront && <img src={prevFront} alt="Frente" className="preview-thumb mt-2" />}
          </Col>
          <Col md={6}>
            <CameraCapture
              label="Carnet - Reverso"
              facing="environment"
              aspect={1.6}
              overlay="carnet"
              onCapture={(file, url) => { setDniBack(file); setPrevBack(url); }}
              disabled={saving}
            />
            {prevBack && <img src={prevBack} alt="Reverso" className="preview-thumb mt-2" />}
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col md={6}>
            <CameraCapture
              label="Credencial de productor (opcional)"
              facing="environment"
              aspect={1.6}
              overlay="credencial"
              onCapture={(file, url) => { setCred(file); setPrevCred(url); }}
              disabled={saving}
            />
            {prevCred && <img src={prevCred} alt="Credencial" className="preview-thumb mt-2" />}
          </Col>
          <Col md={6}>
            <CameraCapture
              label="Selfie en vivo"
              facing="user"
              aspect={1}
              overlay="selfie"
              onCapture={(file, url) => { setSelfie(file); setPrevSelf(url); }}
              disabled={saving}
            />
            {prevSelf && <img src={prevSelf} alt="Selfie" className="preview-thumb mt-2" />}
          </Col>
        </Row>

        <div className="d-grid mt-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Enviar solicitud'}
          </Button>
        </div>
      </Form>
    </AuthShell>
  );
}
