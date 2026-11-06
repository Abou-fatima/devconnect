import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { creerSalon } from '../services/salons';
import { messageErreur } from '../services/api';
import { erreursChamps } from '../lib/erreurs';
import Field from './Field';
import Icone from './Icone';

// Fenêtre « Créer un salon » : nom, description, public ou sur invitation.
export default function SalonCreerModal({ onFerme, onCree }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ nom: '', description: '', visibilite: 'public' });
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const champNom = useRef(null);

  useEffect(() => {
    champNom.current?.focus();
    const surTouche = (e) => { if (e.key === 'Escape') onFerme(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFerme]);

  const change = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErreurs((x) => (x[k] ? { ...x, [k]: undefined } : x));
  };

  const valider = () => {
    const e = {};
    const nom = form.nom.trim();
    if (nom.length < 3) e.nom = t('salons.creer.nom_requis');
    else if (nom.length > 50) e.nom = t('salons.creer.nom_max');
    if (form.description.trim().length > 200) e.description = t('salons.creer.description_max');
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErreur('');
    const locales = valider();
    setErreurs(locales);
    if (Object.keys(locales).length) { champNom.current?.focus(); return; }
    setEnvoi(true);
    try {
      const salon = await creerSalon({ nom: form.nom.trim(), description: form.description.trim() || undefined, visibilite: form.visibilite });
      onCree(salon);
    } catch (err) {
      const champs = erreursChamps(err);
      if (champs.nom || champs.description) setErreurs(champs); else setErreur(messageErreur(err, t('commun.erreur')));
      setEnvoi(false);
    }
  };

  const options = ['public', 'invitation'];
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onFerme}>
      <form role="dialog" aria-modal="true" aria-label={t('salons.creer.titre')} noValidate onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="page-enter max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div>
          <h2 className="text-lg font-bold">{t('salons.creer.titre')}</h2>
          <p className="text-sm text-slate-600">{t('salons.creer.intro')}</p>
        </div>
        {erreur && <div className="erreur" role="alert">{erreur}</div>}

        <Field label={t('salons.creer.nom')} erreur={erreurs.nom}>
          <input ref={champNom} className="input" value={form.nom} onChange={change('nom')} maxLength={60} placeholder={t('salons.creer.nom_placeholder')} />
        </Field>
        <Field label={t('salons.creer.description')} erreur={erreurs.description}>
          <textarea className="input" rows={2} value={form.description} onChange={change('description')} maxLength={220} placeholder={t('salons.creer.description_placeholder')} />
        </Field>

        <fieldset>
          <legend className="label">{t('salons.creer.visibilite')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <label key={o} className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${form.visibilite === o ? 'border-brand bg-brand/5' : 'border-slate-300 hover:bg-slate-50'}`}>
                <input type="radio" name="visibilite" value={o} checked={form.visibilite === o} onChange={change('visibilite')} className="sr-only" />
                <span className="block font-semibold">{o === 'public' ? <Icone nom="monde" /> : <Icone nom="verrou" />}{' '}{t(`salons.creer.${o}_titre`)}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{t(`salons.creer.${o}_texte`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onFerme}>{t('salons.creer.annuler')}</button>
          <button type="submit" className="btn" disabled={envoi}>{envoi ? t('commun.chargement') : t('salons.creer.bouton')}</button>
        </div>
      </form>
    </div>
  );
}
