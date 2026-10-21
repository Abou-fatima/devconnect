import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Accueil() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <section className="py-8 text-center">
      <h1 className="mx-auto max-w-2xl text-3xl font-bold text-brand md:text-4xl">{t('accueil.titre')}</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">{t('accueil.texte')}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {!user && <Link to="/inscription" className="btn">{t('accueil.cta_inscription')}</Link>}
        <Link to="/developpeurs" className="btn-outline">{t('accueil.cta_devs')}</Link>
      </div>
    </section>
  );
}
