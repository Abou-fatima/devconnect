import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register, githubUrl } from '../services/auth';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';

export default function Inscription() {
  const { t } = useTranslation();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ pseudo: '', email: '', mot_de_passe: '', telephone: '', pays: '', ville: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    // Les champs optionnels vides ne sont pas envoyés (l'API rejette une chaîne vide).
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
    try {
      setSession(await register(body));
      navigate('/profil', { replace: true });
    } catch (err) {
      setErreur(messageErreur(err, t('commun.erreur')));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{t('auth.titre_inscription')}</h1>
      <form onSubmit={submit} className="card space-y-4">
        {erreur && <div className="erreur" role="alert">{erreur}</div>}
        <Field label={t('auth.pseudo')}><input className="input" value={form.pseudo} onChange={change('pseudo')} required minLength={3} maxLength={30} autoComplete="username" /></Field>
        <Field label={t('auth.email')}><input className="input" type="email" value={form.email} onChange={change('email')} required autoComplete="email" /></Field>
        <Field label={t('auth.mdp')} hint={t('auth.mdp_aide')}><input className="input" type="password" value={form.mot_de_passe} onChange={change('mot_de_passe')} required minLength={8} autoComplete="new-password" /></Field>
        <Field label={t('auth.telephone')}><input className="input" type="tel" value={form.telephone} onChange={change('telephone')} placeholder="+224620000000" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('auth.pays')}><input className="input uppercase" value={form.pays} onChange={change('pays')} maxLength={2} placeholder="GN" /></Field>
          <Field label={t('auth.ville')}><input className="input" value={form.ville} onChange={change('ville')} /></Field>
        </div>
        <button className="btn w-full" disabled={envoi}>{t('auth.creer_compte')}</button>
        <div className="text-center text-sm text-slate-400">{t('auth.ou')}</div>
        <a href={githubUrl} className="btn-outline w-full">{t('auth.github')}</a>
      </form>
      <p className="mt-4 text-center text-sm">{t('auth.deja_compte')} <Link to="/connexion" className="text-brand-light underline">{t('nav.connexion')}</Link></p>
    </div>
  );
}
