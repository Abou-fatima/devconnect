import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { classementDevs, classementPays, listerQuestions, listerTags } from '../services/forum';
import { searchUsers } from '../services/users';
import { listerProjets } from '../services/projets';
import { ilYA } from '../lib/notifications';
import useCompteur from '../hooks/useCompteur';
import Avatar from '../components/Avatar';
import Pays from '../components/Pays';
import Reveal from '../components/Reveal';

const ETAPES = [
  { cle: 'question', icone: '💬', lien: '/forum/poser' },
  { cle: 'projet', icone: '🚀', lien: '/developpeurs' },
  { cle: 'equipe', icone: '🤝', lien: '/developpeurs' },
  { cle: 'reputation', icone: '⭐', lien: '/classement' }
];

function Chiffre({ valeur, libelle }) {
  const v = useCompteur(valeur);
  return (
    <div className="rounded-xl bg-white/10 px-3 py-3 text-center ring-1 ring-white/15">
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{typeof valeur === 'number' ? v.toLocaleString() : '–'}</div>
      <div className="text-xs text-white/80 sm:text-sm">{libelle}</div>
    </div>
  );
}

function Bloc({ titre, lien, lienTexte, children }) {
  return (
    <Reveal as="section" className="card">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{titre}</h2>
        {lien && <Link to={lien} className="shrink-0 whitespace-nowrap text-sm text-brand-light hover:underline">{lienTexte} →</Link>}
      </div>
      {children}
    </Reveal>
  );
}

const Squelette = ({ n = 3 }) => (
  <ul className="space-y-3" aria-busy="true">{Array.from({ length: n }, (_, i) => <li key={i} className="shimmer h-10 rounded" />)}</ul>
);
const Vide = ({ texte, lien, action }) => (
  <div className="py-4 text-center text-sm text-slate-500"><p>{texte}</p>{lien && <Link to={lien} className="btn mt-3">{action}</Link>}</div>
);

export default function Accueil() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [d, setD] = useState(null); // null = chargement

  useEffect(() => {
    let actif = true;
    const val = (p) => p.status === 'fulfilled' ? p.value : null;
    Promise.allSettled([
      searchUsers({ limit: 1 }), listerQuestions({ tri: 'recent', limit: 5 }), listerProjets({ limit: 3 }),
      classementDevs({ limit: 5 }), classementPays(), listerTags({ limit: 12 })
    ]).then(([u, q, p, c, pa, tg]) => {
      if (!actif) return;
      setD({ devs: val(u), questions: val(q), projets: val(p), classement: val(c), pays: val(pa), tags: val(tg) });
    });
    return () => { actif = false; };
  }, []);

  const chargement = d === null;
  const stats = [
    { valeur: d?.devs?.total, libelle: t('accueil.stat_devs') },
    { valeur: d?.questions?.total, libelle: t('accueil.stat_questions') },
    { valeur: d?.projets?.total, libelle: t('accueil.stat_projets') },
    { valeur: d?.pays?.length, libelle: t('accueil.stat_pays') }
  ];

  return (
    <div className="space-y-8">
      {/* Bandeau d'accueil */}
      <section className="anim-scale relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-light px-5 py-8 text-white sm:px-10 sm:py-12">
        <span className="blob -right-10 -top-16 h-64 w-64 bg-accent" aria-hidden />
        <span className="blob -bottom-20 left-1/3 h-56 w-56 bg-sky-400 [animation-delay:-4s]" aria-hidden />
        <div className="stagger relative">
        <p className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide ring-1 ring-white/20">{t('accueil.badge')}</p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{user ? t('accueil.bonjour', { pseudo: user.pseudo }) : t('accueil.titre')}</h1>
        <p className="mt-3 max-w-xl text-white/85 sm:text-lg">{user ? t('accueil.texte_connecte') : t('accueil.texte')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <>
              <Link to="/forum/poser" className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 font-semibold text-slate-900 transition hover:brightness-95">{t('accueil.cta_poser')}</Link>
              <Link to="/forum" className="inline-flex items-center justify-center rounded-lg bg-white/10 px-5 py-2.5 font-medium ring-1 ring-white/30 transition hover:bg-white/20">{t('accueil.cta_forum')}</Link>
            </>
          ) : (
            <>
              <Link to="/inscription" className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 font-semibold text-slate-900 transition hover:brightness-95">{t('accueil.cta_inscription')}</Link>
              <Link to="/developpeurs" className="inline-flex items-center justify-center rounded-lg bg-white/10 px-5 py-2.5 font-medium ring-1 ring-white/30 transition hover:bg-white/20">{t('accueil.cta_devs')}</Link>
            </>
          )}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t('accueil.stats_titre')}>
          {stats.map((s) => <Chiffre key={s.libelle} {...s} />)}
        </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <Reveal as="section">
        <h2 className="text-xl font-bold">{t('accueil.comment_titre')}</h2>
        <p className="text-slate-600">{t('accueil.comment_texte')}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((e, i) => (
            <li key={e.cle}><Reveal delai={i * 0.08} className="h-full">
              <Link to={e.lien} className="card lift group block h-full">
                <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-lg transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6" aria-hidden>{e.icone}</span><span className="text-xs font-semibold text-slate-400">0{i + 1}</span></div>
                <h3 className="mt-2 font-semibold">{t(`accueil.etape.${e.cle}.titre`)}</h3>
                <p className="mt-1 text-sm text-slate-600">{t(`accueil.etape.${e.cle}.texte`)}</p>
              </Link>
            </Reveal></li>
          ))}
        </ol>
      </Reveal>

      {/* Questions récentes + meilleurs développeurs */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Bloc titre={t('accueil.questions_titre')} lien="/forum" lienTexte={t('accueil.tout_voir')}>
            {chargement ? <Squelette n={4} /> : !d.questions?.data?.length ? <Vide texte={t('accueil.questions_vide')} lien="/forum/poser" action={t('forum.poser')} /> : (
              <ul className="stagger divide-y divide-slate-100">
                {d.questions.data.map((q) => (
                  <li key={q.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link to={`/forum/questions/${q.id}`} className="font-medium text-brand hover:underline">{q.titre}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {q.statut === 'resolu' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">✓ {t('forum.resolue')}</span>}
                      <span>{t('forum.nb_reponses', { count: q.nb_reponses })}</span>
                      {q.auteur && <span>{q.auteur.pseudo}</span>}
                      <time dateTime={q.created_at}>{ilYA(q.created_at, i18n.language)}</time>
                      {q.tags.slice(0, 3).map((x) => <span key={x} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{x}</span>)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Bloc>
        </div>
        <div className="lg:col-span-2">
          <Bloc titre={t('accueil.top_titre')} lien="/classement" lienTexte={t('accueil.classement_complet')}>
            {chargement ? <Squelette n={5} /> : !d.classement?.data?.length ? <Vide texte={t('accueil.top_vide')} /> : (
              <ol className="stagger space-y-2">
                {d.classement.data.map((u) => (
                  <li key={u.id}>
                    <Link to={`/developpeurs/${u.id}`} className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-50">
                      <span className="w-5 text-center text-sm font-bold text-slate-400">{u.rang}</span>
                      <Avatar user={u} size={32} />
                      <span className="min-w-0 flex-1 truncate font-medium">{u.pseudo}</span>
                      <Pays code={u.pays} />
                      <span className="text-sm text-slate-600">⭐ {u.reputation ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Bloc>
        </div>
      </div>

      {/* Projets récents */}
      <Bloc titre={t('accueil.projets_titre')} lien="/developpeurs" lienTexte={t('accueil.tout_voir')}>
        {chargement ? <Squelette n={2} /> : !d.projets?.data?.length ? <Vide texte={t('accueil.projets_vide')} /> : (
          <ul className="stagger grid gap-3 md:grid-cols-3">
            {d.projets.data.map((p) => (
              <li key={p._id} className="lift rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{p.titre}</h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{t(`accueil.projet_statut.${p.statut}`, { defaultValue: p.statut })}</span>
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1">{(p.stack || []).slice(0, 4).map((s) => <span key={s} className="rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand">{s}</span>)}</div>
                {p.roles_recherches?.length > 0 && <p className="mt-2 text-xs text-amber-800">🔎 {t('accueil.cherche')} : {p.roles_recherches.slice(0, 3).join(', ')}</p>}
                {p.porteur_id?._id && <p className="mt-2 text-xs text-slate-500">{t('accueil.par')} <Link to={`/developpeurs/${p.porteur_id._id}`} className="text-brand hover:underline">{p.porteur_id.pseudo}</Link></p>}
              </li>
            ))}
          </ul>
        )}
      </Bloc>

      {/* Sujets populaires + pays */}
      <div className="grid gap-4 md:grid-cols-2">
        <Bloc titre={t('accueil.tags_titre')} lien="/forum" lienTexte={t('accueil.tout_voir')}>
          {chargement ? <Squelette n={2} /> : !d.tags?.length ? <Vide texte={t('accueil.tags_vide')} /> : (
            <div className="flex flex-wrap gap-2">{d.tags.map((x) => <Link key={x.tag} to={`/forum?tag=${encodeURIComponent(x.tag)}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition hover:bg-brand hover:text-white">{x.tag} <span className="opacity-60">{x.nb_posts}</span></Link>)}</div>
          )}
        </Bloc>
        <Bloc titre={t('accueil.pays_titre')} lien="/classement" lienTexte={t('accueil.classement_complet')}>
          {chargement ? <Squelette n={2} /> : !d.pays?.length ? <Vide texte={t('accueil.pays_vide')} /> : (
            <ul className="flex flex-wrap gap-2">{d.pays.slice(0, 10).map((p) => <li key={p.pays} className="rounded-full bg-slate-100 px-3 py-1 text-sm"><Pays code={p.pays} avecNom /> <span className="text-slate-500">· {p.nb_devs}</span></li>)}</ul>
          )}
        </Bloc>
      </div>

      {/* Appel final */}
      {!user && (
        <Reveal as="section" className="rounded-2xl bg-slate-900 px-5 py-8 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold">{t('accueil.final_titre')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">{t('accueil.final_texte')}</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/inscription" className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 font-semibold text-slate-900 transition hover:brightness-95">{t('accueil.cta_inscription')}</Link>
            <Link to="/connexion" className="inline-flex items-center justify-center rounded-lg bg-white/10 px-5 py-2.5 font-medium ring-1 ring-white/30 transition hover:bg-white/20">{t('nav.connexion')}</Link>
          </div>
        </Reveal>
      )}
    </div>
  );
}
