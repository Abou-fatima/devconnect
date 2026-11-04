import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { chercherFaq } from '../lib/aide';

// Bouton flottant « Aide » : FAQ filtrable, avec un lien direct vers la bonne page.
export default function AideBouton() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const dansConversation = pathname.startsWith('/messages/'); // sur petit écran, le bouton cacherait envoi et micro
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState('');
  const [actif, setActif] = useState(null);
  const champ = useRef(null);
  const declencheur = useRef(null);

  const faq = t('aide.faq', { returnObjects: true });
  const liste = useMemo(() => chercherFaq(Array.isArray(faq) ? faq : [], requete), [faq, requete]);

  const fermer = () => { setOuvert(false); declencheur.current?.focus(); };
  useEffect(() => {
    if (!ouvert) return undefined;
    champ.current?.focus();
    const surTouche = (e) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  return (
    <>
      <button ref={declencheur} type="button" onClick={() => setOuvert(true)} aria-label={t('aide.ouvrir')}
        className={`fixed bottom-20 right-4 z-30 h-12 items-center gap-2 rounded-full bg-accent px-4 font-semibold text-slate-900 shadow-lg transition hover:scale-105 active:scale-95 lg:bottom-6 ${dansConversation ? 'hidden lg:flex' : 'flex'}`}>
        <span aria-hidden className="text-lg">?</span><span className="hidden sm:inline">{t('aide.bouton')}</span>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={fermer}>
          <div role="dialog" aria-modal="true" aria-label={t('aide.titre')} onClick={(e) => e.stopPropagation()}
            className="page-enter flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-bold">{t('aide.titre')}</h2>
              <button type="button" onClick={fermer} aria-label={t('aide.fermer')} className="rounded p-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            <div className="px-4 pt-3">
              <input ref={champ} type="search" className="input" value={requete} onChange={(e) => { setRequete(e.target.value); setActif(null); }} placeholder={t('aide.recherche')} aria-label={t('aide.recherche')} />
            </div>
            <div className="mt-2 flex-1 overflow-y-auto px-4 pb-4">
              {liste.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-600">
                  <p>{t('aide.aucun')}</p>
                  <Link to="/forum/poser" onClick={fermer} className="btn mt-3">{t('aide.poser')}</Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {liste.map((e) => {
                    const ouvertE = actif === e.id;
                    return (
                      <li key={e.id}>
                        <button type="button" onClick={() => setActif(ouvertE ? null : e.id)} aria-expanded={ouvertE}
                          className="flex w-full items-center justify-between gap-2 py-3 text-left font-medium hover:text-brand-light">
                          <span>{e.q}</span><span aria-hidden className={`transition-transform ${ouvertE ? 'rotate-90' : ''}`}>›</span>
                        </button>
                        {ouvertE && (
                          <div className="pb-3 text-sm text-slate-700">
                            <p>{e.r}</p>
                            {e.lien && <Link to={e.lien} onClick={fermer} className="btn mt-2 !px-3 !py-1.5 text-sm">{e.lien_texte}</Link>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
