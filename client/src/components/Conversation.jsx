import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { historique } from '../services/chat';
import { getUser } from '../services/users';
import { lireCanal, majuscule, ajouterRecent, canalPrive } from '../lib/canaux';
import { messageErreur } from '../services/api';
import RichText from './RichText';
import LecteurVocal from './LecteurVocal';
import BarreVocale from './BarreVocale';
import useEnregistreurVocal, { DUREE_MAX, vocalPossible } from '../hooks/useEnregistreurVocal';
import { envoyerVocal } from '../services/audio';
import { envoyerImageChat } from '../services/imagesChat';
import { preparerImage } from '../lib/fichiers';
import ImageMessage from './ImageMessage';
import { getSalon, rejoindreSalon } from '../services/salons';
import SalonInfos from './SalonInfos';
import Icone from './Icone';
import { BarreReactions, PastillesReactions, CitationBloc, apercuCitation } from './ReactionsBarre';

const COULEURS = ['#1d4ed8', '#047857', '#b45309', '#7e22ce', '#be123c', '#0e7490'];
const couleurPseudo = (p = '') => COULEURS[[...p].reduce((a, c) => a + c.charCodeAt(0), 0) % COULEURS.length];
const MAX_CAR = 2000;
const GROUPE_MS = 5 * 60 * 1000;
const APPUI_LONG_MS = 450;
const APERCU_CITATION = 80;

const memeJour = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const heure = (d, lang) => new Date(d).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

export default function Conversation({ canal, onRetour, onNom, onChange }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { socket, connecte } = useRealtime();
  const infos = useMemo(() => lireCanal(canal), [canal]);

  const [messages, setMessages] = useState([]);
  const [etat, setEtat] = useState('chargement'); // chargement | ok | erreur
  const [page, setPage] = useState(1);
  const [aSuivre, setASuivre] = useState(false);
  const [chargePlus, setChargePlus] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [erreurSalon, setErreurSalon] = useState('');
  const [ecrivent, setEcrivent] = useState({});
  const [autre, setAutre] = useState(null); // interlocuteur d'une conversation privée
  const [salon, setSalon] = useState(null); // salon créé par un utilisateur : nom, nombre de membres, rôle
  const [infosOuvert, setInfosOuvert] = useState(false);
  const [choixId, setChoixId] = useState(null); // message dont la barre d'emojis est ouverte
  const appuiLong = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Réponse en cours : { id, externe, pseudo, type, texte }. Peut venir d'un « Répondre en privé » (état de navigation).
  const [citation, setCitation] = useState(() => location.state?.citation || null);
  const [surligne, setSurligne] = useState(null); // message d'origine mis en évidence après un clic sur sa citation
  useEffect(() => { if (location.state?.citation) navigate(location.pathname, { replace: true, state: null }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [rejoint, setRejoint] = useState({ occupe: false, erreur: '' });

  const defil = useRef(null);
  const suivreBas = useRef(true);
  const hauteurAvant = useRef(null);
  const frappe = useRef({ actif: false, minuteur: null });
  const saisie = useRef(null);

  const autreId = infos?.type === 'prive' ? infos.ids.find((i) => i !== user?.id) : null;

  // Interlocuteur d'une conversation privée.
  useEffect(() => {
    setAutre(null);
    if (!autreId) return;
    let actif = true;
    getUser(autreId).then((d) => {
      if (!actif) return;
      const u = d.utilisateur || d;
      setAutre(u);
      ajouterRecent(canal, u.pseudo);
      onNom?.(canal, u.pseudo);
    }).catch(() => {});
    return () => { actif = false; };
  }, [autreId, canal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Salon créé par un utilisateur : on récupère son nom (et on sait si on en est membre).
  const salonId = infos?.type === 'salon' ? infos.valeur : null;
  useEffect(() => {
    setSalon(null); setInfosOuvert(false);
    if (!salonId) return undefined;
    let actif = true;
    getSalon(salonId).then((d) => { if (actif) setSalon(d.salon); }).catch(() => {});
    return () => { actif = false; };
  }, [salonId]);

  // Historique (page 1) à chaque changement de salon.
  const chargerHistorique = useCallback(() => {
    if (!infos) return;
    setEtat('chargement');
    historique(canal, 1)
      .then((d) => {
        // On garde les messages reçus en direct pendant le chargement, sans doublon.
        setMessages((prev) => [...d.messages, ...prev.filter((p) => !d.messages.some((m) => m.id === p.id))]
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        setASuivre(d.a_suivre); setPage(1); setEtat('ok'); suivreBas.current = true;
      })
      .catch((e) => { setErreurSalon(messageErreur(e, t('commun.erreur'))); setEtat('erreur'); });
  }, [canal, infos, t]);

  useEffect(() => {
    setMessages([]); setTexte(''); setErreurEnvoi(''); setErreurSalon(''); setEcrivent({});
    chargerHistorique();
    if (infos && infos.type !== 'prive') ajouterRecent(canal);
  }, [canal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rejoindre le salon en temps réel (et à chaque reconnexion).
  useEffect(() => {
    if (!socket || !connecte || !infos) return undefined;
    socket.emit('join_canal', { canal }, (ack) => { if (ack && ack.ok === false) setErreurSalon(ack.erreur || t('commun.erreur')); });
    return () => { socket.emit('leave_canal', { canal }); };
  }, [socket, connecte, canal, infos, t]);

  const ajouter = useCallback((m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  // Messages et « est en train d'écrire » reçus.
  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (m) => {
      if (m.canal !== canal) return;
      if (m.auteur?.id === user?.id) suivreBas.current = true;
      ajouter(m);
      if (m.auteur) setEcrivent((e) => { const { [m.auteur.id]: _, ...reste } = e; return reste; });
    };
    const onTyping = (d) => {
      if (d.canal !== canal || d.user_id === user?.id) return;
      setEcrivent((e) => {
        if (!d.actif) { const { [d.user_id]: _, ...reste } = e; return reste; }
        return { ...e, [d.user_id]: { pseudo: d.pseudo, at: Date.now(), mode: d.mode === 'vocal' ? 'vocal' : 'texte' } };
      });
    };
    // Réactions : le serveur renvoie la liste complète du message, on la remplace.
    const onReaction = (d) => {
      if (d.canal !== canal) return;
      setMessages((prev) => prev.map((x) => (x.id === d.message_id ? { ...x, reactions: d.reactions } : x)));
    };
    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('reaction', onReaction);
    return () => { socket.off('message', onMessage); socket.off('typing', onTyping); socket.off('reaction', onReaction); };
  }, [socket, canal, user?.id, ajouter]);

  // Ce qui part avec le message : identifiant du message cité (même canal) ou extrait copié (réponse en privé).
  const chargeReponse = () => (!citation ? {} : citation.externe
    ? { citation: { pseudo: citation.pseudo, type: citation.type, texte: citation.texte } }
    : { reponse_a: citation.id });

  const apercuDe = (m) => (m.contenu ? { type: 'texte', texte: m.contenu.length > APERCU_CITATION ? `${m.contenu.slice(0, APERCU_CITATION - 1)}…` : m.contenu } : m.image_url ? { type: 'image', texte: '' } : { type: 'audio', texte: '' });

  const repondreA = (m) => {
    setChoixId(null);
    if (!m.auteur) return;
    setCitation({ id: m.id, externe: false, pseudo: m.auteur.pseudo, ...apercuDe(m) });
    saisie.current?.focus();
  };

  const repondreEnPrive = (m) => {
    setChoixId(null);
    const lien = m.auteur && canalPrive(user?.id, m.auteur.id);
    if (!lien) return;
    navigate(`/messages/${encodeURIComponent(lien)}`, { state: { citation: { id: null, externe: true, pseudo: m.auteur.pseudo, ...apercuDe(m) } } });
  };

  const allerAuMessage = (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSurligne(id);
    setTimeout(() => setSurligne((s) => (s === id ? null : s)), 1600);
  };

  // Réagir (ou retirer / changer) : la même touche deux fois retire ; le résultat revient par l'événement « reaction ».
  const reagir = useCallback((messageId, emoji) => {
    setChoixId(null);
    if (!socket || !connecte) return;
    socket.timeout(8000).emit('reaction', { message_id: messageId, emoji }, (err, ack) => {
      if (err || !ack || ack.ok === false) setErreurEnvoi(t('reactions.erreur'));
    });
  }, [socket, connecte, t]);

  // La barre d'emojis se ferme en cliquant ailleurs ou avec Échap.
  useEffect(() => {
    if (!choixId) return undefined;
    const fermer = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !e.target.closest?.('[data-reactions]')) setChoixId(null); };
    document.addEventListener('mousedown', fermer);
    document.addEventListener('touchstart', fermer);
    document.addEventListener('keydown', fermer);
    return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('touchstart', fermer); document.removeEventListener('keydown', fermer); };
  }, [choixId]);

  // Un indicateur d'écriture sans nouvelle depuis 4 s disparaît.
  useEffect(() => {
    const id = setInterval(() => setEcrivent((e) => {
      const maintenant = Date.now();
      const garde = Object.fromEntries(Object.entries(e).filter(([, v]) => maintenant - v.at < 4000));
      return Object.keys(garde).length === Object.keys(e).length ? e : garde;
    }), 1500);
    return () => clearInterval(id);
  }, []);

  // Défilement : en bas pour les nouveaux messages, position conservée quand on charge l'historique.
  useLayoutEffect(() => {
    const el = defil.current;
    if (!el) return;
    if (hauteurAvant.current != null) {
      el.scrollTop = el.scrollHeight - hauteurAvant.current;
      hauteurAvant.current = null;
    } else if (suivreBas.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, etat]);

  const surDefilement = () => {
    const el = defil.current;
    if (el) suivreBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const plusAnciens = async () => {
    setChargePlus(true);
    try {
      const d = await historique(canal, page + 1);
      hauteurAvant.current = defil.current?.scrollHeight ?? null;
      setMessages((prev) => [...d.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setPage(page + 1);
      setASuivre(d.a_suivre);
    } catch (e) {
      setErreurEnvoi(messageErreur(e, t('commun.erreur')));
    } finally { setChargePlus(false); }
  };

  // Image jointe : on la réduit dans le navigateur, on l'envoie, puis on l'annonce dans la conversation (avec le texte saisi, s'il y en a).
  const champImage = useRef(null);
  const [envoiImage, setEnvoiImage] = useState(false);
  const choisirImage = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = ''; // permet de rechoisir la même image
    if (!fichier || envoiImage || !socket || !connecte) return;
    setEnvoiImage(true); setErreurEnvoi('');
    try {
      const imageUrl = await envoyerImageChat(await preparerImage(fichier));
      const contenu = texte.trim();
      socket.timeout(8000).emit('message', { canal, image_url: imageUrl, ...(contenu ? { contenu } : {}), ...chargeReponse() }, (err, ack) => {
        setEnvoiImage(false);
        if (err || !ack?.ok) { setErreurEnvoi(err ? t('chat.erreur_delai') : ack?.erreur || t('images.erreur_envoi')); return; }
        suivreBas.current = true; if (contenu) setTexte(''); setCitation(null); ajouter(ack.message);
      });
    } catch (er) {
      setEnvoiImage(false);
      setErreurEnvoi(er?.message === 'type' ? t('images.erreur_type') : er?.message === 'taille' ? t('images.erreur_taille') : messageErreur(er, t('images.erreur_envoi')));
    }
  };

  const [envoiVocal, setEnvoiVocal] = useState(false);
  const signalerVocal = useCallback((actif) => { if (socket && connecte) socket.emit('typing', { canal, actif, mode: 'vocal' }); }, [socket, connecte, canal]);
  const vocal = useEnregistreurVocal({ onDebut: () => signalerVocal(true), onFin: () => signalerVocal(false) });

  const envoyerNoteVocale = async () => {
    if (!vocal.resultat || envoiVocal || !socket || !connecte) return;
    setEnvoiVocal(true); setErreurEnvoi('');
    try {
      const { audio_url: audioUrl } = await envoyerVocal(vocal.resultat.blob, i18n.language?.startsWith('en') ? 'en' : 'fr');
      socket.timeout(8000).emit('message', { canal, audio_url: audioUrl, ...chargeReponse() }, (err, ack) => {
        setEnvoiVocal(false);
        if (err || !ack?.ok) { setErreurEnvoi(err ? t('chat.erreur_delai') : ack?.erreur || t('vocal.erreur_envoi')); return; } // l'enregistrement reste prêt
        suivreBas.current = true; vocal.terminer(); setCitation(null); ajouter(ack.message);
      });
    } catch (e) { setEnvoiVocal(false); setErreurEnvoi(messageErreur(e, t('vocal.erreur_envoi'))); }
  };

  const signalerFrappe = (actif) => {
    if (!socket || !connecte) return;
    if (actif === frappe.current.actif && actif) return; // déjà signalé
    frappe.current.actif = actif;
    socket.emit('typing', { canal, actif });
  };

  const surSaisie = (e) => {
    setTexte(e.target.value);
    setErreurEnvoi('');
    signalerFrappe(true);
    clearTimeout(frappe.current.minuteur);
    frappe.current.minuteur = setTimeout(() => signalerFrappe(false), 2500);
  };

  const envoyer = () => {
    const contenu = texte.trim();
    if (!contenu || envoi || !socket || !connecte) return;
    setEnvoi(true);
    setErreurEnvoi('');
    clearTimeout(frappe.current.minuteur);
    signalerFrappe(false);
    socket.timeout(8000).emit('message', { canal, contenu, ...chargeReponse() }, (err, ack) => {
      setEnvoi(false);
      if (err || !ack?.ok) {
        setErreurEnvoi(err ? t('chat.erreur_delai') : ack?.erreur || t('chat.erreur_envoi'));
        return; // le texte reste dans la zone : rien n'est perdu
      }
      suivreBas.current = true;
      setTexte('');
      setCitation(null);
      ajouter(ack.message);
      saisie.current?.focus();
    });
  };

  const surTouche = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); envoyer(); }
  };

  const insererCode = () => {
    const el = saisie.current;
    const debut = el?.selectionStart ?? texte.length;
    const fin = el?.selectionEnd ?? texte.length;
    const choisi = texte.slice(debut, fin);
    const bloc = `\`\`\`\n${choisi}\n\`\`\``;
    setTexte(texte.slice(0, debut) + bloc + texte.slice(fin));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = debut + 4 + choisi.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  if (!infos) return <p className="erreur m-4">{t('chat.salon_invalide')}</p>;

  const titre = infos.type === 'stack' ? `#${infos.valeur}` : infos.type === 'ville' ? majuscule(infos.valeur) : infos.type === 'salon' ? (salon?.nom || '…') : autre ? `@${autre.pseudo}` : '…';
  const sousTitre = infos.type === 'stack' ? t('chat.sous_stack') : infos.type === 'ville' ? t('chat.sous_ville')
    : infos.type === 'salon' ? (salon ? `${t(`salons.visibilite_${salon.visibilite}`)} · ${t('salons.membres', { count: salon.nb_membres })}` : '') : t('chat.sous_prive');

  // Salon public pas encore rejoint : fiche et bouton « Rejoindre » à la place de la conversation.
  if (infos.type === 'salon' && salon && !salon.membre) {
    const rejoindre = async () => {
      setRejoint({ occupe: true, erreur: '' });
      try { await rejoindreSalon(salon.id); onChange?.(); } catch (e) { setRejoint({ occupe: false, erreur: messageErreur(e, t('commun.erreur')) }); }
    };
    return (
      <div className="m-auto max-w-sm px-6 py-10 text-center">
        <button type="button" onClick={onRetour} className="mb-4 text-sm text-slate-500 underline md:hidden"><Icone nom="retour" /> {t('chat.retour')}</button>
        <p className="text-4xl text-brand" aria-hidden><Icone nom="messages" /></p>
        <h2 className="mt-2 text-xl font-bold">{salon.nom}</h2>
        {salon.description && <p className="mt-1 text-sm text-slate-600">{salon.description}</p>}
        <p className="mt-1 text-xs text-slate-500">{t('salons.membres', { count: salon.nb_membres })}</p>
        <p className="mt-3 text-sm text-slate-600">{t('salons.carte_texte')}</p>
        {rejoint.erreur && <p className="erreur mt-3" role="alert">{rejoint.erreur}</p>}
        <button type="button" className="btn mt-4" disabled={rejoint.occupe} onClick={rejoindre}>{rejoint.occupe ? t('commun.chargement') : t('salons.rejoindre')}</button>
      </div>
    );
  }
  const phrase = (liste, cle) => (liste.length === 0 ? '' : liste.length === 1 ? t(`${cle}_un`, { pseudo: liste[0] }) : liste.length === 2 ? t(`${cle}_deux`, { a: liste[0], b: liste[1] }) : t(`${cle}_plusieurs`));
  const enCours = Object.values(ecrivent);
  const ecrit = [phrase(enCours.filter((x) => x.mode !== 'vocal').map((x) => x.pseudo), 'chat.ecrit'), phrase(enCours.filter((x) => x.mode === 'vocal').map((x) => x.pseudo), 'vocal.ecrit')].filter(Boolean).join(' · ');
  const enVocal = vocal.etat === 'enregistre' || vocal.etat === 'pret';
  const erreurVocal = vocal.etat === 'erreur' ? t(`vocal.erreur_${vocal.erreur || 'autre'}`) : '';
  const peutEcrire = connecte && etat !== 'erreur';
  const restant = MAX_CAR - texte.length;

  const lignes = [];
  messages.forEach((m, i) => {
    const prec = messages[i - 1];
    if (!prec || !memeJour(prec.created_at, m.created_at)) {
      const auj = memeJour(m.created_at, Date.now());
      lignes.push(<div key={`j${m.id}`} className="my-3 text-center text-xs text-slate-400">{auj ? t('chat.aujourdhui') : new Date(m.created_at).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</div>);
    }
    const debutGroupe = !prec || prec.auteur?.id !== m.auteur?.id || !memeJour(prec.created_at, m.created_at) || new Date(m.created_at) - new Date(prec.created_at) > GROUPE_MS;
    const moi = m.auteur?.id === user?.id;
    const monEmoji = (m.reactions || []).find((r) => r.users.includes(user?.id))?.emoji;
    lignes.push(
      <div key={m.id} id={`msg-${m.id}`} className={`anim-msg flex flex-col ${moi ? 'items-end' : 'items-start'} ${debutGroupe ? 'mt-3' : 'mt-0.5'}`}>
        {debutGroupe && (
          <div className="mb-0.5 flex items-baseline gap-2 px-1 text-xs">
            {m.auteur
              ? <Link to={moi ? '/profil' : `/developpeurs/${m.auteur.id}`} className="font-semibold hover:underline" style={{ color: moi ? '#64748b' : couleurPseudo(m.auteur.pseudo) }}>{moi ? t('chat.toi') : m.auteur.pseudo}</Link>
              : <span className="font-semibold text-slate-400">{t('chat.supprime')}</span>}
            <time dateTime={m.created_at} className="text-slate-400">{heure(m.created_at, i18n.language)}</time>
          </div>
        )}
        <div data-reactions className={`group relative flex max-w-[85%] items-center gap-1 sm:max-w-[75%] ${moi ? 'flex-row-reverse' : ''}`}>
        {choixId === m.id && (
          <BarreReactions aDroite={moi} monEmoji={monEmoji} onChoisir={(e) => reagir(m.id, e)} actions={[
            ...(m.auteur ? [{ cle: 'repondre', label: t('reactions.repondre'), icone: 'repondre', onClick: () => repondreA(m) }] : []),
            ...(infos.type !== 'prive' && m.auteur && !moi ? [{ cle: 'prive', label: t('reactions.repondre_prive'), icone: 'courrier', onClick: () => repondreEnPrive(m) }] : [])
          ]} />
        )}
        <div
          onTouchStart={() => { clearTimeout(appuiLong.current); appuiLong.current = setTimeout(() => setChoixId(m.id), APPUI_LONG_MS); }}
          onTouchEnd={() => clearTimeout(appuiLong.current)}
          onTouchMove={() => clearTimeout(appuiLong.current)}
          onTouchCancel={() => clearTimeout(appuiLong.current)}
          onContextMenu={(e) => { e.preventDefault(); setChoixId(m.id); }}
          className={`min-w-0 select-text rounded-2xl px-3 py-1.5 text-[15px] leading-snug [-webkit-touch-callout:none] ${surligne === m.id ? 'ring-4 ring-amber-300' : ''} ${moi ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'}`}>
          {m.reponse_a && <CitationBloc r={m.reponse_a} propre={moi} onAller={allerAuMessage} />}
          {m.contenu && <RichText texte={m.contenu} moi={user?.pseudo} propre={moi} />}
          {m.image_url && <ImageMessage url={m.image_url} />}
          {m.audio_url && (
            <div className="mt-1">
              <LecteurVocal url={m.audio_url} transcription={m.transcription} propre={moi} />
            </div>
          )}
        </div>
        <button type="button" onClick={() => setChoixId(choixId === m.id ? null : m.id)} aria-label={t('reactions.ajouter')} title={t('reactions.ajouter')}
          className="hidden rounded-full p-1 text-sm text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:opacity-100 group-hover:opacity-100 md:block">
          <Icone nom="reaction" />
        </button>
        </div>
        <PastillesReactions reactions={m.reactions} moiId={user?.id} onBasculer={(e) => reagir(m.id, e)} />
      </div>
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
        <button type="button" onClick={onRetour} className="rounded-lg px-2 py-1 text-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label={t('chat.retour')}><Icone nom="retour" /></button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight">{infos.type === 'ville' && <Icone nom="lieu" /> }{titre}</h2>
          <p className="truncate text-xs text-slate-500">
            {infos.type === 'prive' && autre ? <Link to={`/developpeurs/${autre.id}`} className="hover:underline">{t('chat.voir_profil')}</Link> : sousTitre}
          </p>
        </div>
        {infos.type === 'salon' && salon?.membre && (
          <>
            <button type="button" onClick={() => setInfosOuvert(true)} className="btn-outline !px-3 !py-1 text-sm">{t('salons.inviter')}</button>
            <button type="button" onClick={() => setInfosOuvert(true)} aria-label={t('salons.infos')} title={t('salons.infos')} className="rounded-lg px-2 py-1 text-lg text-slate-600 hover:bg-slate-100"><Icone nom="info" /></button>
          </>
        )}
        <span className={`flex items-center gap-1.5 text-xs ${connecte ? 'text-emerald-700' : 'text-slate-400'}`} role="status">
          <span className={`h-2 w-2 rounded-full ${connecte ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
          {connecte ? t('chat.en_ligne') : t('chat.connexion')}
        </span>
      </header>
      {infosOuvert && salon && (
        <SalonInfos salonId={salon.id} moiId={user?.id} onFerme={() => setInfosOuvert(false)}
          onChange={() => { onChange?.(); getSalon(salon.id).then((d) => setSalon(d.salon)).catch(() => {}); }}
          onSorti={() => { setInfosOuvert(false); onRetour?.(); }} />
      )}

      <div ref={defil} onScroll={surDefilement} className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3" aria-live="polite" aria-label={t('chat.liste_messages')}>
        {aSuivre && (
          <div className="text-center">
            <button type="button" onClick={plusAnciens} disabled={chargePlus} className="btn-outline !px-3 !py-1 text-sm">{chargePlus ? t('commun.chargement') : t('chat.plus_anciens')}</button>
          </div>
        )}
        {etat === 'chargement' && <p className="py-10 text-center text-slate-400">{t('commun.chargement')}</p>}
        {etat === 'erreur' && (
          <div className="mx-auto max-w-sm py-10 text-center">
            <p className="erreur">{erreurSalon || t('commun.erreur')}</p>
            <button type="button" onClick={chargerHistorique} className="btn mt-3">{t('chat.reessayer')}</button>
          </div>
        )}
        {etat === 'ok' && messages.length === 0 && (
          <div className="mx-auto max-w-xs py-12 text-center text-slate-500">
            <p className="font-medium text-slate-700">{t('chat.vide_titre')}</p>
            <p className="mt-1 text-sm">{infos.type === 'prive' ? t('chat.vide_prive', { pseudo: autre?.pseudo || '' }) : t('chat.vide_salon', { salon: titre })}</p>
          </div>
        )}
        {lignes}
      </div>

      <footer className="border-t border-slate-200 bg-white p-2.5">
        <div className="h-5 px-1 text-xs text-slate-500" aria-live="polite">{ecrit}</div>
        {erreurSalon && etat !== 'erreur' && <p className="erreur mb-2">{erreurSalon}</p>}
        {erreurEnvoi && <p className="erreur mb-2" role="alert">{erreurEnvoi}</p>}
        {erreurVocal && <p className="erreur mb-2" role="alert">{erreurVocal}</p>}
        {citation && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-brand bg-slate-100 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-brand">{t('reactions.reponse_a', { pseudo: citation.pseudo })}</p>
              <p className="line-clamp-1 break-words text-[13px] text-slate-600">{apercuCitation(citation, t)}</p>
            </div>
            <button type="button" onClick={() => setCitation(null)} aria-label={t('reactions.annuler_reponse')} title={t('reactions.annuler_reponse')} className="rounded-full px-1.5 text-slate-500 hover:bg-slate-200"><Icone nom="fermer" /></button>
          </div>
        )}
        {enVocal ? (
          <div className="flex items-center gap-2">
            <BarreVocale etat={vocal.etat} secondes={vocal.secondes} resultat={vocal.resultat} envoi={envoiVocal} dureeMax={DUREE_MAX} onArreter={vocal.arreter} onAnnuler={vocal.annuler} onEnvoyer={envoyerNoteVocale} />
          </div>
        ) : (
        <div className="flex items-end gap-2">
          <input ref={champImage} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={choisirImage} className="hidden" tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => champImage.current?.click()} disabled={!peutEcrire || envoiImage} title={envoiImage ? t('images.envoi') : t('images.bouton')} aria-label={t('images.bouton')} className="btn-outline !px-2.5 text-base">{envoiImage ? '…' : <Icone nom="image" />}</button>
          <button type="button" onClick={insererCode} disabled={!peutEcrire} title={t('chat.bloc_code')} aria-label={t('chat.bloc_code')} className="btn-outline !px-2.5 font-mono text-sm">{'{ }'}</button>
          <textarea
            ref={saisie} value={texte} onChange={surSaisie} onKeyDown={surTouche} rows={1} maxLength={MAX_CAR} disabled={!peutEcrire}
            placeholder={peutEcrire ? t('chat.placeholder', { salon: titre }) : t('chat.hors_connexion')}
            aria-label={t('chat.placeholder', { salon: titre })}
            className="input max-h-32 min-h-[2.5rem] flex-1 resize-none [field-sizing:content]"
          />
          {!texte.trim() && vocalPossible()
            ? <button type="button" onClick={vocal.demarrer} disabled={!peutEcrire} className="btn" title={t('vocal.micro')} aria-label={t('vocal.micro')}><Icone nom="micro" /></button>
            : <button type="button" onClick={envoyer} disabled={!peutEcrire || envoi || !texte.trim()} className="btn">{envoi ? '…' : t('chat.envoyer')}</button>}
        </div>
        )}
        <p className="mt-1 hidden px-1 text-xs text-slate-400 sm:block">
          {t('chat.astuce')}{restant < 200 && <span className={`ml-2 ${restant < 0 ? 'text-red-600' : ''}`}>{restant}</span>}
        </p>
      </footer>
    </div>
  );
}
