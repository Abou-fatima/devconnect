import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

// roles (facultatif) : liste des rôles autorisés, ex. ['admin', 'moderateur']. Le serveur vérifie aussi : cette barrière évite seulement d'afficher une page inutile.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (loading)
    return <p className="text-slate-500">{t("commun.chargement")}</p>;
  if (!user)
    return (
      <Navigate to="/connexion" state={{ from: location.pathname }} replace />
    );
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
