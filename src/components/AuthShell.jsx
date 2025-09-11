import { Card, Row, Col } from "react-bootstrap";

export default function AuthShell({ title, subtitle, children, bullets = [], illustration = "img/loginpri.png" }) {
  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <Row className="g-0">
          {/* Lado izquierdo con imagen completa */}
          <Col 
            md={5} 
            className="auth-aside d-none d-md-block"
            style={{
              backgroundImage: `url(${illustration})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: "0.375rem 0 0 0.375rem" // opcional, redondear solo esquina izquierda
            }}
          >
          </Col>

          {/* Lado derecho con formulario */}
          <Col md={7} className="p-4 p-md-5">
            <h4 className="mb-3">{title}</h4>
            {children}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
