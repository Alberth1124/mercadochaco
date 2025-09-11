import { useEffect, useState } from "react";
import { Card, Form, Button, Row, Col, Alert, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";

const DEFAULT_AVATAR = "/img/transgenero.png";
const SECURITY_GIF   = "/img/seguridad.gif";   // opcional (si no existe, se oculta)

export default function Perfil(){
  const { user, perfil, refreshPerfil } = useAuth();
  const [form, setForm] = useState({
    nombres:"", apellidos:"", telefono:"", avatar_url:"", email:""
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Cargar datos iniciales
  useEffect(()=>{
    if (!user) return;
    setForm({
      nombres:    perfil?.nombres    || "",
      apellidos:  perfil?.apellidos  || "",
      telefono:   perfil?.telefono   || "",
      avatar_url: perfil?.avatar_url || DEFAULT_AVATAR,
      email:      perfil?.email || user.email || ""
    });
  }, [perfil, user]);

  const onChange = e => setForm(f=>({ ...f, [e.target.name]: e.target.value }));

  // Subir avatar al bucket "avatars"
  const subirAvatar = async (file) => {
    if (!file) return;
    try{
      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert:true });
      if (error) throw error;
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(data.path).data.publicUrl;
      setForm(f=>({ ...f, avatar_url: publicUrl }));
    }catch(e){ setErr(e.message); }
  };

  // Guardar datos
  const guardar = async (e)=>{
    e.preventDefault(); setSaving(true); setMsg(null); setErr(null);
    try{
      // 1) Tabla perfiles
      const { error: e1 } = await supabase.from("perfiles").update({
        nombres: form.nombres,
        apellidos: form.apellidos,
        telefono: form.telefono || null,
        avatar_url: form.avatar_url
      }).eq("id", user.id);
      if (e1) throw e1;

      // 2) Metadata en auth (para que el Navbar muestre actualizaciones sin recargar)
      const { error: e2 } = await supabase.auth.updateUser({
        data: {
          nombres: form.nombres,
          apellidos: form.apellidos,
          telefono: form.telefono,
          avatar_url: form.avatar_url
        }
      });
      if (e2) throw e2;

      await refreshPerfil?.();
      setMsg("Perfil actualizado correctamente.");
      showToast({ title:"Guardado", body:"Perfil actualizado", variant:"success" });
    }catch(e3){ setErr(e3.message); }
    finally{ setSaving(false); }
  };

  // Flujo de cambio de contraseña por correo
  const correoResetPass = async ()=>{
    try{
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/recuperar`
      });
      if (error) throw error;
      showToast({ title:"Correo enviado", body:"Revisa tu bandeja para cambiar la contraseña.", variant:"info" });
    }catch(e){ setErr(e.message); }
  };

  return (
    <Card className="mx-auto" style={{maxWidth:860}}>
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <img
            src={form.avatar_url || DEFAULT_AVATAR}
            alt="avatar"
            width={56} height={56}
            style={{borderRadius:999, objectFit:"cover", border:"1px solid #e7f0ea"}}
            onError={e=>{ e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div className="ms-3">
            <h4 className="mb-0">{(form.nombres || "Tu nombre") + (form.apellidos ? ` ${form.apellidos}` : "")}</h4>
            <small className="text-muted">{form.email}</small>
          </div>
        </div>

        {/* Tarjeta de seguridad con GIF/imagen opcional */}
        <div className="d-flex align-items-center gap-3 p-2 mb-3 rounded"
             style={{background:"#f6fbf7", border:"1px solid #e6efe8"}}>
          <img src={SECURITY_GIF} alt="seguridad" width={64} height={64}
               onError={e=>{ e.currentTarget.style.display='none'; }} />
          <div className="small form-text text-muted text-light-emphasis">
            <b>Consejo de seguridad:</b> activa el cambio de contraseña desde aquí y revisa tu correo.
          </div>
        </div>

        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}

        <Form onSubmit={guardar}>
          <Row className="g-3">
            <Col md={4} className="text-center">
              <img
                src={form.avatar_url || DEFAULT_AVATAR}
                alt="avatar"
                className="img-thumbnail mb-2"
                style={{maxWidth:180, borderRadius:999, objectFit:"cover"}}
                onError={e=>{ e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <Form.Control
                type="file" accept="image/*"
                onChange={e=>subirAvatar(e.target.files?.[0])}
              />
              <div className="form-text text-muted text-light-emphasis">Puedes cambiar tu foto de perfil.</div>
            </Col>

            <Col md={8}>
              <Row className="g-2">
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Nombres</Form.Label>
                    <Form.Control name="nombres" value={form.nombres} onChange={onChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Apellidos</Form.Label>
                    <Form.Control name="apellidos" value={form.apellidos} onChange={onChange} required />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-2">
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Teléfono (opcional)</Form.Label>
                    <Form.Control name="telefono" value={form.telefono} onChange={onChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Correo</Form.Label>
                    <Form.Control value={form.email} disabled readOnly />
                    <Form.Text className="form-text text-muted text-light-emphasis">Para cambiar el correo contáctanos por soporte.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex gap-2 mt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : "Guardar cambios"}
                </Button>
                <Button variant="outline-secondary" type="button" onClick={correoResetPass}>
                  Cambiar contraseña por correo
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}
