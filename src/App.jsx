// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import CartProvider from './context/CartContext.jsx';
import NavbarMC from './components/NavbarMC.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGuard from './components/RoleGuard.jsx';
import SkipLink from './components/SkipLink.jsx';
import ToasterMC from './components/ToasterMC.jsx';
import FooterMC from './components/FooterMC.jsx';
import ChatbotMC from './components/ChatbotMC.jsx';

// Páginas (lazy)
const Home = lazy(()=>import('./pages/Home.jsx'));
const Catalogo = lazy(()=>import('./pages/Catalogo.jsx'));
const ProductoDetalle = lazy(()=>import('./pages/ProductoDetalle.jsx'));
const ProductorPerfilPublico = lazy(()=>import('./pages/ProductorPerfilPublico.jsx'));
const Login = lazy(()=>import('./pages/Login.jsx'));
const RegistroCliente = lazy(()=>import('./pages/RegistroCliente.jsx'));
const SolicitudProductor = lazy(()=>import('./pages/SolicitudProductor.jsx'));
const Recuperar = lazy(()=>import('./pages/Recuperar.jsx'));
const Restablecer = lazy(()=>import('./pages/Restablecer.jsx'));
const VerificaCorreo = lazy(()=>import('./pages/VerificaCorreo.jsx'));
const Perfil = lazy(()=>import('./pages/Perfil.jsx'));
const MisProductos = lazy(()=>import('./pages/MisProductos.jsx'));
const PanelProductor = lazy(()=>import('./pages/PanelProductor.jsx'));
const Carrito = lazy(()=>import('./pages/Carrito.jsx'));
const Checkout = lazy(()=>import('./pages/Checkout.jsx'));
const MisPedidos = lazy(()=>import('./pages/MisPedidos.jsx'));
const AdminSolicitudes = lazy(()=>import('./pages/AdminSolicitudes.jsx'));
const AdminPedidos = lazy(()=>import('./pages/AdminPedidos.jsx'));
const AdminCategorias = lazy(()=>import('./pages/AdminCategorias.jsx'));
const Reportes = lazy(()=>import('./pages/Reportes.jsx'));
const NotFound = lazy(()=>import('./pages/NotFound.jsx'));
const Bienvenido = lazy(()=>import('./pages/Bienvenido.jsx'));
const Codigo = lazy(()=>import('./pages/Codigo.jsx'));

// 👇 NUEVO: AdminUsuarios
const AdminUsuarios = lazy(()=>import('./pages/AdminUsuarios.jsx'));

export default function App(){
  return (
    <AuthProvider>
      <CartProvider>
        <NavbarMC />
        <SkipLink />
        <ToasterMC />

        <div id="contenido" className="container pb-5">
          <Suspense fallback={<div className="text-center py-5">Cargando…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/producto/:id" element={<ProductoDetalle />} />
              <Route path="/productor/:uid" element={<ProductorPerfilPublico />} />

              <Route path="/login" element={<Login />} />
              <Route path="/codigo" element={<Codigo/>} />
              <Route path="/registro-cliente" element={<RegistroCliente />} />
              <Route path="/registro" element={<Navigate to="/registro-cliente" replace />} />
              <Route path="/recuperar" element={<Recuperar />} />
              <Route path="/restablecer" element={<Restablecer />} />

              <Route path="/solicitud-productor" element={<ProtectedRoute><SolicitudProductor/></ProtectedRoute>} />
              <Route path="/verifica-correo" element={<VerificaCorreo />} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil/></ProtectedRoute>} />
              <Route path="/carrito" element={<Carrito />} />
              <Route path="/checkout/:pedidoId" element={<Checkout />} />
<Route path="/pedido/:pedidoId/exito" element={<div className="container py-4"><h4>¡Pago confirmado!</h4></div>} />
              <Route path="/mis-productos" element={<ProtectedRoute><RoleGuard allow={['productor','admin']}><MisProductos/></RoleGuard></ProtectedRoute>} />
              <Route path="/panel/productor" element={<ProtectedRoute><RoleGuard allow={['productor','admin']}><PanelProductor/></RoleGuard></ProtectedRoute>} />
              <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidos/></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute><RoleGuard allow={['productor','admin']}><Reportes/></RoleGuard></ProtectedRoute>} />

              <Route path="/admin/solicitudes" element={<ProtectedRoute><RoleGuard allow={['admin']}><AdminSolicitudes/></RoleGuard></ProtectedRoute>} />
              <Route path="/admin/pedidos" element={<ProtectedRoute><RoleGuard allow={['admin']}><AdminPedidos/></RoleGuard></ProtectedRoute>} />
              <Route path="/admin/categorias" element={<ProtectedRoute><RoleGuard allow={['admin']}><AdminCategorias/></RoleGuard></ProtectedRoute>} />

              {/* 👇 NUEVA RUTA ADMIN-ONLY */}
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute>
                    <RoleGuard allow={['admin']}>
                      <AdminUsuarios />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />

              <Route path="/bienvenido" element={<ProtectedRoute><Bienvenido/></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>

        <ChatbotMC/>
        <FooterMC />
      </CartProvider>
    </AuthProvider>
  );
}
