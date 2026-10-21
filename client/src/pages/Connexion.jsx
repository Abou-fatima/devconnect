import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, githubUrl } from '../services/auth';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';

export default function Connexion() {
  const { t } = useTranslation();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ identifiant: '', mot_de_passe: '' });
  const [erreur, setErreur] = useState(params.get('erreur') === 'github' ? t('auth.erreur_github') : '');
  const [envoi, setEnvoi] = useState(false);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      setSession(await login(form));
      navigate(location.state?.from || '/profil', { replace: true });
    } catch (err) {
      setErreur(messageErreur(err, t('commun.erreur')));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{t('auth.titre_connexion')}</h1>
      <form onSubmit={submit} className="card space-y-4">
        {erreur && <div className="erreur" role="alert">{erreur}</div>}
        <Field label={t('auth.identifiant')}><input className="input" value={form.identifiant} onChange={change('identifiant')} autoComplete="username" required minLength={3} /></Field>
        <Field label={t('auth.mdp')}><input className="input" type="password" value={form.mot_de_passe} onChange={change('mot_de_passe')} autoComplete="current-password" required /></Field>
        <button className="btn w-full" disabled={envoi}>{t('auth.se_connecter')}</button>
        <div className="text-center text-sm text-slate-400">{t('auth.ou')}</div>
        <a href={githubUrl} className="btn-outline w-full">{t('auth.github')}</a>
      </form>
      <p className="mt-4 text-center text-sm">{t('auth.pas_de_compte')} <Link to="/inscription" className="text-brand-light underline">{t('nav.inscription')}</Link></p>
    </div>
  );
}
