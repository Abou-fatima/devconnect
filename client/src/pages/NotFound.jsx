import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icone from '../components/Icone';

// Page affichée quand l'adresse n'existe pas (ou plus).
export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lien = 'rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-slate-50';
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center py-12 text-center" aria-labelledby="titre-404">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-brand/10 text-5xl text-brand">
        <Icone nom="boussole" />
        <span className="absolute -bottom-2 -right-2 rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-slate-900">404</span>
      </div>
      <h1 id="titre-404" className="text-3xl font-bold">{t('introuvable.titre')}</h1>
      <p className="mt-3 text-slate-600">{t('introuvable.texte')}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn inline-flex items-center gap-2"><Icone nom="maison" /> {t('introuvable.accueil')}</Link>
        <button type="button" onClick={() => navigate(-1)} className="btn-outline inline-flex items-center gap-2"><Icone nom="retour" /> {t('introuvable.precedent')}</button>
      </div>
      <p className="mt-10 text-sm text-slate-500">{t('introuvable.ou_aller')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link to="/forum" className={lien}>{t('nav.forum')}</Link>
        <Link to="/developpeurs" className={lien}>{t('nav.devs')}</Link>
        <Link to="/projets" className={lien}>{t('projets.nav')}</Link>
        <Link to="/classement" className={lien}>{t('nav.classement')}</Link>
      </div>
    </section>
  );
}
