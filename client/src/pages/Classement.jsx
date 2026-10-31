import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classementDevs, classementPays } from '../services/forum';
import { messageErreur } from '../services/api';
import { nomPays } from '../lib/forum';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Pays from '../components/Pays';

const MEDAILLES = ['🥇', '🥈', '🥉'];

function LigneDev({ d, moi }) {
  const { t } = useTranslation();
  const estMoi = moi && d.id === moi.id;
  return (
    <li>
      <Link to={estMoi ? '/profil' : `/developpeurs/${d.id}`} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${estMoi ? 'bg-amber-50' : ''}`}>
        <span className={`w-9 shrink-0 text-center font-bold tabular-nums ${d.rang <= 3 ? 'text-2xl' : 'text-slate-500'}`} aria-label={t('classement.rang', { rang: d.rang })}>{d.rang <= 3 ? MEDAILLES[d.rang - 1] : d.rang}</span>
        <Avatar user={d} size={d.rang <= 3 ? 44 : 36} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2"><span className="truncate font-semibold">{d.pseudo}</span>{estMoi && <span className="rounded bg-accent px-1.5 text-[11px] font-semibold text-slate-900">{t('classement.toi')}</span>}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500"><Pays code={d.pays} />{d.ville && <span className="truncate">{d.ville}</span>}{(d.stacks || []).slice(0, 3).map((s) => <span key={s} className="hidden rounded bg-slate-100 px-1.5 text-xs sm:inline">{s}</span>)}</span>
        </span>
        <span className="shrink-0 text-right"><span className="block text-lg font-bold tabular-nums text-brand">{d.reputation ?? 0}</span><span className="block text-[11px] text-slate-500">{t('profil.reputation')}</span></span>
      </Link>
    </li>
  );
}

function Pays_({ pays, onChoisir }) {
  const { t, i18n } = useTranslation();
  const max = pays[0]?.reputation_totale || 1;
  return (
    <ul className="divide-y divide-slate-100">
      {pays.map((p) => (
        <li key={p.pays}>
          <button type="button" onClick={() => onChoisir(p.pays)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none" aria-label={t('classement.voir_devs_pays', { pays: nomPays(p.pays, i18n.language) })}>
            <span className={`w-9 shrink-0 text-center font-bold tabular-nums ${p.rang <= 3 ? 'text-2xl' : 'text-slate-500'}`}>{p.rang <= 3 ? MEDAILLES[p.rang - 1] : p.rang}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><Pays code={p.pays} /><span className="truncate font-semibold">{nomPays(p.pays, i18n.language)}</span></span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(3, Math.round((p.reputation_totale / max) * 100))}%` }} /></span>
              <span className="mt-1 block text-xs text-slate-500">{t('classement.nb_devs', { count: p.nb_devs })}</span>
            </span>
            <span className="shrink-0 text-right"><span className="block text-lg font-bold tabular-nums text-brand">{p.reputation_totale}</span><span className="block text-[11px] text-slate-500">{t('classement.points')}</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Classement() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const vue = params.get('vue') === 'pays' ? 'pays' : 'devs';
  const pays = (params.get('pays') || '').toUpperCase();

  const [devs, setDevs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listePays, setListePays] = useState([]);
  const [etat, setEtat] = useState('chargement');
  const [erreur, setErreur] = useState('');
  const [plus, setPlus] = useState(false);

  const maj = useCallback((chg) => {
    const p = Object.fromEntries(params.entries());
    Object.entries(chg).forEach(([k, v]) => { if (v) p[k] = v; else delete p[k]; });
    setParams(p, { replace: true });
  }, [params, setParams]);

  useEffect(() => { classementPays().then(setListePays).catch(() => {}); }, []);

  const charger = useCallback(() => {
    setEtat('chargement');
    const requete = vue === 'pays' ? Promise.resolve(null) : classementDevs({ limit: 20, page: 1, ...(pays && { pays }) });
    requete
      .then((d) => { if (d) { setDevs(d.data); setPage(1); setPages(d.pages); setTotal(d.total); } setEtat('ok'); })
      .catch((e) => { setErreur(messageErreur(e, t('commun.erreur'))); setEtat('erreur'); });
  }, [vue, pays, t]);
  useEffect(() => { charger(); }, [charger]);

  const voirPlus = async () => {
    setPlus(true);
    try {
      const d = await classementDevs({ limit: 20, page: page + 1, ...(pays && { pays }) });
      setDevs((prev) => [...prev, ...d.data.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1); setPages(d.pages);
    } catch { /* réessayer */ } finally { setPlus(false); }
  };

  const onglet = (actif) => `flex-1 rounded-lg px-4 py-2 text-center font-medium transition-colors ${actif ? 'bg-brand text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{t('classement.titre_page')}</h1>
      <p className="mb-4 text-slate-600">{t('classement.sous_titre')}</p>

      <div className="mb-3 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label={t('classement.vue')}>
        <button type="button" role="tab" aria-selected={vue === 'devs'} onClick={() => maj({ vue: '' })} className={onglet(vue === 'devs')}>{t('classement.devs')}</button>
        <button type="button" role="tab" aria-selected={vue === 'pays'} onClick={() => maj({ vue: 'pays', pays: '' })} className={onglet(vue === 'pays')}>{t('classement.pays')}</button>
      </div>

      {vue === 'devs' && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="f-pays" className="text-sm text-slate-600">{t('classement.filtrer_pays')}</label>
          <select id="f-pays" className="input !w-auto !py-1.5" value={pays} onChange={(e) => maj({ pays: e.target.value })}>
            <option value="">{t('classement.tous_pays')}</option>
            {listePays.map((p) => <option key={p.pays} value={p.pays}>{nomPays(p.pays, i18n.language)}</option>)}
          </select>
          {etat === 'ok' && <span className="text-sm text-slate-500">{t('classement.nb_devs', { count: total })}</span>}
        </div>
      )}

      <div className="card overflow-hidden !p-0">
        {etat === 'chargement' && <p className="p-8 text-center text-slate-400" aria-busy="true">{t('commun.chargement')}</p>}
        {etat === 'erreur' && <div className="p-6 text-center"><p className="erreur">{erreur}</p><button type="button" onClick={charger} className="btn mt-3">{t('chat.reessayer')}</button></div>}
        {etat === 'ok' && vue === 'devs' && (devs.length > 0
          ? <ol className="stagger divide-y divide-slate-100">{devs.map((d) => <LigneDev key={d.id} d={d} moi={user} />)}</ol>
          : <p className="p-8 text-center text-slate-500">{t('classement.vide')}</p>)}
        {etat === 'ok' && vue === 'pays' && (listePays.length > 0
          ? <Pays_ pays={listePays} onChoisir={(p) => maj({ vue: '', pays: p })} />
          : <p className="p-8 text-center text-slate-500">{t('classement.vide')}</p>)}
      </div>

      {etat === 'ok' && vue === 'devs' && page < pages && <div className="mt-4 text-center"><button type="button" onClick={voirPlus} disabled={plus} className="btn-outline">{plus ? t('commun.chargement') : t('forum.voir_plus')}</button></div>}

      <aside className="mt-6 rounded-xl bg-brand/5 p-4 text-sm text-slate-700">
        <h2 className="font-semibold text-brand">{t('classement.comment')}</h2>
        <p className="mt-1">{t('classement.comment_texte')}</p>
      </aside>
    </div>
  );
}
