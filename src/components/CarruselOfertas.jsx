import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Carousel } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const money = (v)=> `BOB${Number(v ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
const chunk = (arr, n)=> Array.from({length: Math.ceil(arr.length / n)}, (_,i)=>arr.slice(i*n,(i+1)*n));

export default function CarruselOfertas({ title='SuperOfertas' }){
  const [items, setItems] = useState([]);
  const [perRow, setPerRow] = useState(4);
  const navigate = useNavigate();

  // 1/2/3/4 tarjetas por slide según ancho
  useEffect(()=>{
    const onResize=()=>{
      const w = window.innerWidth;
      if (w < 576) setPerRow(1);
      else if (w < 992) setPerRow(2);
      else if (w < 1200) setPerRow(3);
      else setPerRow(4);
    };
    onResize(); window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  },[]);

  // Traer destacados
  useEffect(()=>{
    (async ()=>{
      const { data, error } = await supabase
        .from('v_destacados')
        .select('id,nombre,descripcion,precio,imagen_portada_url,categoria_nombre,vendedor_nombres,vendedor_apellidos')
        .limit(24);
      if (!error) setItems(data || []);
    })();
  },[]);

  const slides = useMemo(()=>chunk(items, perRow), [items, perRow]);
  if (!items.length) return null;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">{title}</h4>
      </div>

      <Carousel interval={4000} pause="hover" indicators={false}>
        {slides.map((group, idx)=>(
          <Carousel.Item key={idx}>
            <div className="of-grid" style={{gridTemplateColumns:`repeat(${perRow},minmax(0,1fr))`}}>
              {group.map(x=>{
                const vendedor = [x.vendedor_nombres, x.vendedor_apellidos].filter(Boolean).join(' ');
                return (
                  <article
                    key={x.id}
                    className="of-card"
                    onClick={()=>navigate(`/producto/${x.id}`)}
                    role="button"
                  >
                    <div className="of-imgwrap">
                      {x.imagen_portada_url
                        ? <img src={x.imagen_portada_url} alt={x.nombre}/>
                        : <div className="of-placeholder">Sin imagen</div>}
                      {vendedor && <span className="of-chip">{vendedor}</span>}
                    </div>

                    <div className="of-body">
                      <div className="of-name" title={x.nombre}>{x.nombre}</div>
                      <div className="of-price">{money(x.precio)}</div>
                    </div>

                    <div className="of-actions">
                      <Link
                        to={`/producto/${x.id}`}
                        className="btn btn-outline-success btn-sm"
                        onClick={(e)=>e.stopPropagation()}
                      >
                        Detalle
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
    </>
  );
}
