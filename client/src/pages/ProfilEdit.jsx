import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOptions, updateMe } from '../services/users';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';

export default function ProfilEdit() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState({ niveaux: [], objectifs: [], stacks: [] });
  const [f, setF] = useState(() => ({
    pseudo: user.pseudo || '', pays: user.pays || '', ville: user.ville || '',
    bio: user.profil?.bio || '', photo: user.profil?.photo || '', niveau: user.profil?.niveau || '',
    stacks: (user.stacks || []).join(', '), objectifs: user.objectifs || [],
    github: user.profil?.liens?.github || '', linkedin: user.profil?.liens?.linkedin || '',
    site: user.profil?.liens?.site || '', whatsapp: user.profil?.liens?.whatsapp || ''
  }));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { getOptions().then(setOptions).catch(() => {}); }, []);

  const change = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleObjectif = (o) => setF((x) => ({ ...x, objectifs: x.objectifs.includes(o) ? x.objectifs.filter((y) => y !== o) : [...x.objectifs, o] }));

  const submit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    // Une chaîne vide efface le champ côté API ; le niveau, lui, ne peut pas être vide.
    const body = {
      pseudo: f.pseudo.trim(),
      ...(f.pays.trim() && { pays: f.pays.trim() }),
      ville: f.ville.trim(),
      stacks: f.stacks.split(',').map((s) => s.trim()).filter(Boolean),
      objectifs: f.objectifs,
      profil: {
        bio: f.bio.trim(), photo: f.photo.trim(),
        ...(f.niveau && { niveau: f.niveau }),
        liens: { github: f.github.trim(), linkedin: f.linkedin.trim(), site: f.site.trim(), whatsapp: f.whatsapp.trim() }
      }
    };
    try {
      setUser(await updateMe(body));
      navigate('/profil');
    } catch (err) {
      setErreur(messageErreur(err, t('commun.erreur')));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t('profil.modifier')}</h1>
      <form onSubmit={submit} className="card space-y-4">
        {erreur && <div className="erreur" role="alert">{erreur}</div>}
        <Field label={t('auth.pseudo')}><input className="input" value={f.pseudo} onChange={change('pseudo')} required minLength={3} maxLength={30} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('auth.pays')}><input className="input uppercase" value={f.pays} onChange={change('pays')} maxLength={2} /></Field>
          <Field label={t('auth.ville')}><input className="input" value={f.ville} onChange={change('ville')} /></Field>
        </div>
        <Field label={t('profil.bio')}><textarea className="input" rows={4} maxLength={500} value={f.bio} onChange={change('bio')} /></Field>
        <Field label={t('profil.photo')}><input className="input" type="url" value={f.photo} onChange={change('photo')} /></Field>
        <Field label={t('profil.niveau')}>
          <select className="input" value={f.niveau} onChange={change('niveau')}>
            <option value="">—</option>
            {options.niveaux.map((n) => <option key={n} value={n}>{t(`profil.niveaux.${n}`)}</option>)}
          </select>
        </Field>
        <Field label={t('profil.stacks')}>
          <input className="input" list="stacks" value={f.stacks} onChange={change('stacks')} placeholder="react, node, mongodb" />
          <datalist id="stacks">{options.stacks.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <fieldset>
          <legend className="label">{t('profil.objectifs')}</legend>
          <div className="flex flex-wrap gap-2">
            {options.objectifs.map((o) => (
              <label key={o} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${f.objectifs.includes(o) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}>
                <input type="checkbox" className="sr-only" checked={f.objectifs.includes(o)} onChange={() => toggleObjectif(o)} />
                {t(`profil.objectifs_liste.${o}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('profil.github')}><input className="input" type="url" value={f.github} onChange={change('github')} /></Field>
        <Field label={t('profil.linkedin')}><input className="input" type="url" value={f.linkedin} onChange={change('linkedin')} /></Field>
        <Field label={t('profil.site')}><input className="input" type="url" value={f.site} onChange={change('site')} /></Field>
        <Field label={t('profil.whatsapp')}><input className="input" type="tel" value={f.whatsapp} onChange={change('whatsapp')} /></Field>
        <div className="flex gap-3">
          <button className="btn" disabled={envoi}>{t('commun.enregistrer')}</button>
          <button type="button" className="btn-outline" onClick={() => navigate('/profil')}>{t('commun.annuler')}</button>
        </div>
      </form>
    </div>
  );
}
