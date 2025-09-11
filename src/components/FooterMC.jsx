import { FaFacebook, FaTiktok, FaTwitter, FaInstagram, FaEnvelope, FaMapMarkerAlt, FaInfoCircle } from "react-icons/fa";

export default function FooterMC(){
  return (
    <footer className="mt-5 pt-4 pb-5" style={{ background: '#027c2bff' }}>
      <div className="container">
        <div className="row g-4 align-items-center">
          <div className="col-md-4 text-center">
            <img
              src="/img/QR.png"
              alt="QR redes"
              style={{ width: 150 }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          </div>

          {/* Redes sociales */}
          <div className="col-md-4">
            <h6 className="text-white">Síguenos en nuestras redes</h6>
            <ul className="list-unstyled m-0">
              <li className="mb-1">
                <a
                  href="https://www.facebook.com/reportechacobolivia"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Facebook Reporte Chaco"
                >
                  <FaFacebook className="me-2" /> Facebook
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://www.tiktok.com/@reporte.chaco?_t=ZM-8zZCNwehj2j&_r=1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="TikTok Reporte Chaco"
                >
                  <FaTiktok className="me-2" /> TikTok
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://x.com/ReporteChacoBo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Twitter/X Reporte Chaco"
                >
                  <FaTwitter className="me-2" /> Twitter / X
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://www.instagram.com/reportechacobolivia/#"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Instagram Reporte Chaco"
                >
                  <FaInstagram className="me-2" /> Instagram
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto / info */}
          <div className="col-md-4">
            <ul className="list-unstyled m-0">
              <li className="mb-2">
                <a
                  href="mailto:alberthsibautylabardenz@gmail.com"
                  className="text-white text-decoration-none"
                  aria-label="Enviar correo a Reporte Chaco"
                >
                  <FaEnvelope className="me-2" />
                  alberthsibautylabardenz@gmail.com
                </a>
              </li>

              <li className="mb-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Oficina Central - Reporte Chaco')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Ubicación Oficina Central - Reporte Chaco"
                >
                  <FaMapMarkerAlt className="me-2" />
                  Oficina Central - Reporte Chaco
                </a>
              </li>

              <li className="mb-2">
                <a
                  href="https://reportechaco.com/acerca"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Acerca de nosotros - Reporte Chaco"
                >
                  <FaInfoCircle className="me-2" />
                  Acerca de nosotros
                </a>
              </li>

              <li className="mb-2">
                <a
                  href="mailto:alberthsibautylabardenz@gmail.com"
                  className="text-white text-decoration-none"
                  aria-label="Contactos Reporte Chaco"
                >
                
                 
                </a>
              </li>

              {/* Si luego tienes URLs para políticas/términos, cámbialo por <a href="..."> */}
              {/* <li className="mb-1">
                <a href="/politicas" className="text-white text-decoration-none">
                  <FaInfoCircle className="me-2" /> Políticas de privacidad y términos de uso
                </a>
              </li> */}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
