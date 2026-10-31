import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import EcranAttente, { IconeGithub } from '../components/EcranAttente';

// Le serveur redirige ici avec #token=... (ou #erreur=...) après la connexion GitHub.
export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [etape, setEtape] = useState('verif'); // verif | profil | erreur
  // En développement, React exécute l'effet deux fois. La 2e fois le token a déjà été retiré de l'adresse :
  // sans ce garde-fou elle concluait à tort à un échec (d'où l'éclair rouge avant l'affichage du profil).
  const lance = useRef(false);

  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    window.history.replaceState(null, '', window.location.pathname); // efface le token de l'adresse
    if (!token) { setEtape('erreur'); return; }
    try { localStorage.setItem('token', token); } catch { /* ignore */ }
    setEtape('profil');
    refresh().then((u) => {
      if (u) navigate('/profil', { replace: true });
      else { try { localStorage.removeItem('token'); } catch { /* ignore */ } setEtape('erreur'); }
    });
  }, [navigate, refresh]);

  if (etape === 'erreur') {
    return (
      <div className="mx-auto max-w-sm py-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700"><IconeGithub className="h-8 w-8" /></div>
        <h1 className="text-xl font-bold">{t('auth.callback_erreur_titre')}</h1>
        <p className="mt-1 text-slate-600">{t('auth.erreur_github')}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link to="/connexion" className="btn">{t('auth.reessayer')}</Link>
          <Link to="/" className="text-sm text-slate-500 underline">{t('auth.retour_accueil')}</Link>
        </div>
      </div>
    );
  }

  return (
    <EcranAttente titre={t('auth.callback_titre')} sousTitre={t('auth.callback_texte')}
      etapes={[
        { texte: t('auth.etape_verif'), etat: etape === 'verif' ? 'en_cours' : 'fait' },
        { texte: t('auth.etape_profil'), etat: etape === 'profil' ? 'en_cours' : 'attente' }
      ]} />
  );
}
