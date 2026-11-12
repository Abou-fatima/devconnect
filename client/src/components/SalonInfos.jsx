import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { messageErreur } from '../services/api';
import { getSalon, modifierSalon, nouveauCode, quitterSalon, retirerMembre, supprimerSalon } from '../services/salons';
import { lienInvitation, lienWhatsApp } from '../lib/salons';
import Field from './Field';
import Icone from './Icone';

// Fiche d'un salon : lien d'invitation à partager, membres, et (pour le créateur) modification, retrait de membres, suppression.
export default function SalonInfos({ salonId, moiId, onFerme, onChange, onSorti }) {
  const { t } = useTranslation();
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  const [confirme, setConfirme] = useState(null); // 'quitter' | 'supprimer' | 'code' | id d'un membre
  const [occupe, setOccupe] = useState(false);
  const [copie, setCopie] = useState(false);
  const [edition, setEdition] = useState(null); // { nom, description, visibilite }
  const champLien = useRef(null);

  const charger = useCallback(async () => {
    try { setD(await getSalon(salonId)); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); }
  }, [salonId, t]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    const surTouche = (e) => { if (e.key === 'Escape') onFerme(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFerme]);

  const agir = async (action, apres) => {
    setOccupe(true); setErreur('');
    try { await action(); setConfirme(null); await apres?.(); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOccupe(false); }
  };

  const salon = d?.salon;
  const proprio = salon?.role === 'proprietaire';
  const lien = salon?.code ? lienInvitation(salon.code) : '';
  const texte = salon ? t('salons.infos_salon.texte_partage', { nom: salon.nom }) : '';

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { champLien.current?.select(); }
  };
  const partager = () => { navigator.share?.({ title: salon.nom, text: texte, url: lien }).catch(() => {}); };

  const bouton = 'rounded px-2 py-1 text-xs font-medium';
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onFerme}>
      <div role="dialog" aria-modal="true" aria-label={t('salons.infos')} onClick={(e) => e.stopPropagation()}
        className="page-enter max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{salon?.nom || '…'}</h2>
            {salon && <p className="text-xs text-slate-500">{salon.visibilite === 'public' ? <Icone nom="monde" /> : <Icone nom="verrou" />} {t(`salons.visibilite_${salon.visibilite}`)} · {t('salons.membres', { count: salon.nb_membres })}</p>}
          </div>
          <button type="button" onClick={onFerme} aria-label={t('salons.infos_salon.fermer')} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Icone nom="fermer" /></button>
        </div>

        {erreur && <p className="erreur mt-3" role="alert">{erreur}</p>}
        {!d && !erreur && <p className="mt-4 text-slate-500">{t('commun.chargement')}</p>}

        {salon && (
          <div className="mt-3 space-y-5">
            {!edition && salon.description && <p className="text-sm text-slate-700">{salon.description}</p>}

            {edition && (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); agir(() => modifierSalon(salonId, { nom: edition.nom.trim(), description: edition.description.trim(), visibilite: edition.visibilite }), async () => { setEdition(null); await charger(); onChange?.(); }); }}>
                <Field label={t('salons.creer.nom')}><input className="input" value={edition.nom} maxLength={60} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></Field>
                <Field label={t('salons.creer.description')}><textarea className="input" rows={2} maxLength={220} value={edition.description} onChange={(e) => setEdition({ ...edition, description: e.target.value })} /></Field>
                <Field label={t('salons.creer.visibilite')}>
                  <select className="input" value={edition.visibilite} onChange={(e) => setEdition({ ...edition, visibilite: e.target.value })}>
                    <option value="public">{t('salons.creer.public_titre')}</option>
                    <option value="invitation">{t('salons.creer.invitation_titre')}</option>
                  </select>
                </Field>
                <div className="flex gap-2">
                  <button className="btn !py-1.5 text-sm" disabled={occupe}>{t('salons.infos_salon.enregistrer')}</button>
                  <button type="button" className="btn-outline !py-1.5 text-sm" onClick={() => setEdition(null)}>{t('salons.infos_salon.annuler')}</button>
                </div>
              </form>
            )}
            {!edition && proprio && <button type="button" className={`${bouton} text-slate-600 underline`} onClick={() => setEdition({ nom: salon.nom, description: salon.description || '', visibilite: salon.visibilite })}>{t('salons.infos_salon.modifier')}</button>}

            <section>
              <h3 className="font-semibold">{t('salons.infos_salon.inviter')}</h3>
              <p className="text-xs text-slate-600">{t(`salons.infos_salon.inviter_texte_${salon.visibilite}`)}</p>
              <label className="mt-2 block"><span className="sr-only">{t('salons.infos_salon.lien')}</span>
                <input ref={champLien} readOnly value={lien} onFocus={(e) => e.target.select()} className="input !py-1.5 text-sm" />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={copier} className="btn !py-1.5 text-sm">{copie ? <><Icone nom="ok" /> {t('salons.infos_salon.copie')}</> : t('salons.infos_salon.copier')}</button>
                <a href={lienWhatsApp(texte, lien)} target="_blank" rel="noopener noreferrer" className="btn-outline !py-1.5 text-sm">{t('salons.infos_salon.whatsapp')}</a>
                {typeof navigator !== 'undefined' && navigator.share && <button type="button" onClick={partager} className="btn-outline !py-1.5 text-sm">{t('salons.infos_salon.partager')}</button>}
              </div>
              {proprio && (confirme === 'code'
                ? <p className="mt-2 text-xs">{t('salons.infos_salon.nouveau_lien_confirme')} <button type="button" disabled={occupe} onClick={() => agir(() => nouveauCode(salonId), charger)} className="font-semibold text-red-700 underline">{t('salons.infos_salon.oui')}</button> <button type="button" onClick={() => setConfirme(null)} className="underline">{t('salons.infos_salon.annuler')}</button></p>
                : <button type="button" onClick={() => setConfirme('code')} className={`${bouton} mt-1 text-slate-500 underline`}>{t('salons.infos_salon.nouveau_lien')}</button>)}
            </section>

            <section>
              <h3 className="font-semibold">{t('salons.infos_salon.membres', { count: d.membres?.length || salon.nb_membres })}</h3>
              <ul className="mt-1 divide-y divide-slate-100">
                {(d.membres || []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{m.pseudo.charAt(0).toUpperCase()}</span>
                      <Link to={m.id === moiId ? '/profil' : `/developpeurs/${m.id}`} className="truncate hover:underline" onClick={onFerme}>{m.pseudo}{m.id === moiId ? ` (${t('salons.infos_salon.toi')})` : ''}</Link>
                      {m.role === 'proprietaire' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{t('salons.infos_salon.createur')}</span>}
                    </span>
                    {proprio && m.id !== moiId && (confirme === m.id
                      ? <span className="shrink-0 text-xs">{t('salons.infos_salon.retirer_confirme', { pseudo: m.pseudo })} <button type="button" disabled={occupe} onClick={() => agir(() => retirerMembre(salonId, m.id), async () => { await charger(); onChange?.(); })} className="font-semibold text-red-700 underline">{t('salons.infos_salon.oui')}</button> <button type="button" onClick={() => setConfirme(null)} className="underline">{t('salons.infos_salon.annuler')}</button></span>
                      : <button type="button" onClick={() => setConfirme(m.id)} className={`${bouton} shrink-0 text-red-700 hover:bg-red-50`}>{t('salons.infos_salon.retirer')}</button>)}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2 border-t border-slate-200 pt-3">
              {confirme === 'quitter'
                ? <p className="text-sm">{t('salons.infos_salon.quitter_confirme')} <button type="button" disabled={occupe} onClick={() => agir(() => quitterSalon(salonId), () => { onChange?.(); onSorti?.(); })} className="font-semibold text-red-700 underline">{t('salons.infos_salon.oui')}</button> <button type="button" onClick={() => setConfirme(null)} className="underline">{t('salons.infos_salon.annuler')}</button></p>
                : <button type="button" onClick={() => setConfirme('quitter')} className="text-sm font-medium text-red-700 hover:underline">{t('salons.infos_salon.quitter')}</button>}
              {proprio && (confirme === 'supprimer'
                ? <p className="text-sm">{t('salons.infos_salon.supprimer_confirme')} <button type="button" disabled={occupe} onClick={() => agir(() => supprimerSalon(salonId), () => { onChange?.(); onSorti?.(); })} className="font-semibold text-red-700 underline">{t('salons.infos_salon.oui')}</button> <button type="button" onClick={() => setConfirme(null)} className="underline">{t('salons.infos_salon.annuler')}</button></p>
                : <button type="button" onClick={() => setConfirme('supprimer')} className="block text-sm font-medium text-red-700 hover:underline">{t('salons.infos_salon.supprimer')}</button>)}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
