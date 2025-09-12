// src/components/NavbarMC.jsx
import { Navbar, Nav, Container, NavDropdown, Image, Badge } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ThemeToggle from "./ThemeToggle";
import { FaShoppingCart } from "react-icons/fa";

export default function NavbarMC(){
  const { user, perfil } = useAuth();
  const nav = useNavigate();
  const { count = 0 } = useCart(); // simple y seguro

  const rol = perfil?.rol ?? "cliente";
  const avatar = perfil?.avatar_url || "/img/seguridad.gif";


  const cerrar = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  return (
    <Navbar
      expand="lg"
      bg="dark"
      variant="dark"
      sticky="top"
      collapseOnSelect
      className="mb-3 py-2"
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-semibold">
          Mercado Chaco
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="mc-nav" />
        <Navbar.Collapse id="mc-nav">
          {/* Izquierda */}
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/catalogo" className="link-animate">Catálogo</Nav.Link>

            {rol !== "cliente" && (
              <>
                <Nav.Link as={NavLink} to="/panel/productor" className="link-animate">Panel</Nav.Link>
                  <Nav.Link as={NavLink} to="/productor/pedidos" className="link-animate">Pedidos</Nav.Link>
                <Nav.Link as={NavLink} to="/mis-productos" className="link-animate">Mis productos</Nav.Link>
                <Nav.Link as={NavLink} to="/reportes" className="link-animate">Reportes</Nav.Link>
              
              </>
            )}

            {rol === "admin" && (
              <>
                <Nav.Link as={NavLink} to="/admin/solicitudes" className="link-animate">Solicitudes</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/pedidos" className="link-animate">Pedidos</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/categorias" className="link-animate">Categorías</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/usuarios" className="link-animate">Usuarios</Nav.Link>
              </>
            )}
          </Nav>

          {/* Derecha */}
          <Nav className="align-items-center gap-2">
            <Nav.Link as={NavLink} to="/carrito" className="position-relative link-animate">
              <span className="d-inline-flex align-items-center">
                
                <FaShoppingCart className="me-1" />
                <span className="d-none d-md-inline">Carrito</span>
              </span>
              {count > 0 && (
                <Badge bg="success" pill className="position-absolute top-0 start-100 translate-middle">
                  {count}
                </Badge>
              )}
            </Nav.Link>

            <ThemeToggle />

            {!user ? (
              <>
                <Nav.Link as={NavLink} to="/login" className="link-animate">Iniciar sesión</Nav.Link>
                <Nav.Link as={NavLink} to="/registro" className="link-animate">Registrarme</Nav.Link>
              </>
            ) : (
              <NavDropdown
                align="end"
                id="cuenta-menu"
                title={
                  <span className="d-inline-flex align-items-center">
                    <Image
                      src={avatar}
                      alt="avatar"
                      roundedCircle
                      width={28}
                      height={28}
                      className="me-2"
                      onError={(e)=>{ e.currentTarget.outerHTML = "👤"; }}
                    />
                    <span>{perfil?.nombres || "Mi cuenta"}</span>
                  </span>
                }
              >
                <NavDropdown.Item as={NavLink} to="/bienvenido">Bienvenido</NavDropdown.Item>
                <NavDropdown.Item as={NavLink} to="/perfil">Perfil</NavDropdown.Item>
                <NavDropdown.Item as={NavLink} to="/mis-pedidos">Mis pedidos</NavDropdown.Item>

                {rol === "cliente" && (
                  <NavDropdown.Item as={NavLink} to="/solicitud-productor">Ser productor</NavDropdown.Item>
                )}

                {rol === "admin" && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Item as={NavLink} to="/admin/solicitudes">Admin — Solicitudes</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/pedidos">Admin — Pedidos</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/categorias">Admin — Categorías</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/usuarios">Admin — Usuarios</NavDropdown.Item>
                  </>
                )}

                <NavDropdown.Divider />
                <NavDropdown.Item onClick={cerrar}>Cerrar sesión</NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
