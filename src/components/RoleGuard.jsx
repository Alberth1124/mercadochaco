import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleGuard({ allow=['cliente'], children }){
  const { perfil } = useAuth();
  const loc = useLocation();
  const rol = perfil?.rol || 'cliente';
  const ok = allow.includes(rol);
  if (!ok) {
    return <Navigate to="/" replace state={{ toast:{ title:'Acceso restringido', body:'No tienes permisos para esta sección.', variant:'danger' }, from: loc.pathname }} />;
  }
  return children;
}
