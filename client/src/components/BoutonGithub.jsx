import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { githubUrl } from '../services/auth';
import EcranAttente, { IconeGithub } from './EcranAttente';

// Bouton « Continuer avec GitHub » : un clic affiche tout de suite un écran d'attente, le temps de la redirection.
export default function BoutonGithub() {
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
      <a href={githubUrl} onClick={() => setParti(true)} className="btn-outline flex w-full items-center justify-center gap-2">
        <IconeGithub /> {t('auth.github')}
      </a>
      {parti && (
        <EcranAttente portail titre={t('auth.redirection_titre')} sousTitre={t('auth.redirection_texte')}
          etapes={[{ texte: t('auth.etape_redirection'), etat: 'en_cours' }]} />
      )}
    </>
  );
}
