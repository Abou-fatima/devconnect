import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { githubUrlPour } from '../services/auth';
import EcranAttente, { IconeGithub } from './EcranAttente';

// Bouton « Continuer avec GitHub » : un clic affiche tout de suite un écran d'attente, le temps de la redirection.
export default function BoutonGithub({ mode = 'inscription' }) {
  const { t } = useTranslation();
  const [parti, setParti] = useState(false);

  // Retour arrière depuis GitHub : la page revient du cache, on ne doit pas rester bloqué sur l'écran d'attente.
  useEffect(() => {
    const retour = (e) => { if (e.persisted) setParti(false); };
    window.addEventListener('pageshow', retour);
    return () => window.removeEventListener('pageshow', retour);
  }, []);

  return (
    <>
      <a href={githubUrlPour(mode)} onClick={() => setParti(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
        <IconeGithub className="h-5 w-5" /> {mode === 'connexion' ? t('erreurs.github_se_connecter') : t('erreurs.github_sinscrire')}
      </a>
      {parti && (
        <EcranAttente portail titre={t('auth.redirection_titre')} sousTitre={t('auth.redirection_texte')}
          etapes={[{ texte: t('auth.etape_redirection'), etat: 'en_cours' }]} />
      )}
    </>
  );
}
