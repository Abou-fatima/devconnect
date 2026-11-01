import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { aimerProjet, commenterProjet, commentairesProjet, detailProjet, retirerLikeProjet, supprimerProjet } from '../services/projets';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canalPrive } from '../lib/canaux';
import { STYLE_STATUT, hoteLien, idPersonne, lienSur } from '../lib/projets';
import { ilYA } from '../lib/notifications';
import Avatar from '../components/Avatar';
import Pays from '../components/Pays';
import RejoindreProjet from '../components/RejoindreProjet';
import CandidaturesPorteur from '../components/CandidaturesPorteur';
import EquipeProjet from '../components/EquipeProjet';
import TableauTaches from '../components/TableauTaches';

const Squelette = () => (
  <div aria-busy="true" aria-label="…" className="mx-auto max-w-4xl">
    <div className="shimmer h-4 w-24 rounded" /><div className="shimmer mt-4 h-8 w-2/3 rounded" /><div className="shimmer mt-3 h-4 w-1/3 rounded" />
    <div className="card mt-6 space-y-3"><div className="shimmer h-4 w-full rounded" /><div className="shimmer h-4 w-5/6 rounded" /><div className="shimmer h-4 w-2/3 rounded" /></div>
  </div>
);

export default function Projet() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projet, setProjet] = useState(null);
  const [etat, setEtat] = useState('chargement'); // chargement | ok | introuvable | erreur
  const [aime, setAime] = useState(false);
  const [nbLikes, setNbLikes] = useState(0);
  const [collab, setCollab] = useState({ maCandidature: null, estMembre: false, nbAttente: 0 });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [commentaires, setCommentaires] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const appliquer = ({ projet: p, mon_like, ma_candidature, est_membre, nb_candidatures_en_attente }) => {
    setProjet(p); setAime(Boolean(mon_like)); setNbLikes(p.nb_likes || 0);
    setCollab({ maCandidature: ma_candidature || null, estMembre: Boolean(est_membre), nbAttente: nb_candidatures_en_attente || 0 });
  };
  const charger = useCallback(() => {
    setEtat('chargement');
    detailProjet(id)
      .then((d) => { appliquer(d); setEtat('ok'); })
      .catch((e) => setEtat(e?.response?.status === 404 ? 'introuvable' : 'erreur'));
    commentairesProjet(id).then(setCommentaires).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  // Rafraîchit les données du projet sans remettre la page en chargement (après une candidature, une décision, un changement d'équipe).
  const rafraichir = useCallback(() => detailProjet(id).then(appliquer).catch(() => {}), [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const versConnexion = () => navigate('/connexion', { state: { from: `/projets/${id}` } });

  const basculerLike = async () => {
    if (!user) return versConnexion();
    if (occupe) return;
    setOccupe(true); setErreur('');
    const avant = { aime, nbLikes };
    setAime(!aime); setNbLikes((n) => Math.max(0, n + (aime ? -1 : 1))); // réaction immédiate, corrigée si le serveur refuse
    try {
      const r = aime ? await retirerLikeProjet(id) : await aimerProjet(id);
      if (typeof r.nb_likes === 'number') setNbLikes(r.nb_likes);
    } catch (e) { setAime(avant.aime); setNbLikes(avant.nbLikes); setErreur(messageErreur(e, t('commun.erreur'))); }
    finally { setOccupe(false); }
  };

  const partager = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* le navigateur refuse : rien à faire */ }
  };

  const supprimer = async () => {
    setSuppression(true); setErreur('');
    try { await supprimerProjet(id); navigate('/projets', { replace: true }); }
    catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); setSuppression(false); setConfirmer(false); }
  };

  const commenter = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true); setErreur('');
    try { const c = await commenterProjet(id, texte.trim()); setCommentaires((l) => [c, ...l]); setTexte(''); }
    catch (err) { setErreur(messageErreur(err, t('commun.erreur'))); } finally { setEnvoi(false); }
  };

  if (etat === 'chargement') return <Squelette />;
  if (etat === 'introuvable' || etat === 'erreur') return (
    <div className="card mx-auto max-w-md py-10 text-center">
      <p className="text-lg font-semibold">{etat === 'introuvable' ? t('projets.introuvable') : t('projets.erreur_chargement')}</p>
      {etat === 'introuvable' && <p className="mt-1 text-slate-600">{t('projets.introuvable_texte')}</p>}
      <div className="mt-4 flex justify-center gap-2">
        {etat === 'erreur' && <button type="button" onClick={charger} className="btn">{t('chat.reessayer')}</button>}
        <Link to="/projets" className="btn-outline">{t('projets.retour_projets')}</Link>
      </div>
    </div>
  );

  const porteur = projet.porteur_id && typeof projet.porteur_id === 'object' ? projet.porteur_id : null;
  const porteurId = idPersonne(porteur);
  const estProprietaire = Boolean(user && porteurId && String(user.id) === String(porteurId));
  const membres = (projet.membres || []).filter((m) => m.user_id && typeof m.user_id === 'object');
  const liens = [['github', projet.liens?.github], ['demo', projet.liens?.demo], ['video', projet.liens?.video]].filter(([, u]) => lienSur(u));
  const monRole = user ? membres.find((m) => String(idPersonne(m.user_id)) === String(user.id))?.role : null;
  const canalMessage = user && porteurId && !estProprietaire ? canalPrive(user.id, porteurId) : null;

  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-3 text-sm"><Link to="/projets" className="text-brand-light hover:underline">← {t('projets.titre')}</Link></nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE_STATUT[projet.statut] || STYLE_STATUT.idee}`}>{t(`projets.statut.${projet.statut}`, { defaultValue: projet.statut })}</span>
          {projet.categorie && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{projet.categorie}</span>}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{projet.titre}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          {porteur && (
            <span className="inline-flex items-center gap-2">
              <Avatar user={porteur} size={26} />
              <Link to={`/developpeurs/${porteurId}`} className="font-medium text-brand hover:underline">{porteur.pseudo}</Link>
              <Pays code={porteur.pays} />
            </span>
          )}
          <time dateTime={projet.created_at}>{ilYA(projet.created_at, i18n.language)}</time>
          <span>{t('projets.nb_vues', { count: projet.nb_vues ?? 0 })}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={basculerLike} aria-pressed={aime} disabled={occupe}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition active:scale-95 ${aime ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
            <span key={String(aime)} className={aime ? 'anim-pop' : ''} aria-hidden>{aime ? '♥' : '♡'}</span>
            <span>{aime ? t('projets.aime') : t('projets.aimer')}</span>
            <span key={nbLikes} className="anim-pop tabular-nums text-sm" aria-label={t('projets.nb_likes', { count: nbLikes })}>{nbLikes}</span>
          </button>
          <button type="button" onClick={partager} className="btn-outline">{copie ? `✓ ${t('projets.lien_copie')}` : t('projets.partager')}</button>
          {canalMessage && <Link to={`/messages/${encodeURIComponent(canalMessage)}`} className="btn-outline">✉ {t('projets.ecrire_porteur', { pseudo: porteur.pseudo })}</Link>}
          {estProprietaire && (
            <span className="ml-auto flex gap-2">
              <Link to={`/projets/${id}/modifier`} className="btn-outline">{t('projets.modifier')}</Link>
              <button type="button" onClick={() => setConfirmer(true)} className="btn-outline !text-red-700 hover:!bg-red-50">{t('projets.supprimer')}</button>
            </span>
          )}
        </div>
        {erreur && <div className="erreur mt-3" role="alert">{erreur}</div>}
        {confirmer && (
          <div className="anim-scale mt-3 rounded-lg border border-red-200 bg-red-50 p-4" role="alertdialog" aria-label={t('projets.supprimer_confirm_titre')}>
            <p className="font-semibold text-red-900">{t('projets.supprimer_confirm_titre')}</p>
            <p className="mt-1 text-sm text-red-800">{t('projets.supprimer_confirm_texte')}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={supprimer} disabled={suppression} className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50">{suppression ? t('commun.chargement') : t('projets.supprimer_oui')}</button>
              <button type="button" onClick={() => setConfirmer(false)} className="btn-outline">{t('commun.annuler')}</button>
            </div>
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {estProprietaire
            ? <CandidaturesPorteur projetId={id} moiId={user.id} onChange={rafraichir} />
            : <RejoindreProjet projetId={id} projet={projet} user={user} maCandidature={collab.maCandidature} estMembre={collab.estMembre} monRole={monRole} onChange={rafraichir} versConnexion={versConnexion} />}
          {(estProprietaire || collab.estMembre) && <TableauTaches projetId={id} equipe={[porteur, ...membres.map((m) => m.user_id)].filter(Boolean).map((u) => ({ id: String(idPersonne(u)), pseudo: u.pseudo, profil: u.profil }))} />}
          <section className="card">
            <h2 className="mb-2 text-lg font-bold">{t('projets.description')}</h2>
            {projet.description ? <p className="whitespace-pre-wrap break-words text-slate-700">{projet.description}</p> : <p className="text-slate-500">{t('projets.aucune_description')}</p>}
          </section>

          {(projet.stack?.length > 0) && (
            <section className="card">
              <h2 className="mb-2 text-lg font-bold">{t('projets.stack')}</h2>
              <div className="flex flex-wrap gap-2">{projet.stack.map((s) => <Link key={s} to={`/projets?stack=${encodeURIComponent(s)}`} className="rounded-full bg-brand/10 px-3 py-1 text-sm text-brand transition hover:bg-brand hover:text-white">{s}</Link>)}</div>
            </section>
          )}

          {projet.roles_recherches?.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-lg font-bold text-amber-900">🔎 {t('projets.roles_titre')}</h2>
              <p className="mt-1 text-sm text-amber-900/80">{t('projets.roles_texte')}</p>
              <div className="mt-3 flex flex-wrap gap-2">{projet.roles_recherches.map((r) => <span key={r} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-amber-200">{r}</span>)}</div>
            </section>
          )}

          <section className="card" aria-labelledby="titre-commentaires">
            <h2 id="titre-commentaires" className="mb-3 text-lg font-bold">{t('projets.commentaires')} <span className="font-normal text-slate-500">({commentaires.length})</span></h2>
            {user ? (
              <form onSubmit={commenter} className="mb-4">
                <label htmlFor="p-comm" className="sr-only">{t('projets.commentaire_placeholder')}</label>
                <textarea id="p-comm" className="input min-h-[4.5rem]" rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={5000} placeholder={t('projets.commentaire_placeholder')} />
                <div className="mt-2 text-right"><button className="btn" disabled={!texte.trim() || envoi}>{envoi ? t('commun.chargement') : t('projets.commenter')}</button></div>
              </form>
            ) : (
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><button type="button" onClick={versConnexion} className="font-medium text-brand-light underline">{t('nav.connexion')}</button> {t('projets.connexion_pour_commenter')}</p>
            )}
            {commentaires.length === 0 ? <p className="text-sm text-slate-500">{t('projets.aucun_commentaire')}</p> : (
              <ul className="stagger space-y-3">
                {commentaires.map((c) => (
                  <li key={c._id || c.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {c.auteur_id?._id ? <Link to={`/developpeurs/${c.auteur_id._id}`} className="font-medium text-brand hover:underline">{c.auteur_id.pseudo}</Link> : <span>{t('forum.compte_supprime')}</span>}
                      <time dateTime={c.created_at}>{ilYA(c.created_at, i18n.language)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">{c.contenu}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {liens.length > 0 && (
            <section className="card">
              <h2 className="mb-2 text-lg font-bold">{t('projets.liens')}</h2>
              <ul className="space-y-2">
                {liens.map(([k, u]) => (
                  <li key={k}><a href={u} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50">
                    <span className="font-medium">{t(`projets.lien_${k}`)}</span><span className="truncate text-slate-500">{hoteLien(u)} ↗</span>
                  </a></li>
                ))}
              </ul>
            </section>
          )}
          <EquipeProjet projetId={id} porteur={porteur} membres={membres} estProprietaire={estProprietaire} onChange={rafraichir} />
        </aside>
      </div>
    </article>
  );
}
