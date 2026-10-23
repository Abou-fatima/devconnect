import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (loading) return <p className="text-slate-500">{t('commun.chargement')}</p>;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  return children;
}
