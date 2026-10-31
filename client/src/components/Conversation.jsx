import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { historique } from '../services/chat';
import { getUser } from '../services/users';
import { lireCanal, majuscule, ajouterRecent } from '../lib/canaux';
import { messageErreur } from '../services/api';
import RichText from './RichText';

const COULEURS = ['#1d4ed8', '#047857', '#b45309', '#7e22ce', '#be123c', '#0e7490'];
const couleurPseudo = (p = '') => COULEURS[[...p].reduce((a, c) => a + c.charCodeAt(0), 0) % COULEURS.length];
const MAX_CAR = 2000;
const GROUPE_MS = 5 * 60 * 1000;

const memeJour = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const heure = (d, lang) => new Date(d).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

export default function Conversation({ canal, onRetour, onNom }) {
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
        return { ...e, [d.user_id]: { pseudo: d.pseudo, at: Date.now() } };
      });
    };
    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    return () => { socket.off('message', onMessage); socket.off('typing', onTyping); };
  }, [socket, canal, user?.id, ajouter]);

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
    socket.timeout(8000).emit('message', { canal, contenu }, (err, ack) => {
      setEnvoi(false);
      if (err || !ack?.ok) {
        setErreurEnvoi(err ? t('chat.erreur_delai') : ack?.erreur || t('chat.erreur_envoi'));
        return; // le texte reste dans la zone : rien n'est perdu
      }
      suivreBas.current = true;
      setTexte('');
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

  const titre = infos.type === 'stack' ? `#${infos.valeur}` : infos.type === 'ville' ? majuscule(infos.valeur) : autre ? `@${autre.pseudo}` : '…';
  const sousTitre = infos.type === 'stack' ? t('chat.sous_stack') : infos.type === 'ville' ? t('chat.sous_ville') : t('chat.sous_prive');
  const noms = Object.values(ecrivent).map((x) => x.pseudo);
  const ecrit = noms.length === 0 ? '' : noms.length === 1 ? t('chat.ecrit_un', { pseudo: noms[0] }) : noms.length === 2 ? t('chat.ecrit_deux', { a: noms[0], b: noms[1] }) : t('chat.ecrit_plusieurs');
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
    lignes.push(
      <div key={m.id} className={`flex flex-col ${moi ? 'items-end' : 'items-start'} ${debutGroupe ? 'mt-3' : 'mt-0.5'}`}>
        {debutGroupe && (
          <div className="mb-0.5 flex items-baseline gap-2 px-1 text-xs">
            {m.auteur
              ? <Link to={moi ? '/profil' : `/developpeurs/${m.auteur.id}`} className="font-semibold hover:underline" style={{ color: moi ? '#64748b' : couleurPseudo(m.auteur.pseudo) }}>{moi ? t('chat.toi') : m.auteur.pseudo}</Link>
              : <span className="font-semibold text-slate-400">{t('chat.supprime')}</span>}
            <time dateTime={m.created_at} className="text-slate-400">{heure(m.created_at, i18n.language)}</time>
          </div>
        )}
        <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-[15px] leading-snug sm:max-w-[75%] ${moi ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'}`}>
          {m.contenu && <RichText texte={m.contenu} moi={user?.pseudo} propre={moi} />}
          {m.audio_url && (
            <div className="mt-1">
              <audio controls preload="none" src={m.audio_url} className="h-9 max-w-full" />
              {m.transcription && <p className={`mt-1 text-sm italic ${moi ? 'text-white/80' : 'text-slate-500'}`}>{m.transcription}</p>}
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
        <button type="button" onClick={onRetour} className="rounded-lg px-2 py-1 text-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label={t('chat.retour')}>←</button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight">{infos.type === 'ville' && <span aria-hidden>📍 </span>}{titre}</h2>
          <p className="truncate text-xs text-slate-500">
            {infos.type === 'prive' && autre ? <Link to={`/developpeurs/${autre.id}`} className="hover:underline">{t('chat.voir_profil')}</Link> : sousTitre}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs ${connecte ? 'text-emerald-700' : 'text-slate-400'}`} role="status">
          <span className={`h-2 w-2 rounded-full ${connecte ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
          {connecte ? t('chat.en_ligne') : t('chat.connexion')}
        </span>
      </header>

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
        <div className="flex items-end gap-2">
          <button type="button" onClick={insererCode} disabled={!peutEcrire} title={t('chat.bloc_code')} aria-label={t('chat.bloc_code')} className="btn-outline !px-2.5 font-mono text-sm">{'{ }'}</button>
          <textarea
            ref={saisie} value={texte} onChange={surSaisie} onKeyDown={surTouche} rows={1} maxLength={MAX_CAR} disabled={!peutEcrire}
            placeholder={peutEcrire ? t('chat.placeholder', { salon: titre }) : t('chat.hors_connexion')}
            aria-label={t('chat.placeholder', { salon: titre })}
            className="input max-h-32 min-h-[2.5rem] flex-1 resize-none [field-sizing:content]"
          />
          <button type="button" onClick={envoyer} disabled={!peutEcrire || envoi || !texte.trim()} className="btn">{envoi ? '…' : t('chat.envoyer')}</button>
        </div>
        <p className="mt-1 hidden px-1 text-xs text-slate-400 sm:block">
          {t('chat.astuce')}{restant < 200 && <span className={`ml-2 ${restant < 0 ? 'text-red-600' : ''}`}>{restant}</span>}
        </p>
      </footer>
    </div>
  );
}
