import HeroChaco from '../components/HeroChaco';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PromoCarousel from '../components/PromoCarousel';
import CarruselOfertas from '../components/CarruselOfertas';

export default function Home() {
  return (
    <div>
      <Helmet>
        <title>Mercado Chaco — directo del productor</title>
        <meta
          name="description"
          content="Compra productos frescos del Chaco boliviano, directo del productor."
        />
        <meta name="theme-color" content="#1d8a41" />
      </Helmet>

      <HeroChaco />

      {/* 👇 Ofertas destacadas arriba del botón "Ver catálogo" */}
      <div className="container py-4">
        <CarruselOfertas />
      </div>

      <div className="text-center">
        <Button as={Link} to="/catalogo" size="lg">
          Ver catálogo
        </Button>
      </div>

      <br />
      <br />

      <div>
        <PromoCarousel title="Nuestros Colaboradores" />
      </div>
    </div>
  );
}
