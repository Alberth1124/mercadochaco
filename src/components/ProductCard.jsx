import { Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaWhatsapp, FaInfoCircle, FaStore, FaCartPlus } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { showToast } from "../utils/toast";
import { waHrefFromPhoneBO } from "../utils/phone";

export default function ProductCard({ item }){
  const nav = useNavigate();
  const { addToCart } = useCart?.() || { addToCart: ()=>{} };

  const foto   = item.imagen_portada_url || "/img/noimage.jpg";
  const seller = (item.productor_nombres || "") + (item.productor_apellidos ? ` ${item.productor_apellidos}` : "");
  const precio = item.precio != null ? Number(item.precio).toFixed(2) : null;

  const go = ()=> nav(`/producto/${item.id}`);

  const wa = waHrefFromPhoneBO(item.productor_telefono, `Hola, me interesa: ${item.nombre}. ¿Precio y entrega?`);

  const add = (e)=>{
    e.stopPropagation();
    addToCart(item, 1);
    showToast({ title: "Agregado al carrito", body: item.nombre, variant: "success" });
  };

  return (
    <Card className="product-card" onClick={go}>
      <div className="img-wrap">
        <img src={foto} alt={item.nombre} onError={e=>{e.currentTarget.src='/img/noimage.jpg'}}/>
        <span className="product-badge"><FaStore className="me-1" /> {seller || 'Productor'}</span>
      </div>

      <div className="product-body">
        <div className="product-seller">{seller || 'Productor'}</div>
        <div className="product-title">{item.nombre}</div>
        {precio && <div className="product-price">{precio} Bs.</div>}
      </div>

      <div className="product-actions d-flex flex-wrap gap-2">
        <Button className="btn-cart flex-fill" variant="outline-success" onClick={add}>
          <FaCartPlus className="me-2" /> Añadir
        </Button>
        {wa && (
          <Button className="btn-wa flex-fill" onClick={(e)=>{ e.stopPropagation(); window.open(wa, "_blank"); }}>
            <FaWhatsapp className="me-2" /> Contactarse
          </Button>
        )}
        <Button variant="outline-success" onClick={(e)=>{ e.stopPropagation(); go(); }}>
          <FaInfoCircle className="me-1" /> Detalle
        </Button>
      </div>
    </Card>
  );
}
