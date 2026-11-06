import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Pied de page du site : présentation, liens utiles et mentions du projet.
export default function PiedDePage({ user }) {
  const { t } = useTranslation();
  const lien = 'rounded py-0.5 text-white/80 hover:text-white hover:underline';
  const titre = 'mb-2 text-sm font-semibold uppercase tracking-wide text-accent';
  return (
    <footer role="contentinfo" aria-label={t('pied.navigation')} className="bg-brand text-white/80">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Link to="/" className="text-lg font-bold text-white">&lt;/&gt; {t('app.nom')}</Link>
          <p className="mt-2 max-w-xs text-sm">{t('pied.slogan')}</p>
        </div>
        <nav aria-label={t('pied.explorer')}>
          <h2 className={titre}>{t('pied.explorer')}</h2>
          <ul className="grid grid-cols-2 gap-x-4 text-sm sm:block">
            <li><Link className={lien} to="/forum">{t('nav.forum')}</Link></li>
            <li><Link className={lien} to="/developpeurs">{t('nav.devs')}</Link></li>
            <li><Link className={lien} to="/projets">{t('projets.nav')}</Link></li>
            <li><Link className={lien} to="/mentorat">{t('mentorat.nav')}</Link></li>
            <li><Link className={lien} to="/classement">{t('nav.classement')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('pied.communaute')}>
          <h2 className={titre}>{t('pied.communaute')}</h2>
          <ul className="text-sm">
            {user ? (
              <>
                <li><Link className={lien} to="/messages">{t('nav.messages')}</Link></li>
                <li><Link className={lien} to="/profil">{t('nav.profil')}</Link></li>
              </>
            ) : (
              <>
                <li><Link className={lien} to="/inscription">{t('nav.inscription')}</Link></li>
                <li><Link className={lien} to="/connexion">{t('nav.connexion')}</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('pied.droits', { annee: new Date().getFullYear() })} · {t('pied.cadev')}</p>
          <p>{t('pied.equipe')}</p>
        </div>
      </div>
    </footer>
  );
}
