import { useEffect, useRef, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

// usa un GIF animado en vez de una imagen estática
const logo = "/img/asistente-virtual.gif";

export default function ChatbotMC(){
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState([
    {from:'bot', text:'¡Hola! Soy el asistente de Mercado Chaco 😊 ¿En qué puedo ayudarte?'}
  ]);
  const [typing, setTyping] = useState(false);
  const [text, setText]   = useState("");
  const bodyRef = useRef(null);

  useEffect(()=>{
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior:'smooth' });
  },[msgs, typing]);

  const send = async (t) => {
    const q = (t ?? text).trim();
    if (!q) return;
    setMsgs(m=>[...m,{from:'me', text:q}]);
    setText("");
    setTyping(true);
    const reply = await answer(q);
    setTyping(false);
    setMsgs(m=>[...m,{from:'bot', html: reply }]);
  };

  const chip = (t)=> <button onClick={()=>send(t)}>{t}</button>;

  return (
    <>
      {/* panel */}
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <img src={logo} alt="bot" onError={(e)=>{e.currentTarget.style.display='none'}}/>
            <div><b>Chaco Chat</b><div style={{fontSize:12,opacity:.9}}>Respuestas rápidas</div></div>
            <button className="btn btn-sm btn-outline-light ms-auto" onClick={()=>setOpen(false)}>✕</button>
          </div>

          <div className="chatbot-body" ref={bodyRef}>
            <div className="quick-chips">
              {chip("¿Cómo pagar?")}
              {chip("Ver ofertas")}
              {chip("Registro")}
              {chip("Carrito y pedidos")}
              {chip("Quiero vender")}
              {chip("Soporte")}
            </div>

            {msgs.map((m,i)=>(
              <div className={`chatbot-msg ${m.from==='me'?'me':''}`} key={i}>
                <div className="chatbot-bubble">
                  {m.html ? <div dangerouslySetInnerHTML={{__html:m.html}}/> : m.text}
                </div>
              </div>
            ))}
            {typing && <div className="chatbot-typing">Escribiendo…</div>}
          </div>

          <div className="chatbot-input">
            <Form
              onSubmit={(e)=>{ e.preventDefault(); send(); }}
              className="d-flex gap-2"
            >
              <Form.Control
                placeholder="Escribe tu mensaje… (p. ej. ¿Cómo pagar?)"
                value={text}
                onChange={e=>setText(e.target.value)}
              />
              <Button type="submit" variant="success">Enviar</Button>
            </Form>
          </div>
        </div>
      )}

      {/* botón flotante */}
      <button className="chatbot-fab" onClick={()=>setOpen(o=>!o)} aria-label="Abrir chatbot">
        <img src={logo} alt="bot" onError={(e)=>{e.currentTarget.outerHTML='💬'}}/>
      </button>
    </>
  );
}

/* ===== LÓGICA SIMPLE DE INTENCIONES (sin búsqueda; respuestas básicas) ===== */
async function answer(q){
  const s = q.toLowerCase();

  // Soporte
  if (s.includes("soporte") || s.includes("ayuda") || s.includes("contacto")){
    return `
      <b>Soporte</b><br/>
      Escríbenos a <a href="mailto:alberthjsl11@gmail.com">alberthjsl11@gmail.com</a> y te responderemos a la brevedad.
    `;
  }

  // Registro
  if (s.includes("registro") || s.includes("registrarme")){
    return `
      <b>¿Cómo me registro?</b><br/>
      1) Ve a <a href="/registro-cliente">Crear cuenta</a> y completa tus datos.<br/>
      2) Revisa tu correo y confirma tu cuenta con el código o enlace.<br/>
      3) Inicia sesión en <a href="/login">Login</a>.<br/>
      ¿Quieres vender? Envía la <a href="/solicitud-productor">Solicitud de Productor</a>.
    `;
  }

  // Carrito y pedidos
  if (s.includes("carrito") || s.includes("pedido") || s.includes("pedidos")){
    return `
      <b>Carrito y pedidos</b><br/>
      • En <a href="/catalogo">Catálogo</a> elige un producto y pulsa “Agregar al carrito”.<br/>
      • Revisa tu <a href="/carrito">Carrito</a> y continúa a <a href="/checkout">Checkout</a>.<br/>
      • Sigue el estado en <a href="/mis-pedidos">Mis pedidos</a>.
    `;
  }

  // Vender
  if (s.includes("vender") || s.includes("productor")){
    return `
      <b>Vender en Mercado Chaco</b><br/>
      Envía tu <a href="/solicitud-productor">Solicitud de Productor</a> con tus datos y documentación.<br/>
      Nuestro equipo revisará tu solicitud y te notificará por correo.
    `;
  }

  // Ofertas: redirigir y también dejar enlace
  if (s.includes("oferta") || s.includes("descuento")){
    setTimeout(()=>{ try { window.location.assign('/catalogo#ofertas'); } catch {} }, 0);
    return `
      <b>Ofertas</b><br/>
      Te llevo a la sección de ofertas. Si no se abre automáticamente, entra aquí: <a href="/catalogo#ofertas">/catalogo#ofertas</a>.
    `;
  }

  // Cómo pagar: guía en párrafo
  if (s.includes("pagar") || s.includes("pago") || s.includes("pagos") || s.includes("¿cómo pagar?")){
    return `
      <b>¿Cómo pagar?</b><br/>
      1) Agrega tus productos al <a href="/carrito">Carrito</a> y avanza a <a href="/checkout">Checkout</a>.<br/>
      2) Elige tu método de pago disponible (por ejemplo, QR/transferencia).<br/>
      3) Confirma la orden; verás la confirmación y podrás seguir el estado en <a href="/mis-pedidos">Mis pedidos</a>.<br/>
      <small class="text-muted">* Los métodos pueden variar según el productor/tienda y tu zona.</small>
    `;
  }

  // Respuestas básicas “de IA” (FAQ mínimas)
  if (s.includes("qué es mercado chaco") || s.includes("que es mercado chaco") || s.includes("sobre chaco")){
    return `
      <b>¿Qué es Mercado Chaco?</b><br/>
      Es una plataforma para comprar y vender productos del Chaco boliviano, conectando a productores con compradores de forma directa.
    `;
  }
  if (s.includes("horario") || s.includes("atención") || s.includes("atencion")){
    return `
      <b>Horarios</b><br/>
      La tienda en línea está disponible 24/7. La atención al cliente por correo se responde en horario laboral.
    `;
  }
  if (s.includes("envío") || s.includes("envios") || s.includes("delivery")){
    return `
      <b>Envíos y entregas</b><br/>
      Las opciones dependen del productor y tu ubicación. Verás el detalle al finalizar la compra en <a href="/checkout">Checkout</a>.
    `;
  }

  // ayuda general
  return `
    Puedo ayudarte con:<br/>
    • <i>¿Cómo pagar?</i><br/>
    • <i>Ver ofertas</i><br/>
    • <i>Registro</i><br/>
    • <i>Carrito y pedidos</i><br/>
    • <i>Quiero vender</i><br/>
    • <i>Soporte</i><br/>
    • <i>¿Qué es Mercado Chaco?</i>
  `;
}
