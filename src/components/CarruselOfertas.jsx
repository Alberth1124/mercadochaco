import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Carousel } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useCart } from '../context/CartContext'; // 👈 si tienes el contexto

const money = (v)=> `BOB${Number(v ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
const chunk = (arr, n)=> Array.from({length: Math.ceil(arr.length / n)}, (_,i)=>arr.slice(i*n,(i+1)*n));

export default function CarruselOfertas({ title='SuperOfertas' }){
  const [items, setItems] = useState([]);
  const [perRow, setPerRow] = useState(4);
  const navigate = useNavigate();
  const cart = (() => {
    try { return useCart?.(); } catch { return null; }
  })();

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

  const addToCart = (e, x) => {
    e.stopPropagation();
    if (cart?.add) {
      cart.add({ id: x.id, nombre: x.nombre, precio: x.precio, qty: 1, imagen: x.imagen_portada_url });
    }
  };

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
                      {/* 🏷️ Badge de descuento */}
                      <span className="of-discount">-15%</span>

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

                      {/* 🛒 Botón carrito (icono SVG), sólo visual + add */}
                      <button
                        className="of-cartbtn"
                        title="Añadir al carrito"
                        onClick={(e)=>addToCart(e, x)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.45A2 2 0 0 0 10 19h9v-2h-8.42a.25.25 0 0 1-.22-.37L11.1 14h6.45a2 2 0 0 0 1.8-1.1l3.24-6.49A1 1 0 0 0 21.7 5H7.42L7 4Z" fill="currentColor"/>
                          <circle cx="10.5" cy="20.5" r="1.5" fill="currentColor"/>
                          <circle cx="17.5" cy="20.5" r="1.5" fill="currentColor"/>
                        </svg>
                      </button>
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
