import { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

export default function Recuperar(){
  const [p1,setP1] = useState(""); const [p2,setP2] = useState("");
  const [show,setShow] = useState(false);
  const [ok,setOk] = useState(null); const [err,setErr] = useState(null);

  const onSubmit = async (e)=>{
    e.preventDefault(); setErr(null); setOk(null);
    if (p1.length<6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (p1!==p2) return setErr("Las contraseñas no coinciden.");
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) setErr(error.message); else setOk("Contraseña actualizada. Ya puedes iniciar sesión.");
  };

  return (
    <Card className="mx-auto" style={{maxWidth:480}}>
      <Card.Body>
        <h4>Asignar nueva contraseña</h4>
        {ok && <Alert variant="success">{ok}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}
        <Form onSubmit={onSubmit}>
          <div className="position-relative mb-2">
            <Form.Control type={show?'text':'password'} placeholder="Nueva contraseña" value={p1} onChange={e=>setP1(e.target.value)} />
            <button type="button" className="toggle-eye" onClick={()=>setShow(s=>!s)}>{show ? <IoEyeOffOutline/> : <IoEyeOutline/>}</button>
          </div>
          <Form.Control className="mb-3" type="password" placeholder="Repite la contraseña" value={p2} onChange={e=>setP2(e.target.value)} />
          <div className="d-grid">
            <Button type="submit">Guardar</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
