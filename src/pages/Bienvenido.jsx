import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import PromoCarousel from "../components/PromoCarousel";
import CarruselOfertas from "../components/CarruselOfertas";

export default function Bienvenido(){
  const { perfil } = useAuth();
  const nav = useNavigate();

  useEffect(()=>{ document.title='¡Bienvenido! — CHACO'; },[]);

  const rol = perfil?.rol || 'cliente';

  return (
    <div className="container">
      <div className="hero-chaco p-4 mb-4">
        <span className="tag me-2">Nuevo</span>
        <h1 className="h3 m-0">¡Bienvenido {perfil?.nombres ? perfil.nombres : ''}!</h1>
        <p className="text-muted m-0">Explora productos, arma tu carrito o administra tus publicaciones.</p>
      </div>

      {/* ✅ Carrusel de ofertas arriba del botón Ver catálogo */}
      <div className="mb-3">
        <CarruselOfertas title="SuperOfertas" />
        <div className="text-center mt-3">
          <Button onClick={()=>nav('/catalogo')} variant="primary">
            Ver catálogo
          </Button>
        </div>
      </div>

      <PromoCarousel/>

      <div className="row g-3">
        <div className="col-md-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Catálogo</Card.Title>
              <Card.Text>Descubre productos del Chaco y compra directo al productor.</Card.Text>
              <Button onClick={()=>nav('/catalogo')}>Ver catálogo</Button>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Mi perfil</Card.Title>
              <Card.Text>Edita tus datos y tu avatar.</Card.Text>
              <Button variant="outline-success" onClick={()=>nav('/perfil')}>Ir a mi perfil</Button>
            </Card.Body>
          </Card>
        </div>

        {rol!=='cliente' && (
          <div className="col-md-4">
            <Card className="h-100">
              <Card.Body>
                <Card.Title>Panel de {rol==='admin' ? 'administrador' : 'productor'}</Card.Title>
                <Card.Text>Gestiona tus productos y órdenes.</Card.Text>
                <Button variant="outline-primary" onClick={()=>nav(rol==='admin'?'/admin/solicitudes':'/panel/productor')}>
                  Abrir panel
                </Button>
              </Card.Body>
            </Card>
          </div>
        )}

        {rol==='cliente' && (
          <div className="col-md-4">
            <Card className="h-100">
              <Card.Body>
                <Card.Title>¿Eres productor?</Card.Title>
                <Card.Text>Solicita verificación para vender en la plataforma.</Card.Text>
                <Button variant="outline-primary" onClick={()=>nav('/solicitud-productor')}>
                  Enviar solicitud
                </Button>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
