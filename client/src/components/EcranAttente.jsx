import { createPortal } from 'react-dom';

/* Écran plein cadre « un instant » : sert pendant la redirection vers GitHub et pendant la récupération du profil.
   Il remplace l'ancien lien qui ne donnait aucun retour. Les étapes montrent où en est la connexion. */
export function IconeGithub({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/* etapes : [{ texte, etat: 'fait' | 'en_cours' | 'attente' }] */
export default function EcranAttente({ titre, sousTitre, etapes = [], portail = false, children }) {
  const contenu = (
    <div className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-white/95 px-4 backdrop-blur-sm" role="status" aria-live="polite" aria-busy="true">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand motion-safe:animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-slate-800"><IconeGithub className="h-8 w-8" /></div>
        </div>
        <h1 className="text-xl font-bold text-slate-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-slate-600">{sousTitre}</p>}
        {etapes.length > 0 && (
          <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
            {etapes.map((e) => (
              <li key={e.texte} className={`flex items-center gap-2 ${e.etat === 'attente' ? 'text-slate-400' : 'text-slate-800'}`}>
                {e.etat === 'fait' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white" aria-hidden>✓</span>}
                {e.etat === 'en_cours' && <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-brand motion-safe:animate-spin" aria-hidden />}
                {e.etat === 'attente' && <span className="h-5 w-5 rounded-full border-2 border-slate-200" aria-hidden />}
                {e.texte}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  );
  return portail ? createPortal(contenu, document.body) : contenu;
}
