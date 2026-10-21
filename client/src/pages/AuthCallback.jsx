import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// Le serveur redirige ici avec #token=... (ou #erreur=...) après la connexion GitHub.
export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { refresh } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    window.history.replaceState(null, '', window.location.pathname); // efface le token de l'adresse
    if (!token) { navigate('/connexion?erreur=github', { replace: true }); return; }
    try { localStorage.setItem('token', token); } catch { /* ignore */ }
    refresh().then((u) => navigate(u ? '/profil' : '/connexion?erreur=github', { replace: true }));
  }, [navigate, refresh]);

  return <p className="text-slate-500">{t('auth.callback')}</p>;
}
