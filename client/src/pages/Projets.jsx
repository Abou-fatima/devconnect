import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listerProjets, projetsTendance } from '../services/projets';
import { messageErreur } from '../services/api';
import { ROLES_SUGGERES, STATUTS, idProjet } from '../lib/projets';
import useDebounce from '../hooks/useDebounce';
import ProjetCarte from '../components/ProjetCarte';

export default function Projets() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tri = params.get('tri') === 'tendances' ? 'tendances' : 'recent';
  const statut = STATUTS.includes(params.get('statut')) ? params.get('statut') : '';
  const role = params.get('role') || '';
  const stack = params.get('stack') || '';
  const qUrl = params.get('q') || '';

  const [recherche, setRecherche] = useState(qUrl);
  const rechercheDiff = useDebounce(recherche);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [etat, setEtat] = useState('chargement');
  const [erreur, setErreur] = useState('');
  const [plus, setPlus] = useState(false);

  const maj = useCallback((chg) => {
    const p = Object.fromEntries(params.entries());
    Object.entries(chg).forEach(([k, v]) => { if (v) p[k] = v; else delete p[k]; });
    setParams(p, { replace: true });
  }, [params, setParams]);

  useEffect(() => { if (rechercheDiff !== qUrl) maj({ q: rechercheDiff.trim() }); }, [rechercheDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtre = { limit: 12, ...(statut && { statut }), ...(role && { role }), ...(stack && { stack }), ...(qUrl && { q: qUrl }) };

  const charger = useCallback(() => {
    setEtat('chargement');
    const requete = tri === 'tendances' ? projetsTendance({ limit: 20 }) : listerProjets({ ...filtre, page: 1 });
    requete
      .then((d) => { setItems(d.data); setPage(1); setPages(d.pages || 1); setTotal(d.total ?? d.data.length); setEtat('ok'); })
      .catch((e) => { setErreur(messageErreur(e, t('commun.erreur'))); setEtat('erreur'); });
  }, [tri, statut, role, stack, qUrl, t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);

  const voirPlus = async () => {
    setPlus(true);
    try {
      const d = await listerProjets({ ...filtre, page: page + 1 });
      setItems((prev) => [...prev, ...d.data.filter((n) => !prev.some((p) => idProjet(p) === idProjet(n)))]);
      setPage(page + 1); setPages(d.pages);
    } catch { /* l'utilisateur peut réessayer */ } finally { setPlus(false); }
  };

  const filtres = Boolean(qUrl || statut || role || stack);
  const segment = (actif) => `rounded-full px-3 py-1 text-sm transition-colors ${actif ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('projets.titre')}</h1>
          <p className="text-slate-600">{t('projets.sous_titre')}</p>
        </div>
        <Link to="/projets/nouveau" className="btn">{t('projets.nouveau')}</Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={t('projets.trier')}>
        {['recent', 'tendances'].map((x) => <button key={x} type="button" aria-pressed={tri === x} onClick={() => maj({ tri: x === 'recent' ? '' : x })} className={segment(tri === x)}>{t(`projets.tri.${x}`)}</button>)}
      </div>

      {tri === 'recent' && (
        <div className="mb-4 space-y-3">
          <div>
            <label htmlFor="rech-projets" className="sr-only">{t('projets.rechercher')}</label>
            <input id="rech-projets" type="search" className="input" placeholder={t('projets.rechercher_placeholder')} value={recherche} onChange={(e) => setRecherche(e.target.value)} maxLength={100} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('projets.filtrer_statut')}>
              {['', ...STATUTS].map((x) => <button key={x || 'tous'} type="button" aria-pressed={statut === x} onClick={() => maj({ statut: x })} className={segment(statut === x)}>{t(`projets.statut.${x || 'tous'}`)}</button>)}
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              <span>{t('projets.role_filtre')}</span>
              <select className="input !w-auto !py-1" value={role} onChange={(e) => maj({ role: e.target.value })}>
                <option value="">{t('projets.tous_roles')}</option>
                {ROLES_SUGGERES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          {stack && <button type="button" onClick={() => maj({ stack: '' })} className="rounded bg-brand px-2 py-0.5 text-xs text-white">{stack} ✕</button>}
        </div>
      )}
      {tri === 'tendances' && <p className="mb-4 text-sm text-slate-500">{t('projets.tendances_note')}</p>}

      <div aria-live="polite" className="mb-2 text-sm text-slate-500">{etat === 'ok' && tri === 'recent' && t('projets.nb_projets', { count: total })}</div>

      {etat === 'chargement' && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t('commun.chargement')}>
          {[0, 1, 2, 3, 4, 5].map((i) => <li key={i} className="card h-40"><div className="shimmer h-4 w-2/3 rounded" /><div className="shimmer mt-3 h-3 w-full rounded" /><div className="shimmer mt-2 h-3 w-5/6 rounded" /><div className="shimmer mt-4 h-5 w-1/2 rounded" /></li>)}
        </ul>
      )}
      {etat === 'erreur' && <div className="card text-center"><p className="erreur">{erreur}</p><button type="button" onClick={charger} className="btn mt-3">{t('chat.reessayer')}</button></div>}
      {etat === 'ok' && items.length === 0 && (
        <div className="card py-10 text-center">
          <p className="text-lg font-semibold text-slate-800">{filtres ? t('projets.aucun_filtre') : t('projets.aucun')}</p>
          <p className="mx-auto mt-1 max-w-sm text-slate-600">{filtres ? t('projets.aucun_filtre_texte') : t('projets.aucun_texte')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {filtres && <button type="button" onClick={() => { setRecherche(''); setParams({}, { replace: true }); }} className="btn-outline">{t('projets.effacer_filtres')}</button>}
            <Link to="/projets/nouveau" className="btn">{t('projets.nouveau')}</Link>
          </div>
        </div>
      )}
      {etat === 'ok' && items.length > 0 && <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={idProjet(p)}><ProjetCarte p={p} /></li>)}</ul>}
      {etat === 'ok' && tri === 'recent' && page < pages && <div className="mt-5 text-center"><button type="button" onClick={voirPlus} disabled={plus} className="btn-outline">{plus ? t('commun.chargement') : t('projets.voir_plus')}</button></div>}
    </div>
  );
}
