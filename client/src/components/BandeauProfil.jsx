import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { completude, profilVide } from '../lib/onboarding';

/* « Termine ton profil » : affiché aux personnes connectées dont le profil est incomplet. Peut être masqué pour la session. */
export default function BandeauProfil({ user }) {
  const { t } = useTranslation();
  const [masque, setMasque] = useState(() => { try { return sessionStorage.getItem('bandeau-profil') === '1'; } catch { return false; } });
  const { pct, manquants } = completude(user);
  if (!user || pct >= 100 || masque) return null;
  const fermer = () => { setMasque(true); try { sessionStorage.setItem('bandeau-profil', '1'); } catch { /* ignoré */ } };
  return (
    <aside className="anim-fade flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3" aria-label={t('onboarding.bandeau_titre')}>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold text-amber-900">{t('onboarding.bandeau_titre', { pct })}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-amber-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-sm text-amber-900/80">{t('onboarding.bandeau_manque', { liste: manquants.slice(0, 3).map((m) => t(`onboarding.manque.${m}`)).join(', ') })}</p>
      </div>
      <Link to={profilVide(user) ? '/bienvenue' : '/profil/modifier'} className="btn !py-1.5">{t('onboarding.bandeau_action')}</Link>
      <button type="button" onClick={fermer} className="rounded p-1 text-amber-900/60 hover:bg-amber-100" aria-label={t('onboarding.bandeau_fermer')}>✕</button>
    </aside>
  );
}
