import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changerRoleMembre, retirerMembre } from '../services/collaboration';
import { messageErreur } from '../services/api';
import { idPersonne } from '../lib/projets';
import Avatar from './Avatar';
import Icone from './Icone';

// Équipe du projet. Le porteur peut changer le rôle d'un membre ou le retirer.
export default function EquipeProjet({ projetId, porteur, membres, estProprietaire, onChange }) {
  const { t } = useTranslation();
  const [edition, setEdition] = useState(null); // id du membre dont on modifie le rôle
  const [role, setRole] = useState('');
  const [retrait, setRetrait] = useState(null); // id du membre dont on confirme le retrait
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const porteurId = idPersonne(porteur);

  const agir = async (fn) => {
    setOccupe(true); setErreur('');
    try { await fn(); setEdition(null); setRetrait(null); await onChange(); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOccupe(false); }
  };

  return (
    <section className="card">
      <h2 className="mb-2 text-lg font-bold">{t('projets.equipe')}</h2>
      {erreur && <div className="erreur mb-2" role="alert">{erreur}</div>}
      <ul className="space-y-2">
        {porteur && (
          <li><Link to={`/developpeurs/${porteurId}`} className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-slate-50">
            <Avatar user={porteur} size={34} />
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{porteur.pseudo}</span><span className="text-xs text-slate-500">{t('projets.porteur')}</span></span>
          </Link></li>
        )}
        {membres.map((m) => {
          const mid = idPersonne(m.user_id);
          return (
            <li key={mid} className="anim-fade rounded-lg p-1">
              <div className="flex items-center gap-3">
                <Link to={`/developpeurs/${mid}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:bg-slate-50">
                  <Avatar user={m.user_id} size={34} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{m.user_id.pseudo}</span>{m.role && <span className="text-xs text-slate-500">{m.role}</span>}</span>
                </Link>
                {estProprietaire && edition !== mid && retrait !== mid && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => { setEdition(mid); setRole(m.role || ''); setRetrait(null); }} className="rounded px-2 py-1 text-xs text-brand-light hover:bg-slate-100" aria-label={t('projets.collab.modifier_role')}><Icone nom="modifier" /></button>
                    <button type="button" onClick={() => { setRetrait(mid); setEdition(null); }} className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50" aria-label={t('projets.collab.retirer_membre')}><Icone nom="fermer" /></button>
                  </span>
                )}
              </div>
              {edition === mid && (
                <form onSubmit={(e) => { e.preventDefault(); if (role.trim()) agir(() => changerRoleMembre(projetId, mid, role.trim())); }} className="anim-scale mt-2 flex gap-2">
                  <input className="input !py-1.5" value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} aria-label={t('projets.collab.role_donne_label')} autoFocus />
                  <button className="btn !py-1.5" disabled={occupe || !role.trim()}>{t('commun.enregistrer')}</button>
                  <button type="button" onClick={() => setEdition(null)} className="btn-outline !py-1.5"><Icone nom="fermer" /></button>
                </form>
              )}
              {retrait === mid && (
                <div className="anim-scale mt-2 rounded-lg bg-red-50 p-2 text-sm" role="alertdialog">
                  <p className="font-medium text-red-900">{t('projets.collab.retirer_membre_confirm', { pseudo: m.user_id.pseudo })}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={occupe} onClick={() => agir(() => retirerMembre(projetId, mid))} className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50">{t('projets.collab.retirer_membre_oui')}</button>
                    <button type="button" onClick={() => setRetrait(null)} className="btn-outline !py-1">{t('commun.annuler')}</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {membres.length === 0 && <p className="mt-2 text-sm text-slate-500">{t('projets.equipe_vide')}</p>}
    </section>
  );
}
