import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { accepterCandidature, listerCandidatures, refuserCandidature } from '../services/collaboration';
import { messageErreur } from '../services/api';
import { canalPrive } from '../lib/canaux';
import { ilYA } from '../lib/notifications';
import Avatar from './Avatar';
import Pays from './Pays';

const STYLE = { en_attente: 'bg-amber-100 text-amber-900', acceptee: 'bg-emerald-100 text-emerald-800', refusee: 'bg-slate-100 text-slate-600' };

function Carte({ c, moiId, occupe, onAccepter, onRefuser }) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState(null); // null | 'accepter' | 'refuser'
  const [role, setRole] = useState(c.role || '');
  const attente = c.statut === 'en_attente';
  const candidat = c.candidat || {};
  return (
    <li className="anim-fade rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <Avatar user={{ pseudo: candidat.pseudo, profil: { photo: candidat.photo } }} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link to={`/developpeurs/${candidat.id}`} className="font-semibold text-brand hover:underline">{candidat.pseudo}</Link>
            <span className="text-xs text-slate-500">⭐ {candidat.reputation}</span>
            <Pays code={candidat.pays} />
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[c.statut]}`}>{t(`projets.collab.etat.${c.statut}`)}</span>
            <time className="text-xs text-slate-400" dateTime={c.created_at}>{ilYA(c.created_at, i18n.language)}</time>
          </div>
          {candidat.stacks?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{candidat.stacks.slice(0, 5).map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{s}</span>)}</div>}
          {c.role && <p className="mt-1 text-xs font-medium text-amber-800">{t('projets.collab.demande_role', { role: c.role })}</p>}
          <p className="mt-2 whitespace-pre-wrap break-words text-slate-800">{c.message}</p>
          {c.statut === 'acceptee' && c.role_final && <p className="mt-1 text-xs text-emerald-800">{t('projets.collab.role_donne', { role: c.role_final })}</p>}

          {attente && mode === null && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('accepter')} className="btn !py-1.5">✓ {t('projets.collab.accepter')}</button>
              <button type="button" onClick={() => setMode('refuser')} className="btn-outline !py-1.5">{t('projets.collab.refuser')}</button>
              {candidat.id && moiId && <Link to={`/messages/${encodeURIComponent(canalPrive(moiId, candidat.id))}`} className="btn-outline !py-1.5">✉ {t('projets.collab.ecrire')}</Link>}
            </div>
          )}
          {attente && mode === 'accepter' && (
            <div className="anim-scale mt-3 rounded-lg bg-emerald-50 p-3">
              <label htmlFor={`role-${c.id}`} className="label">{t('projets.collab.role_donne_label')}</label>
              <input id={`role-${c.id}`} className="input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} placeholder={t('projets.collab.role_placeholder')} />
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={occupe} onClick={() => onAccepter(c.id, role.trim())} className="btn !py-1.5">{occupe ? t('commun.chargement') : t('projets.collab.confirmer_accepter')}</button>
                <button type="button" onClick={() => setMode(null)} className="btn-outline !py-1.5">{t('commun.annuler')}</button>
              </div>
            </div>
          )}
          {attente && mode === 'refuser' && (
            <div className="anim-scale mt-3 rounded-lg bg-red-50 p-3" role="alertdialog">
              <p className="font-medium text-red-900">{t('projets.collab.refuser_confirm')}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={occupe} onClick={() => onRefuser(c.id)} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">{t('projets.collab.refuser_oui')}</button>
                <button type="button" onClick={() => setMode(null)} className="btn-outline !py-1.5">{t('commun.annuler')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// Espace du porteur : demandes à traiter (accepter avec un rôle, ou refuser) et historique.
export default function CandidaturesPorteur({ projetId, moiId, onChange }) {
  const { t } = useTranslation();
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [historique, setHistorique] = useState(false);

  const charger = useCallback(() => listerCandidatures(projetId).then(setListe).catch((e) => { setErreur(messageErreur(e, t('commun.erreur'))); setListe([]); }), [projetId, t]);
  useEffect(() => { charger(); }, [charger]);

  const decider = async (fn) => {
    setOccupe(true); setErreur('');
    try { await fn(); await Promise.all([charger(), onChange()]); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOccupe(false); }
  };

  const attente = (liste || []).filter((c) => c.statut === 'en_attente');
  const passees = (liste || []).filter((c) => c.statut !== 'en_attente');

  return (
    <section className="card" aria-labelledby="titre-candidatures">
      <h2 id="titre-candidatures" className="mb-3 flex flex-wrap items-center gap-2 text-lg font-bold">
        {t('projets.collab.candidatures_titre')}
        {attente.length > 0 && <span className="anim-pop rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{t('projets.collab.a_traiter', { count: attente.length })}</span>}
      </h2>
      {erreur && <div className="erreur mb-3" role="alert">{erreur}</div>}
      {liste === null && <div className="space-y-2" aria-busy="true"><div className="shimmer h-16 rounded" /><div className="shimmer h-16 rounded" /></div>}
      {liste && attente.length === 0 && <p className="text-sm text-slate-500">{t('projets.collab.candidatures_vide')}</p>}
      {attente.length > 0 && (
        <ul className="stagger space-y-3">
          {attente.map((c) => <Carte key={c.id} c={c} moiId={moiId} occupe={occupe} onAccepter={(id, role) => decider(() => accepterCandidature(id, role))} onRefuser={(id) => decider(() => refuserCandidature(id))} />)}
        </ul>
      )}
      {passees.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button type="button" onClick={() => setHistorique((h) => !h)} aria-expanded={historique} className="text-sm text-brand-light hover:underline">
            {historique ? t('projets.collab.historique_masquer') : t('projets.collab.historique_voir', { count: passees.length })}
          </button>
          {historique && <ul className="stagger mt-3 space-y-3">{passees.map((c) => <Carte key={c.id} c={c} moiId={moiId} occupe={occupe} onAccepter={() => {}} onRefuser={() => {}} />)}</ul>}
        </div>
      )}
    </section>
  );
}
