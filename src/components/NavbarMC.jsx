import { Navbar, Nav, Container, NavDropdown, Image, Badge } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ThemeToggle from "./ThemeToggle";
import { FaShoppingCart } from "react-icons/fa";

export default function NavbarMC(){
  const { user, perfil, signOut } = useAuth();
  const nav = useNavigate();
  const { count } = useCart?.() || { count: 0 };

  const rol = perfil?.rol ?? "cliente";
  const avatar = perfil?.avatar_url || "/img/seguridad.gif";
  const iconoCarrito = "/img/carrito.png"; // opcional: tu propio icono

  const cerrar = async () => {
    await supabase.auth.signOut();
    nav('/login');
  };

  return (
    <Navbar expand="lg" className="navbar mb-3" variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">Mercado Chaco</Navbar.Brand>
        <Navbar.Toggle aria-controls="mc-nav" />
        <Navbar.Collapse id="mc-nav">
          {/* Izquierda: navegación por secciones */}
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/catalogo">Catálogo</Nav.Link>

            {/* Productor/Admin */}
            {rol !== "cliente" && (
              <>
                <Nav.Link as={NavLink} to="/panel/productor">Panel</Nav.Link>
                <Nav.Link as={NavLink} to="/mis-productos">Mis productos</Nav.Link>
                <Nav.Link as={NavLink} to="/reportes">Reportes</Nav.Link>
              </>
            )}

            {/* Solo Admin */}
            {rol === "admin" && (
              <>
                <Nav.Link as={NavLink} to="/admin/solicitudes">Solicitudes</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/pedidos">Pedidos</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/categorias">Categorías</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/usuarios">Usuarios</Nav.Link>
              </>
            )}
          </Nav>

          {/* Derecha: carrito + cuenta + tema */}
          <Nav className="align-items-center">
            <Nav.Link as={NavLink} to="/carrito" className="position-relative">
              <span className="d-inline-flex align-items-center">
                <img
                  src={iconoCarrito}
                  alt="Carrito"
                  width={22}
                  height={22}
                  className="me-1"
                  onError={(e)=>{ e.currentTarget.style.display='none'; }}
                />
                <FaShoppingCart className="me-1" />
                <span className="d-none d-md-inline">Carrito</span>
              </span>
              {count > 0 && (
                <Badge
                  bg="success"
                  pill
                  className="position-absolute top-0 start-100 translate-middle"
                >
                  {count}
                </Badge>
              )}
            </Nav.Link>

            <ThemeToggle />
            {!user ? (
              <>
                <Nav.Link as={NavLink} to="/login">Iniciar sesión</Nav.Link> 
                <Nav.Link as={NavLink} to="/registro">Registrarme</Nav.Link>
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

                {/* “Ser productor” solo para clientes */}
                {rol === "cliente" && (
                  <NavDropdown.Item as={NavLink} to="/solicitud-productor">
                    Ser productor
                  </NavDropdown.Item>
                )}

                {/* Atajos admin dentro del menú */}
                {rol === "admin" && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Item as={NavLink} to="/admin/solicitudes">Admin — Solicitudes</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/pedidos">Admin — Pedidos</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/categorias">Admin — Categorías</NavDropdown.Item>
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
