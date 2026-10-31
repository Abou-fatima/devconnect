import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listerQuestions, listerTags } from '../services/forum';
import { messageErreur } from '../services/api';
import { ilYA } from '../lib/notifications';
import useDebounce from '../hooks/useDebounce';
import Auteur from '../components/Auteur';

const TRIS = ['recent', 'sans_reponse', 'actifs', 'votes'];
const STATUTS = ['', 'ouvert', 'resolu'];

function Carte({ q }) {
  const { t, i18n } = useTranslation();
  const resolue = q.statut === 'resolu';
  return (
    <div className="card relative !p-0 transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-4">
        <div className="hidden w-14 shrink-0 flex-col items-center gap-2 text-center sm:flex" aria-hidden>
          <div className={q.nb_votes > 0 ? 'text-brand' : 'text-slate-500'}><div className="text-lg font-bold leading-none">{q.nb_votes}</div><div className="text-[11px]">{t('forum.votes')}</div></div>
          <div className={`w-full rounded-md px-1 py-1 ${resolue ? 'bg-emerald-600 text-white' : q.nb_reponses > 0 ? 'border border-emerald-600 text-emerald-700' : 'border border-slate-200 text-slate-500'}`}>
            <div className="text-lg font-bold leading-none">{q.nb_reponses}</div><div className="text-[11px]">{t('forum.reponses')}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug">
            <Link to={`/forum/questions/${q.id}`} className="text-brand after:absolute after:inset-0 hover:underline focus-visible:outline-none">{q.titre}</Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-[15px] text-slate-600">{q.extrait.replace(/```[\s\S]*?```/g, ` ${t('forum.extrait_code')} `).replace(/\s+/g, ' ')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {resolue && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✓ {t('forum.resolue')}</span>}
            {q.tags.map((tag) => <span key={tag} className="relative z-10 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{tag}</span>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="relative z-10"><Auteur auteur={q.auteur} date={q.created_at} taille={22} /></span>
            <span className="text-xs text-slate-400 sm:hidden">▲ {q.nb_votes} · 💬 {q.nb_reponses}</span>
            <span className="hidden text-xs text-slate-400 sm:inline">{t('forum.derniere_activite', { quand: ilYA(q.derniere_activite, i18n.language) })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Forum() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tri = TRIS.includes(params.get('tri')) ? params.get('tri') : 'recent';
  const statut = STATUTS.includes(params.get('statut') || '') ? (params.get('statut') || '') : '';
  const tag = params.get('tag') || '';
  const qUrl = params.get('q') || '';

  const [recherche, setRecherche] = useState(qUrl);
  const rechercheDiff = useDebounce(recherche);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [etat, setEtat] = useState('chargement'); // chargement | ok | erreur
  const [erreur, setErreur] = useState('');
  const [plus, setPlus] = useState(false);
  const [tags, setTags] = useState([]);

  useEffect(() => { listerTags({ limit: 14 }).then(setTags).catch(() => {}); }, []);

  const maj = useCallback((chg) => {
    const p = Object.fromEntries(params.entries());
    Object.entries(chg).forEach(([k, v]) => { if (v) p[k] = v; else delete p[k]; });
    setParams(p, { replace: true });
  }, [params, setParams]);

  // La saisie met à jour l'adresse (partageable) une fois la frappe terminée.
  useEffect(() => { if (rechercheDiff !== qUrl) maj({ q: rechercheDiff.trim() }); }, [rechercheDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  const charger = useCallback(() => {
    setEtat('chargement');
    const filtre = { tri, limit: 15, ...(statut && { statut }), ...(tag && { tag }), ...(qUrl && { q: qUrl }) };
    listerQuestions({ ...filtre, page: 1 })
      .then((d) => { setItems(d.data); setPage(1); setPages(d.pages); setTotal(d.total); setEtat('ok'); })
      .catch((e) => { setErreur(messageErreur(e, t('commun.erreur'))); setEtat('erreur'); });
  }, [tri, statut, tag, qUrl, t]);
  useEffect(() => { charger(); }, [charger]);

  const voirPlus = async () => {
    setPlus(true);
    try {
      const d = await listerQuestions({ tri, limit: 15, page: page + 1, ...(statut && { statut }), ...(tag && { tag }), ...(qUrl && { q: qUrl }) });
      setItems((prev) => [...prev, ...d.data.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1); setPages(d.pages);
    } catch { /* l'utilisateur peut réessayer */ } finally { setPlus(false); }
  };

  const filtres = Boolean(qUrl || tag || statut);
  const segment = (actif) => `rounded-full px-3 py-1 text-sm transition-colors ${actif ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('forum.titre')}</h1>
          <p className="text-slate-600">{t('forum.sous_titre')}</p>
        </div>
        <Link to="/forum/poser" className="btn">{t('forum.poser')}</Link>
      </div>

      <div className="mb-3">
        <label htmlFor="rech-forum" className="sr-only">{t('forum.rechercher')}</label>
        <input id="rech-forum" type="search" className="input" placeholder={t('forum.rechercher_placeholder')} value={recherche} onChange={(e) => setRecherche(e.target.value)} maxLength={80} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('forum.trier')}>
          {TRIS.map((x) => <button key={x} type="button" aria-pressed={tri === x} onClick={() => maj({ tri: x === 'recent' ? '' : x })} className={segment(tri === x)}>{t(`forum.tri.${x}`)}</button>)}
        </div>
        <span className="hidden h-5 w-px bg-slate-300 sm:block" aria-hidden />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('forum.filtrer_statut')}>
          {STATUTS.map((x) => <button key={x || 'tous'} type="button" aria-pressed={statut === x} onClick={() => maj({ statut: x })} className={segment(statut === x)}>{t(`forum.statut.${x || 'tous'}`)}</button>)}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('forum.filtrer_tag')}>
          {tag && !tags.some((x) => x.tag === tag) && <button type="button" onClick={() => maj({ tag: '' })} className="rounded bg-brand px-2 py-0.5 text-xs text-white">{tag} ✕</button>}
          {tags.map((x) => (
            <button key={x.tag} type="button" aria-pressed={tag === x.tag} onClick={() => maj({ tag: tag === x.tag ? '' : x.tag })}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${tag === x.tag ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {x.tag} <span className={tag === x.tag ? 'text-white/70' : 'text-slate-400'}>{x.nb_posts}</span>{tag === x.tag && ' ✕'}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="mb-2 text-sm text-slate-500">{etat === 'ok' && t('forum.nb_questions', { count: total })}</div>

      {etat === 'chargement' && (
        <ul className="space-y-3" aria-busy="true" aria-label={t('commun.chargement')}>
          {[0, 1, 2].map((i) => <li key={i} className="card h-28 motion-safe:animate-pulse"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="mt-3 h-3 w-full rounded bg-slate-100" /><div className="mt-2 h-3 w-1/2 rounded bg-slate-100" /></li>)}
        </ul>
      )}
      {etat === 'erreur' && (
        <div className="card text-center"><p className="erreur">{erreur}</p><button type="button" onClick={charger} className="btn mt-3">{t('chat.reessayer')}</button></div>
      )}
      {etat === 'ok' && items.length === 0 && (
        <div className="card py-10 text-center">
          <p className="text-lg font-semibold text-slate-800">{filtres ? t('forum.aucune_filtre') : t('forum.aucune')}</p>
          <p className="mx-auto mt-1 max-w-sm text-slate-600">{filtres ? t('forum.aucune_filtre_texte') : t('forum.aucune_texte')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {filtres && <button type="button" onClick={() => { setRecherche(''); setParams({}, { replace: true }); }} className="btn-outline">{t('forum.effacer_filtres')}</button>}
            <Link to="/forum/poser" className="btn">{t('forum.poser')}</Link>
          </div>
        </div>
      )}
      {etat === 'ok' && items.length > 0 && <ul className="space-y-3">{items.map((q) => <li key={q.id}><Carte q={q} /></li>)}</ul>}
      {etat === 'ok' && page < pages && (
        <div className="mt-5 text-center"><button type="button" onClick={voirPlus} disabled={plus} className="btn-outline">{plus ? t('commun.chargement') : t('forum.voir_plus')}</button></div>
      )}
    </div>
  );
}
