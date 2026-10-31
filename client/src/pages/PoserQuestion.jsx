import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { creerQuestion, listerQuestions, listerTags } from '../services/forum';
import { messageErreur } from '../services/api';
import { effacerBrouillon, ecrireBrouillon, lireBrouillon, motsCles } from '../lib/forum';
import useDebounce from '../hooks/useDebounce';
import EditeurTexte from '../components/EditeurTexte';

const CLE = 'devconnect:brouillon-question';
const MAX_TAGS = 5;
const nettoyerTag = (s) => String(s || '').trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').replace(/[^a-z0-9.+#-]/g, '').slice(0, 30);

export default function PoserQuestion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [tags, setTags] = useState([]);
  const [saisieTag, setSaisieTag] = useState('');
  const [propositions, setPropositions] = useState([]);
  const [similaires, setSimilaires] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [restaure, setRestaure] = useState(false);
  const pret = useRef(false);

  // Brouillon : on ne perd jamais un texte long si la connexion coupe ou si on quitte la page.
  useEffect(() => {
    const b = lireBrouillon(CLE);
    if (b && (b.titre || b.contenu)) { setTitre(b.titre || ''); setContenu(b.contenu || ''); setTags(b.tags || []); setRestaure(true); }
    pret.current = true;
  }, []);
  useEffect(() => { if (pret.current && (titre || contenu || tags.length)) ecrireBrouillon(CLE, { titre, contenu, tags }); }, [titre, contenu, tags]);

  // Questions proches du titre : évite les doublons et peut répondre tout de suite.
  const titreDiff = useDebounce(titre, 500);
  useEffect(() => {
    const q = motsCles(titreDiff);
    if (titreDiff.trim().length < 8 || !q) { setSimilaires([]); return undefined; }
    let actif = true;
    listerQuestions({ q: q.split(' ').sort((x, y) => y.length - x.length)[0], tri: 'votes', limit: 3 }) // le mot le plus long est le plus précis
      .then((d) => { if (actif) setSimilaires(d.data); })
      .catch(() => {});
    return () => { actif = false; };
  }, [titreDiff]);

  // Suggestions de tags pendant la saisie (ou les plus utilisés si le champ est vide).
  const saisieDiff = useDebounce(saisieTag, 250);
  useEffect(() => {
    let actif = true;
    listerTags({ q: nettoyerTag(saisieDiff) || undefined, limit: 8 }).then((l) => { if (actif) setPropositions(l.map((x) => x.tag)); }).catch(() => {});
    return () => { actif = false; };
  }, [saisieDiff]);

  const ajouterTag = (brut) => {
    const tag = nettoyerTag(brut);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) setTags([...tags, tag]);
    setSaisieTag('');
  };
  const surToucheTag = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { if (saisieTag.trim()) { e.preventDefault(); ajouterTag(saisieTag); } else if (e.key === 'Enter') e.preventDefault(); }
    else if (e.key === 'Backspace' && !saisieTag && tags.length) setTags(tags.slice(0, -1));
  };

  const valide = titre.trim().length >= 5 && contenu.trim().length >= 10;
  const publier = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setErreur(''); setEnvoi(true);
    try {
      const post = await creerQuestion({ titre: titre.trim(), contenu: contenu.trim(), tags });
      effacerBrouillon(CLE);
      navigate(`/forum/questions/${post.id}`, { replace: true });
    } catch (err) { setErreur(messageErreur(err, t('commun.erreur'))); setEnvoi(false); }
  };

  const recommencer = () => { effacerBrouillon(CLE); setTitre(''); setContenu(''); setTags([]); setRestaure(false); };
  const suggestions = propositions.filter((p) => !tags.includes(p)).slice(0, 6);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_18rem]">
      <div>
        <nav className="mb-2 text-sm"><Link to="/forum" className="text-brand-light hover:underline">← {t('forum.titre')}</Link></nav>
        <h1 className="text-2xl font-bold">{t('forum.poser_titre')}</h1>
        <p className="mb-4 text-slate-600">{t('forum.poser_intro')}</p>

        {restaure && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            <span>{t('forum.brouillon_restaure')}</span>
            <button type="button" onClick={recommencer} className="font-medium underline">{t('forum.brouillon_effacer')}</button>
          </div>
        )}
        {erreur && <div className="erreur mb-3" role="alert">{erreur}</div>}

        <form onSubmit={publier} className="card space-y-5">
          <div>
            <label htmlFor="q-titre" className="label">{t('forum.champ_titre')}</label>
            <input id="q-titre" className="input" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={150} required minLength={5} placeholder={t('forum.champ_titre_placeholder')} aria-describedby="q-titre-aide" />
            <div id="q-titre-aide" className="mt-1 flex justify-between text-xs text-slate-500"><span>{t('forum.champ_titre_aide')}</span><span>{titre.length} / 150</span></div>
            {similaires.length > 0 && (
              <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3" role="region" aria-label={t('forum.similaires')}>
                <p className="text-sm font-medium text-sky-900">{t('forum.similaires')}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {similaires.map((s) => <li key={s.id}><Link to={`/forum/questions/${s.id}`} target="_blank" rel="noopener noreferrer" className="text-sky-800 underline">{s.titre}</Link> <span className="text-slate-500">({t('forum.nb_reponses', { count: s.nb_reponses })}{s.statut === 'resolu' ? ` · ${t('forum.resolue')}` : ''})</span></li>)}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="q-contenu" className="label">{t('forum.champ_details')}</label>
            <EditeurTexte id="q-contenu" valeur={contenu} onChange={setContenu} rows={10} placeholder={t('forum.champ_details_placeholder')} requis />
            <p className="mt-1 text-xs text-slate-500">{t('forum.champ_details_aide')}</p>
          </div>

          <div>
            <label htmlFor="q-tag" className="label">{t('forum.champ_tags')} <span className="font-normal text-slate-500">({tags.length}/{MAX_TAGS})</span></label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-light focus-within:ring-2 focus-within:ring-brand-light/30">
              {tags.map((x) => <span key={x} className="inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 text-sm text-brand">{x}<button type="button" onClick={() => setTags(tags.filter((y) => y !== x))} aria-label={t('forum.retirer_tag', { tag: x })} className="text-brand/70 hover:text-brand">✕</button></span>)}
              {tags.length < MAX_TAGS && <input id="q-tag" className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none" value={saisieTag} onChange={(e) => setSaisieTag(e.target.value)} onKeyDown={surToucheTag} onBlur={() => saisieTag.trim() && ajouterTag(saisieTag)} placeholder={tags.length ? '' : t('forum.champ_tags_placeholder')} maxLength={30} />}
            </div>
            {suggestions.length > 0 && tags.length < MAX_TAGS && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs"><span className="text-slate-500">{t('forum.tags_suggeres')}</span>
                {suggestions.map((s) => <button key={s} type="button" onClick={() => ajouterTag(s)} className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200">+ {s}</button>)}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">{t('forum.champ_tags_aide')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" type="submit" disabled={!valide || envoi}>{envoi ? t('commun.chargement') : t('forum.publier_question')}</button>
            <Link to="/forum" className="btn-outline">{t('commun.annuler')}</Link>
            {!valide && <span className="text-xs text-slate-500">{t('forum.completer')}</span>}
          </div>
        </form>
      </div>

      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 text-sm lg:sticky lg:top-20" aria-label={t('forum.conseils_titre')}>
        <h2 className="font-bold">{t('forum.conseils_titre')}</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-700">
          <li>{t('forum.conseil_1')}</li>
          <li>{t('forum.conseil_2')}</li>
          <li>{t('forum.conseil_3')}</li>
          <li>{t('forum.conseil_4')}</li>
        </ol>
      </aside>
    </div>
  );
}
