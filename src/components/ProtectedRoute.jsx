import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }){
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ toast:{ title:'Inicia sesión', body:'Esta sección requiere estar autenticado.', variant:'warning' }, from: loc.pathname }} />;
  }
  return children;
}
