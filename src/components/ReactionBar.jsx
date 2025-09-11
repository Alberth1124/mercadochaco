import { useEffect, useState } from "react";
import { ButtonGroup, ToggleButton } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { FaThumbsUp, FaHeart, FaCamera, FaStar } from "react-icons/fa";

const icons = {
  me_gusta: <FaThumbsUp/>,
  me_encanta: <FaHeart/>,
  recomendado: <FaStar/>
};
const labels = {
  me_gusta: "Me gusta",
  me_encanta: "Me encanta",
  recomendado: "Recomendado"
};

export default function ReactionBar({ productoId }){
  const { user } = useAuth();
  const [counts, setCounts] = useState({ me_gusta:0, me_encanta:0, quiero_ir:0, recomendado:0 });
  const [mine, setMine] = useState(null);

  async function load(){
    const { data: c } = await supabase.from('v_reacciones_conteos').select('*').eq('producto_id', productoId).maybeSingle();
    setCounts({
      me_gusta: c?.me_gusta || 0,
      me_encanta: c?.me_encanta || 0,
      recomendado: c?.recomendado || 0,
    });
    if (user){
      const { data: r } = await supabase.from('productos_reacciones').select('tipo').eq('producto_id', productoId).eq('usuario_id', user.id).maybeSingle();
      setMine(r?.tipo || null);
    }
  }

  useEffect(()=>{ load(); }, [productoId, user?.id]);

  const toggle = async (tipo)=>{
    if (!user) return alert('Inicia sesión para reaccionar.');
    const current = mine === tipo ? null : tipo;
    if (current){
      await supabase.from('productos_reacciones').upsert({
        producto_id: productoId, usuario_id: user.id, tipo: current
      }, { onConflict: 'producto_id,usuario_id' });
    }else{
      await supabase.from('productos_reacciones').delete().eq('producto_id', productoId).eq('usuario_id', user.id);
    }
    await load();
  };

  return (
    <div className="p-3 rounded" style={{background:'#08963e98', border:'1px solid #ffffffff'}}>
      <div className="fw-bold mb-2 text-body">Cuéntanos tu reacción</div>
      <ButtonGroup>
        {Object.keys(labels).map(k=>(
          <ToggleButton
            key={k} id={k} type="checkbox" variant={mine===k ? 'success' : 'outline-success'}
            value={k} checked={mine===k} onChange={()=>toggle(k)}
          >
            <span className="me-1">{icons[k]}</span> {labels[k]} <span className="ms-1 badge bg-light text-dark">{counts[k]||0}</span>
          </ToggleButton>
        ))}
      </ButtonGroup>
    </div>
  );
}
