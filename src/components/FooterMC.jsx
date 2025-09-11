import {
  FaFacebook, FaTiktok, FaTwitter, FaInstagram,
  FaEnvelope, FaMapMarkerAlt, FaInfoCircle
} from "react-icons/fa";

export default function FooterMC(){
  return (
    <footer
      className="mt-4 py-3 py-md-4"
      style={{
        background: "#027c2bff",
        // tipografía compacta que se adapta al ancho (12–14px)
        fontSize: "clamp(12px, 1.8vw, 14px)",
        lineHeight: 1.35
      }}
    >
      <div className="container">
        <div className="row g-2 g-sm-3 g-md-4 align-items-center">

          {/* QR */}
          <div className="col-12 col-md-4 text-center">
            <img
              src="/img/QR.png"
              alt="QR redes"
               style={{ width: "min(110px, 32vw)", height: "auto" }} // antes: min(130px, 38vw)
              
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>

          {/* Redes sociales */}
          <div className="col-12 col-md-4 text-center text-md-start">
            <h6 className="text-white mb-2 fw-semibold" style={{letterSpacing: .2}}>
              Síguenos en nuestras redes
            </h6>
            <ul className="list-unstyled m-0">
              <li className="mb-1">
                <a
                  href="https://www.facebook.com/reportechacobolivia"
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Facebook Reporte Chaco"
                >
                  <FaFacebook className="me-2" size={16} /> Facebook
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://www.tiktok.com/@reporte.chaco?_t=ZM-8zZCNwehj2j&_r=1"
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="TikTok Reporte Chaco"
                >
                  <FaTiktok className="me-2" size={16} /> TikTok
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://x.com/ReporteChacoBo"
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Twitter/X Reporte Chaco"
                >
                  <FaTwitter className="me-2" size={16} /> Twitter / X
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://www.instagram.com/reportechacobolivia/#"
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Instagram Reporte Chaco"
                >
                  <FaInstagram className="me-2" size={16} /> Instagram
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto / info */}
          <div className="col-12 col-md-4 text-center text-md-start">
            <ul className="list-unstyled m-0">
              <li className="mb-2">
                <a
                  href="mailto:alberthsibautylabardenz@gmail.com"
                  className="text-white text-decoration-none"
                  aria-label="Enviar correo a Reporte Chaco"
                >
                  <FaEnvelope className="me-2" size={16} />
                  alberthsibautylabardenz@gmail.com
                </a>
              </li>

              <li className="mb-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Oficina Central - Reporte Chaco")}`}
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Ubicación Oficina Central - Reporte Chaco"
                >
                  <FaMapMarkerAlt className="me-2" size={16} />
                  Oficina Central - Reporte Chaco
                </a>
              </li>

              <li className="mb-2">
                <a
                  href="https://reportechaco.com/acerca"
                  target="_blank" rel="noreferrer"
                  className="text-white text-decoration-none"
                  aria-label="Acerca de nosotros - Reporte Chaco"
                >
                  <FaInfoCircle className="me-2" size={16} />
                  Acerca de nosotros
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}
