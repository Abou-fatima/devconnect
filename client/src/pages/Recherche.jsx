import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { getOptions, searchUsers } from '../services/users';
import DevCard from '../components/DevCard';
import Field from '../components/Field';

export default function Recherche() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [options, setOptions] = useState({ niveaux: [], stacks: [] });
  const [res, setRes] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [form, setForm] = useState({ q: params.get('q') || '', stack: params.get('stack') || '', pays: params.get('pays') || '', niveau: params.get('niveau') || '', tri: params.get('tri') || 'reputation' });
  const page = Number(params.get('page') || 1);

  useEffect(() => { getOptions().then(setOptions).catch(() => {}); }, []);

  const charger = useCallback(() => {
    const p = Object.fromEntries([...params.entries()].filter(([, v]) => v));
    setErreur(false);
    searchUsers(p).then(setRes).catch(() => setErreur(true));
  }, [params]);
  useEffect(() => { charger(); }, [charger]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const lancer = (e) => {
    e.preventDefault();
    const p = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
    setParams(p);
  };
  const allerA = (n) => { const p = Object.fromEntries(params.entries()); p.page = String(n); setParams(p); window.scrollTo({ top: 0 }); };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('recherche.titre')}</h1>
      <form onSubmit={lancer} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('recherche.q')}><input className="input" value={form.q} onChange={change('q')} maxLength={50} /></Field>
        <Field label={t('recherche.stack')}>
          <input className="input" list="stacks-r" value={form.stack} onChange={change('stack')} placeholder="react" />
          <datalist id="stacks-r">{options.stacks.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label={t('recherche.pays')}><input className="input uppercase" value={form.pays} onChange={change('pays')} maxLength={2} /></Field>
        <Field label={t('recherche.niveau')}>
          <select className="input" value={form.niveau} onChange={change('niveau')}>
            <option value="">{t('recherche.tous')}</option>
            {options.niveaux.map((n) => <option key={n} value={n}>{t(`profil.niveaux.${n}`)}</option>)}
          </select>
        </Field>
        <Field label={t('recherche.tri')}>
          <select className="input" value={form.tri} onChange={change('tri')}>
            <option value="reputation">{t('recherche.tri_reputation')}</option>
            <option value="recent">{t('recherche.tri_recent')}</option>
            <option value="pseudo">{t('recherche.tri_pseudo')}</option>
          </select>
        </Field>
        <div className="flex items-end"><button className="btn w-full">{t('recherche.rechercher')}</button></div>
      </form>

      {erreur && <p className="erreur">{t('commun.erreur')}</p>}
      {!res && !erreur && <p className="text-slate-500">{t('commun.chargement')}</p>}
      {res && (
        <>
          <p className="mb-2 text-sm text-slate-500">{t('recherche.resultats', { count: res.total })}</p>
          {res.data.length === 0 ? <p>{t('commun.aucun')}</p> : <div className="grid gap-3 md:grid-cols-2">{res.data.map((u) => <DevCard key={u.id} u={u} />)}</div>}
          {res.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button className="btn-outline" disabled={page <= 1} onClick={() => allerA(page - 1)}>{t('commun.precedent')}</button>
              <span className="text-sm">{t('commun.page', { page: res.page, pages: res.pages })}</span>
              <button className="btn-outline" disabled={page >= res.pages} onClick={() => allerA(page + 1)}>{t('commun.suivant')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
