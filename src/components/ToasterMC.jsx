import { useEffect, useState } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

export default function ToasterMC(){
  const [items, setItems] = useState([]);

  useEffect(()=>{
    const h = (e)=>{
      const d = e.detail || {};
      setItems(prev => [...prev, { id: Date.now()+Math.random(), ...d }]);
    };
    window.addEventListener('toast:show', h);
    return ()=> window.removeEventListener('toast:show', h);
  },[]);

  const close = (id)=> setItems(prev => prev.filter(t=>t.id!==id));

  return (
    <ToastContainer position="bottom-end" className="p-3">
      {items.map(t=>(
        <Toast key={t.id} onClose={()=>close(t.id)} delay={3500} autohide bg={mapBg(t.variant)}>
          <Toast.Header closeButton>
            <strong className="me-auto">{t.title||'Notificación'}</strong>
          </Toast.Header>
          {t.body && <Toast.Body className="text-white">{t.body}</Toast.Body>}
        </Toast>
      ))}
    </ToastContainer>
  );
}

function mapBg(v){
  switch(v){
    case 'success': return 'success';
    case 'danger': return 'danger';
    case 'warning': return 'warning';
    default: return 'dark';
  }
}
