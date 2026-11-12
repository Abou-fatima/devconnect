import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { demanderMentorat } from '../services/mentorat';
import { messageErreur } from '../services/api';
import Avatar from './Avatar';
import Icone from './Icone';

// Fenêtre « Demander du mentorat » : sujet + message. Échap ou clic à côté pour fermer.
export default function DemandeMentoratModal({ mentor, onFermer, onEnvoye }) {
  const { t } = useTranslation();
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const premier = useRef(null);

  useEffect(() => {
    premier.current?.focus();
    const touche = (e) => { if (e.key === 'Escape') onFermer(); };
    document.addEventListener('keydown', touche);
    const defilement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', touche); document.body.style.overflow = defilement; };
  }, [onFermer]);

  const valide = sujet.trim().length >= 3 && message.trim().length >= 10;
  const envoyer = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setEnvoi(true); setErreur('');
    try { await demanderMentorat({ mentor_id: mentor.id, sujet: sujet.trim(), message: message.trim() }); onEnvoye(); }
    catch (err) { setErreur(messageErreur(err, t('commun.erreur'))); setEnvoi(false); }
  };

  return createPortal(
    <div className="anim-fade fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <form onSubmit={envoyer} role="dialog" aria-modal="true" aria-labelledby="titre-demande" className="anim-scale max-h-full w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center gap-3">
          <Avatar user={{ pseudo: mentor.pseudo, profil: { photo: mentor.photo } }} size={44} />
          <div className="min-w-0 flex-1">
            <h2 id="titre-demande" className="text-lg font-bold leading-tight">{t('mentorat.demande_titre', { pseudo: mentor.pseudo })}</h2>
            <p className="text-sm text-slate-600">{t('mentorat.demande_texte')}</p>
          </div>
          <button type="button" onClick={onFermer} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('mentorat.fermer')}><Icone nom="fermer" /></button>
        </div>
        {erreur && <div className="erreur mt-3" role="alert">{erreur}</div>}
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="dm-sujet" className="label">{t('mentorat.sujet_label')}</label>
            <input id="dm-sujet" ref={premier} className="input" value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={100} required minLength={3} placeholder={t('mentorat.sujet_placeholder')} />
            {mentor.stacks?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5 text-xs">{mentor.stacks.slice(0, 5).map((s) => <button key={s} type="button" onClick={() => setSujet(t('mentorat.sujet_suggere', { stack: s }))} className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 transition hover:bg-slate-200">{s}</button>)}</div>}
          </div>
          <div>
            <label htmlFor="dm-message" className="label">{t('mentorat.message_label')}</label>
            <textarea id="dm-message" className="input min-h-[7rem]" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required minLength={10} placeholder={t('mentorat.message_placeholder')} />
            <p className="mt-1 text-xs text-slate-500">{t('mentorat.message_aide')} · {message.length} / 1000</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onFermer} className="btn-outline">{t('commun.annuler')}</button>
          <button className="btn" disabled={!valide || envoi}>{envoi ? t('commun.chargement') : t('mentorat.envoyer')}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}
