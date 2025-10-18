// src/components/NavbarMC.jsx
import { useState } from "react";
import { Navbar, Nav, Container, NavDropdown, Image, Badge, Offcanvas } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ThemeToggle from "./ThemeToggle";
import { FaShoppingCart, FaArrowLeft } from "react-icons/fa";

export default function NavbarMC(){
  const { user, perfil } = useAuth();
  const nav = useNavigate();
  const { count = 0 } = useCart();

  const [showMenu, setShowMenu] = useState(false);
  const rol = perfil?.rol ?? "cliente";
  const avatar = perfil?.avatar_url || "/img/seguridad.gif";

  const cerrar = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  const go = (to) => {
    setShowMenu(false);
    nav(to);
  };
  const goBack = () => {
    setShowMenu(false);
    nav(-1);
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

        {/* Toggle SOLO móvil (abre menú full-screen) */}
        <div className="d-lg-none">
          <Navbar.Toggle aria-controls="mc-offcanvas" onClick={() => setShowMenu(true)} />
        </div>

        {/* ===== Desktop / Tablet (>= lg): barra original ===== */}
        <Navbar.Collapse id="mc-nav" className="d-none d-lg-flex">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/catalogo" className="link-animate">Catálogo</Nav.Link>

            {rol !== "cliente" && (
              <>
                <Nav.Link as={NavLink} to="/panel/productor" className="link-animate">Panel</Nav.Link>
                <Nav.Link as={NavLink} to="/productor/pedidos" className="link-animate">Pedidos Clientes</Nav.Link>
                <Nav.Link as={NavLink} to="/mis-productos" className="link-animate">Mis productos</Nav.Link>
                <Nav.Link as={NavLink} to="/reportes" className="link-animate">Reportes</Nav.Link>
              </>
            )}

            {rol === "admin" && (
              <>
                <Nav.Link as={NavLink} to="/admin/categorias" className="link-animate">Categorías</Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-center gap-2">
            <Nav.Link as={NavLink} to="/carrito" className="position-relative link-animate">
              <span className="d-inline-flex align-items-center">
                <FaShoppingCart className="me-1" />
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
                    <NavDropdown.Item as={NavLink} to="/admin/pedidos">Admin — Validacion Qr</NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="/admin/usuarios">Admin — Usuarios</NavDropdown.Item>
                  </>
                )}

                <NavDropdown.Divider />
                <NavDropdown.Item onClick={cerrar}>Cerrar sesión</NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>

        {/* ===== Móvil (< lg): menú full-screen ===== */}
        <Offcanvas
          show={showMenu}
          onHide={() => setShowMenu(false)}
          placement="start"
          className="bg-dark text-white d-lg-none"
          style={{ width: "100vw", maxWidth: "100vw" }}
          id="mc-offcanvas"
        >
          <Offcanvas.Header closeButton closeVariant="white" className="border-bottom">
            {/* Flecha verde “atrás” */}
            <button
              type="button"
              className="btn btn-link p-0 me-2"
              onClick={goBack}
              aria-label="Atrás"
              title="Atrás"
            >
              <FaArrowLeft size={22} style={{ color: "var(--mc-green-600)" }} />
            </button>

            <Offcanvas.Title>
              <span className="d-inline-flex align-items-center">
                <Image
                  src={avatar}
                  alt="avatar"
                  roundedCircle
                  width={32}
                  height={32}
                  className="me-2"
                  onError={(e)=>{ e.currentTarget.outerHTML = "👤"; }}
                />
                <span className="fw-semibold">{perfil?.nombres || "Mi cuenta"}</span>
              </span>
            </Offcanvas.Title>
          </Offcanvas.Header>

          <Offcanvas.Body className="pt-0">
            
            {/* === (1) Toggle tema CENTRADO arriba === */}
            <div className="d-flex justify-content-center py-3 border-bottom">
              <ThemeToggle />
            </div>

            {/* === (2) Accesos rápidos: Bienvenido / Perfil / Mis pedidos === */}
            {user ? (
              <Nav className="flex-column">
                <Nav.Link as={Link} to="/bienvenido" onClick={() => go("/bienvenido")}
                  className="text-white py-3 border-bottom">
                  Bienvenido <span className="float-end">›</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/perfil" onClick={() => go("/perfil")}
                  className="text-white py-3 border-bottom">
                  Perfil <span className="float-end">›</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/mis-pedidos" onClick={() => go("/mis-pedidos")}
                  className="text-white py-3 border-bottom ">
                  Mis pedidos <span className="float-end">›</span>
                </Nav.Link>
 <Nav.Link as={Link} to="/catalogo" onClick={() => go("/catalogo")}
                className="text-white py-3 border-bottom">
                Catálogo <span className="float-end">›</span>
              </Nav.Link>

              <Nav.Link as={Link} to="/carrito" onClick={() => go("/carrito")}
                className="text-white py-3 border-bottom">
                <span className="d-inline-flex align-items-center">
                  <FaShoppingCart className="me-2" /> Carrito
                  {count > 0 && <Badge bg="success" pill className="ms-2">{count}</Badge>}
                </span>
                <span className="float-end">›</span>
              </Nav.Link>
              </Nav>
            ) : (
              <Nav className="flex-column">
                <Nav.Link as={Link} to="/login" onClick={() => go("/login")}
                  className="text-white py-3 border-bottom text-center">
                  Iniciar sesión <span className="float-end">›</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/registro" onClick={() => go("/registro")}
                  className="text-white py-3 border-bottom text-center">
                  Registrarme <span className="float-end">›</span>
                </Nav.Link>
              </Nav>
            )}
            {/* Operaciones (productor) */}
            {rol !== "cliente" && (
              <>
                <div className="text-uppercase small text-muted mt-3 mb-1">Operaciones</div>
                <Nav className="flex-column">
                  <Nav.Link as={Link} to="/panel/productor" onClick={() => go("/panel/productor")}
                    className="text-white py-3 border-bottom">
                    Panel <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/productor/pedidos" onClick={() => go("/productor/pedidos")}
                    className="text-white py-3 border-bottom">
                    Pedidos Clientes <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/mis-productos" onClick={() => go("/mis-productos")}
                    className="text-white py-3 border-bottom">
                    Mis productos <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/reportes" onClick={() => go("/reportes")}
                    className="text-white py-3 border-bottom">
                    Reportes <span className="float-end">›</span>
                  </Nav.Link>
                </Nav>
              </>
            )}

            {/* Admin */}
            {rol === "admin" && (
              <>
                <div className="text-uppercase small text-muted mt-3 mb-1">Admin</div>
                <Nav className="flex-column">
                  <Nav.Link as={Link} to="/admin/categorias" onClick={() => go("/admin/categorias")}
                    className="text-white py-3 border-bottom">
                    Categorías <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/solicitudes" onClick={() => go("/admin/solicitudes")}
                    className="text-white py-3 border-bottom">
                    Solicitudes <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/pedidos" onClick={() => go("/admin/pedidos")}
                    className="text-white py-3 border-bottom">
                    Validación QR <span className="float-end">›</span>
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/usuarios" onClick={() => go("/admin/usuarios")}
                    className="text-white py-3 border-bottom">
                    Usuarios <span className="float-end">›</span>
                  </Nav.Link>
                </Nav>
              </>
            )}

            {/* Cuenta (resto) */}
            {user && (
              <>
                <div className="text-uppercase small text-muted mt-3 mb-1">Cuenta</div>
                <Nav className="flex-column">
                  {rol === "cliente" && (
                    <Nav.Link as={Link} to="/solicitud-productor" onClick={() => go("/solicitud-productor")}
                      className="text-white py-3 border-bottom">
                      Ser productor <span className="float-end">›</span>
                    </Nav.Link>
                  )}
                  <Nav.Link
                    as="button"
                    onClick={async () => { await supabase.auth.signOut(); go("/login"); }}
                    className="text-white py-3 text-start"
                    style={{ background: "transparent", border: 0 }}
                  >
                    Cerrar sesión
                  </Nav.Link>
                </Nav>
              </>
            )}
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </Navbar>
  );
}
