import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/forum';
import { messageErreur } from '../services/api';
import { ilYA } from '../lib/notifications';
import { effacerBrouillon, lireBrouillon, ecrireBrouillon } from '../lib/forum';
import RichText from '../components/RichText';
import Auteur from '../components/Auteur';
import Vote from '../components/Vote';
import EditeurTexte from '../components/EditeurTexte';

/* Boutons discrets sous un contenu : modifier, supprimer (avec confirmation), signaler. */
function Actions({ item, estAuteur, estModo, onModifier, onSupprime, onErreur }) {
  const { t } = useTranslation();
  const [etape, setEtape] = useState(null); // 'supprimer' | 'signaler' | null
  const [motif, setMotif] = useState('');
  const [fait, setFait] = useState(false);

  const supprimer = async () => {
    try { await api.supprimer(item.id); onSupprime(item); } catch (e) { onErreur(messageErreur(e, t('commun.erreur'))); setEtape(null); }
  };
  const signaler = async (e) => {
    e.preventDefault();
    try { await api.signaler(item.id, motif); setFait(true); setEtape(null); } catch (err) { onErreur(messageErreur(err, t('commun.erreur'))); }
  };
  const lien = 'rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800';

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {estAuteur && onModifier && <button type="button" className={lien} onClick={() => onModifier(item)}>{t('forum.modifier')}</button>}
      {(estAuteur || estModo) && etape !== 'supprimer' && <button type="button" className={lien} onClick={() => setEtape('supprimer')}>{t('forum.supprimer')}</button>}
      {etape === 'supprimer' && (
        <span className="flex items-center gap-1 text-xs">
          <span className="text-slate-600">{item.type === 'post' ? t('forum.confirmer_supprimer_question') : t('forum.confirmer_supprimer')}</span>
          <button type="button" onClick={supprimer} className="rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700">{t('forum.oui_supprimer')}</button>
          <button type="button" onClick={() => setEtape(null)} className={lien}>{t('commun.annuler')}</button>
        </span>
      )}
      {!estAuteur && !fait && etape !== 'signaler' && <button type="button" className={lien} onClick={() => setEtape('signaler')}>{t('forum.signaler')}</button>}
      {fait && <span className="text-xs text-emerald-700">✓ {t('forum.signale')}</span>}
      {etape === 'signaler' && (
        <form onSubmit={signaler} className="flex w-full flex-wrap items-center gap-1.5 pt-1">
          <label className="sr-only" htmlFor={`motif-${item.id}`}>{t('forum.motif')}</label>
          <input id={`motif-${item.id}`} className="input !py-1 text-sm sm:max-w-xs" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('forum.motif_placeholder')} minLength={3} maxLength={300} required />
          <button className="btn !py-1 text-sm" type="submit">{t('forum.envoyer_signalement')}</button>
          <button type="button" className={lien} onClick={() => setEtape(null)}>{t('commun.annuler')}</button>
        </form>
      )}
    </div>
  );
}

/* Commentaires courts sous une question ou une réponse. */
function Commentaires({ parent, liste, setListe, connecte, moi, estModo, onErreur, versConnexion }) {
  const { t, i18n } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const publier = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try {
      const c = await api.commenter(parent.id, texte);
      setListe([...liste, c]); setTexte(''); setOuvert(false);
    } catch (err) { onErreur(messageErreur(err, t('commun.erreur'))); } finally { setEnvoi(false); }
  };
  const retirer = (c) => setListe(liste.filter((x) => x.id !== c.id));

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      {liste.length > 0 && (
        <ul className="space-y-2">
          {liste.map((c) => (
            <li key={c.id} className="text-sm">
              <span className="text-slate-800"><RichText texte={c.contenu} moi={moi?.pseudo} /></span>
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                — <Link to={`/developpeurs/${c.auteur?.id}`} className="font-medium text-brand hover:underline">{c.auteur?.pseudo}</Link>
                <time dateTime={c.created_at}>{ilYA(c.created_at, i18n.language)}</time>
              </span>
              {(c.auteur?.id === moi?.id || estModo) && <button type="button" onClick={async () => { try { await api.supprimer(c.id); retirer(c); } catch (e) { onErreur(messageErreur(e, t('commun.erreur'))); } }} className="ml-2 text-xs text-slate-400 hover:text-red-600" aria-label={t('forum.supprimer')}>✕</button>}
            </li>
          ))}
        </ul>
      )}
      {!ouvert && <button type="button" onClick={() => (connecte ? setOuvert(true) : versConnexion())} className="mt-1 text-xs font-medium text-brand-light hover:underline">{t('forum.commenter')}</button>}
      {ouvert && (
        <form onSubmit={publier} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`com-${parent.id}`}>{t('forum.commenter')}</label>
          <input id={`com-${parent.id}`} className="input !py-1.5 text-sm" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={1000} placeholder={t('forum.commentaire_placeholder')} autoFocus />
          <div className="flex gap-2"><button className="btn !py-1.5 text-sm" type="submit" disabled={envoi || !texte.trim()}>{t('forum.publier')}</button><button type="button" className="btn-outline !py-1.5 text-sm" onClick={() => setOuvert(false)}>{t('commun.annuler')}</button></div>
        </form>
      )}
    </div>
  );
}

/* Un contenu (question ou réponse) avec sa colonne de vote, son texte modifiable et ses commentaires. */
function Bloc({ item, estQuestion, post, moi, estModo, connecte, commentaires, setCommentaires, onVote, onModifie, onSupprime, onAccepter, onErreur, versConnexion }) {
  const { t } = useTranslation();
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const estAuteur = Boolean(moi && item.auteur?.id === moi.id);
  const estAuteurQuestion = Boolean(moi && post.auteur?.id === moi.id);

  const sauver = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try { const maj = await api.modifier(item.id, { contenu: brouillon }); onModifie(maj); setEdition(false); }
    catch (err) { onErreur(messageErreur(err, t('commun.erreur'))); } finally { setEnvoi(false); }
  };

  return (
    <article className={`card !p-0 ${item.acceptee ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`} id={`c-${item.id}`}>
      {item.acceptee && <div className="rounded-t-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">✓ {t('forum.reponse_acceptee')}</div>}
      <div className="flex gap-3 p-4">
        <div className="flex flex-col items-center gap-2">
          <Vote nb={item.nb_votes} mon={item.mon_vote} onVoter={(v) => onVote(item, v)} desactive={estAuteur} />
          {!estQuestion && (estAuteurQuestion) && (
            <button type="button" onClick={() => onAccepter(item)} aria-pressed={item.acceptee}
              title={item.acceptee ? t('forum.retirer_acceptation') : t('forum.accepter')} aria-label={item.acceptee ? t('forum.retirer_acceptation') : t('forum.accepter')}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg transition-colors ${item.acceptee ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-300 hover:border-emerald-600 hover:text-emerald-600'}`}>✓</button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {edition ? (
            <form onSubmit={sauver} className="space-y-2">
              <EditeurTexte valeur={brouillon} onChange={setBrouillon} rows={8} aide={false} requis />
              <div className="flex gap-2"><button className="btn" type="submit" disabled={envoi || brouillon.trim().length < 2}>{t('commun.enregistrer')}</button><button type="button" className="btn-outline" onClick={() => setEdition(false)}>{t('commun.annuler')}</button></div>
            </form>
          ) : (
            <div className="text-[15px] leading-relaxed text-slate-800"><RichText texte={item.contenu} moi={moi?.pseudo} /></div>
          )}
          {item.audio_url && <audio controls preload="none" src={item.audio_url} className="mt-2 h-9 max-w-full" />}
          {item.transcription && <p className="mt-1 text-sm italic text-slate-500">{item.transcription}</p>}
          {estQuestion && item.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.map((x) => <Link key={x} to={`/forum?tag=${encodeURIComponent(x)}`} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-200">{x}</Link>)}</div>
          )}
          <div className="mt-3 flex justify-end"><Auteur auteur={item.auteur} date={item.created_at} modifie={Boolean(item.modifie_le)} /></div>
          <Actions item={item} estAuteur={estAuteur} estModo={estModo} onModifier={() => { setBrouillon(item.contenu); setEdition(true); }} onSupprime={onSupprime} onErreur={onErreur} />
          <Commentaires parent={item} liste={commentaires} setListe={setCommentaires} connecte={connecte} moi={moi} estModo={estModo} onErreur={onErreur} versConnexion={versConnexion} />
        </div>
      </div>
    </article>
  );
}

export default function Question() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [etat, setEtat] = useState('chargement'); // chargement | ok | introuvable | erreur
  const [erreur, setErreur] = useState('');
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const cleBrouillon = `devconnect:reponse:${id}`;

  const charger = useCallback(() => {
    setEtat('chargement');
    api.detailQuestion(id)
      .then((d) => { setData(d); setEtat('ok'); })
      .catch((e) => setEtat(e?.response?.status === 404 || e?.response?.status === 400 ? 'introuvable' : 'erreur'));
  }, [id]);
  useEffect(() => { charger(); window.scrollTo({ top: 0 }); }, [charger]);
  useEffect(() => { const b = lireBrouillon(cleBrouillon); if (typeof b === 'string') setBrouillon(b); }, [cleBrouillon]);
  useEffect(() => { if (brouillon) ecrireBrouillon(cleBrouillon, brouillon); }, [brouillon, cleBrouillon]);

  const connecte = Boolean(user);
  const estModo = user && ['admin', 'moderateur'].includes(user.role);
  const versConnexion = () => navigate('/connexion', { state: { from: location.pathname } });
  const signaleErreur = (m) => { setErreur(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (etat === 'chargement') return <div className="mx-auto max-w-3xl space-y-3 motion-safe:animate-pulse" aria-busy="true"><div className="h-8 w-3/4 rounded bg-slate-200" /><div className="card h-40" /><div className="card h-28" /></div>;
  if (etat === 'introuvable') return <div className="mx-auto max-w-md py-12 text-center"><h1 className="text-xl font-bold">{t('forum.introuvable')}</h1><p className="mt-1 text-slate-600">{t('forum.introuvable_texte')}</p><Link to="/forum" className="btn mt-4">{t('forum.retour')}</Link></div>;
  if (etat === 'erreur') return <div className="mx-auto max-w-md py-12 text-center"><p className="erreur">{t('commun.erreur')}</p><button type="button" onClick={charger} className="btn mt-3">{t('chat.reessayer')}</button></div>;

  const { post, reponses, commentaires } = data;
  const resolue = post.statut === 'resolu';
  const maj = (fn) => setData((d) => fn(d));

  // Vote : un 2e clic sur la même flèche retire le vote. Le serveur renvoie le total à jour.
  const voter = async (item, valeur) => {
    if (!connecte) return versConnexion();
    try {
      const r = await api.voter(item.id, valeur);
      const applique = (x) => (x.id === item.id ? { ...x, nb_votes: r.nb_votes, mon_vote: r.mon_vote } : x);
      maj((d) => ({ ...d, post: applique(d.post), reponses: d.reponses.map(applique) }));
    } catch (e) { signaleErreur(messageErreur(e, t('commun.erreur'))); }
  };

  const accepter = async (rep) => {
    try {
      if (rep.acceptee) await api.retirerAcceptation(rep.id); else await api.accepter(rep.id);
      charger(); // l'ordre des réponses et le statut changent : on recharge
    } catch (e) { signaleErreur(messageErreur(e, t('commun.erreur'))); }
  };

  const modifie = (maj2) => maj((d) => ({
    ...d,
    post: d.post.id === maj2.id ? { ...d.post, contenu: maj2.contenu, modifie_le: maj2.modifie_le } : d.post,
    reponses: d.reponses.map((r) => (r.id === maj2.id ? { ...r, contenu: maj2.contenu, modifie_le: maj2.modifie_le } : r))
  }));

  const supprime = (item) => {
    if (item.type === 'post') navigate('/forum', { replace: true });
    else maj((d) => ({ ...d, reponses: d.reponses.filter((r) => r.id !== item.id), post: { ...d.post, nb_reponses: Math.max(0, d.post.nb_reponses - 1) } }));
  };

  const publier = async (e) => {
    e.preventDefault();
    setErreur(''); setEnvoi(true);
    try {
      const rep = await api.repondre(post.id, brouillon);
      maj((d) => ({ ...d, reponses: [...d.reponses, { ...rep, commentaires: [] }], post: { ...d.post, nb_reponses: d.post.nb_reponses + 1 } }));
      setBrouillon(''); effacerBrouillon(cleBrouillon);
    } catch (err) { setErreur(messageErreur(err, t('commun.erreur'))); } finally { setEnvoi(false); }
  };

  const suivre = async () => {
    if (!connecte) return versConnexion();
    try { if (post.suivi) await api.nePlusSuivre(post.id); else await api.suivre(post.id); maj((d) => ({ ...d, post: { ...d.post, suivi: !d.post.suivi } })); } catch (e) { signaleErreur(messageErreur(e, t('commun.erreur'))); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-2 text-sm"><Link to="/forum" className="text-brand-light hover:underline">← {t('forum.titre')}</Link></nav>
      <h1 className="text-2xl font-bold leading-snug">{post.titre}</h1>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        {resolue && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✓ {t('forum.resolue')}</span>}
        <span>{t('forum.pose_il_y_a', { quand: ilYA(post.created_at, i18n.language) })}</span>
        <span>{t('forum.nb_vues', { count: post.nb_vues })}</span>
        <button type="button" onClick={suivre} aria-pressed={Boolean(post.suivi)} className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs hover:bg-slate-100">{post.suivi ? `🔔 ${t('forum.suivi')}` : `🔕 ${t('forum.suivre')}`}</button>
      </div>

      {erreur && <div className="erreur mb-3" role="alert">{erreur}</div>}

      <Bloc item={post} estQuestion post={post} moi={user} estModo={estModo} connecte={connecte} commentaires={commentaires} setCommentaires={(l) => maj((d) => ({ ...d, commentaires: l }))}
        onVote={voter} onModifie={modifie} onSupprime={supprime} onErreur={signaleErreur} versConnexion={versConnexion} />

      <h2 className="mb-3 mt-8 text-xl font-bold">{t('forum.nb_reponses', { count: reponses.length })}</h2>
      {reponses.length === 0 && (
        <div className="card text-center"><p className="font-medium text-slate-800">{t('forum.sans_reponse')}</p><p className="mt-1 text-sm text-slate-600">{t('forum.sans_reponse_texte')}</p></div>
      )}
      <div className="stagger space-y-3">
        {reponses.map((r) => (
          <Bloc key={r.id} item={r} post={post} moi={user} estModo={estModo} connecte={connecte} commentaires={r.commentaires}
            setCommentaires={(l) => maj((d) => ({ ...d, reponses: d.reponses.map((x) => (x.id === r.id ? { ...x, commentaires: l } : x)) }))}
            onVote={voter} onModifie={modifie} onSupprime={supprime} onAccepter={accepter} onErreur={signaleErreur} versConnexion={versConnexion} />
        ))}
      </div>

      <section className="mt-8" aria-labelledby="ta-reponse">
        <h2 id="ta-reponse" className="mb-2 text-xl font-bold">{t('forum.ta_reponse')}</h2>
        {connecte ? (
          <form onSubmit={publier} className="card space-y-3">
            <EditeurTexte valeur={brouillon} onChange={setBrouillon} rows={6} placeholder={t('forum.reponse_placeholder')} requis />
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn" type="submit" disabled={envoi || brouillon.trim().length < 2}>{envoi ? t('commun.chargement') : t('forum.publier_reponse')}</button>
              <span className="text-xs text-slate-500">{t('forum.brouillon_auto')}</span>
            </div>
          </form>
        ) : (
          <div className="card text-center">
            <p className="text-slate-700">{t('forum.connexion_pour_repondre')}</p>
            <div className="mt-3 flex justify-center gap-2"><button type="button" onClick={versConnexion} className="btn">{t('nav.connexion')}</button><Link to="/inscription" className="btn-outline">{t('nav.inscription')}</Link></div>
          </div>
        )}
      </section>
    </div>
  );
}
