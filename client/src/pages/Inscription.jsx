import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../services/auth';
import BoutonGithub from '../components/BoutonGithub';
import { messageErreur } from '../services/api';
import { erreursChamps } from '../lib/erreurs';
import { validerInscription } from '../lib/validation';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';

export default function Inscription() {
  const { t } = useTranslation();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ pseudo: '', email: '', mot_de_passe: '', telephone: '', pays: '', ville: '' });
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const formRef = useRef(null);

  const change = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErreurs((x) => (x[k] ? { ...x, [k]: undefined } : x));
  };
  const focusPremiere = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());

  const submit = async (e) => {
    e.preventDefault();
    setErreur('');
    const locales = validerInscription(form, t);
    setErreurs(locales);
    if (Object.keys(locales).length) { focusPremiere(); return; }
    setEnvoi(true);
    // Les champs optionnels vides ne sont pas envoyés (l'API rejette une chaîne vide).
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
    try {
      setSession(await register(body));
      navigate('/bienvenue', { replace: true }); // parcours de bienvenue : un compte neuf n'a encore ni niveau ni technologies
    } catch (err) {
      const champs = erreursChamps(err);
      if (Object.keys(champs).some((k) => k in form)) { setErreurs(champs); focusPremiere(); } else setErreur(messageErreur(err, t('commun.erreur')));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-md"><div className="anim-scale">
      <h1 className="mb-4 text-2xl font-bold">{t('auth.titre_inscription')}</h1>
      <form ref={formRef} onSubmit={submit} noValidate className="card space-y-4">
        {erreur && <div className="erreur" role="alert">{erreur}</div>}
        <BoutonGithub mode="inscription" />
        <div className="flex items-center gap-3 text-sm text-slate-400"><span className="h-px flex-1 bg-slate-200" />{t('auth.ou')}<span className="h-px flex-1 bg-slate-200" /></div>
        <Field requis label={t('auth.pseudo')} erreur={erreurs.pseudo}><input className="input" value={form.pseudo} onChange={change('pseudo')} maxLength={30} autoComplete="username" /></Field>
        <Field requis label={t('auth.email')} erreur={erreurs.email}><input className="input" type="email" value={form.email} onChange={change('email')} autoComplete="email" /></Field>
        <Field requis label={t('auth.mdp')} hint={t('auth.mdp_aide')} erreur={erreurs.mot_de_passe}><input className="input" type="password" value={form.mot_de_passe} onChange={change('mot_de_passe')} autoComplete="new-password" /></Field>
        <Field label={t('auth.telephone')} erreur={erreurs.telephone}><input className="input" type="tel" value={form.telephone} onChange={change('telephone')} placeholder="+224620000000" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('auth.pays')} erreur={erreurs.pays}><input className="input uppercase" value={form.pays} onChange={change('pays')} maxLength={2} placeholder="GN" /></Field>
          <Field label={t('auth.ville')} erreur={erreurs.ville}><input className="input" value={form.ville} onChange={change('ville')} /></Field>
        </div>
        <p className="text-xs text-slate-500">{t('erreurs.champs_requis')}</p>
        <button className="btn w-full" disabled={envoi}>{t('auth.creer_compte')}</button>
      </form>
      <p className="mt-4 text-center text-sm">{t('auth.deja_compte')} <Link to="/connexion" className="text-brand-light underline">{t('nav.connexion')}</Link></p>
    </div></div>
  );
}
