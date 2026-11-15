import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { creerDuel, envoyerProgres, getDuel, rejoindreDuel } from '../services/duels';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { executerTests } from '../lib/sandboxDefi';
import { formaterDuree } from '../lib/defis';
import EditeurCode from '../components/EditeurCode';
import ResultatsTests from '../components/ResultatsTests';
import RichText from '../components/RichText';

/* Duel de code : deux développeurs, le même problème, le premier à passer tous les tests gagne. */

function Barre({ joueur, moi, gagnant }) {
  const pct = joueur.total ? Math.round((joueur.tests_reussis / joueur.total) * 100) : 0;
  return (
    <div className={`rounded-xl border p-3 ${gagnant ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-semibold">{joueur.pseudo}{moi && <span className="ml-1 text-xs font-normal text-slate-500">(vous)</span>}{gagnant && ' 🏆'}</span>
        <span className="font-mono text-xs text-slate-600">{joueur.tests_reussis}/{joueur.total} tests</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all duration-500 ${gagnant ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Accueil() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const creer = async () => {
    setOccupe(true); setErreur('');
    try { const d = await creerDuel(); navigate(`/duel/${d.code}`); } catch (e) { setErreur(messageErreur(e, 'Création impossible.')); setOccupe(false); }
  };
  const rejoindre = (e) => { e.preventDefault(); if (code.trim()) navigate(`/duel/${code.trim().toUpperCase()}`); };
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">⚔️ Duel de code</h1>
      <p className="text-slate-600">Défiez un ami en direct : même problème, même départ, et le premier qui réussit tous les tests gagne des points de réputation.</p>
      {erreur && <div className="erreur" role="alert">{erreur}</div>}
      <div className="card space-y-3">
        <button type="button" className="btn w-full" onClick={creer} disabled={occupe}>Créer un duel</button>
        <p className="text-center text-xs text-slate-500">Vous recevrez un lien à envoyer par WhatsApp.</p>
      </div>
      <form className="card space-y-2" onSubmit={rejoindre}>
        <label className="text-sm font-semibold" htmlFor="code-duel">Rejoindre avec un code</label>
        <div className="flex gap-2">
          <input id="code-duel" className="input min-w-0 flex-1 uppercase" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex. K7P2M" />
          <button type="submit" className="btn-outline">Rejoindre</button>
        </div>
      </form>
      <p className="text-center text-sm"><Link to="/defi" className="text-brand underline">Retour au défi de la semaine</Link></p>
    </div>
  );
}

function Combat({ code }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duel, setDuel] = useState(null);
  const [erreur, setErreur] = useState('');
  const [fatale, setFatale] = useState('');
  const [decalage, setDecalage] = useState(0); // heure serveur - heure locale
  const [maintenant, setMaintenant] = useState(Date.now());
  const [codeSaisi, setCodeSaisi] = useState('');
  const [resultats, setResultats] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [copie, setCopie] = useState(false);
  const depart = useRef(false);
  const rejoint = useRef(false);

  const appliquer = useCallback((d) => {
    setDuel(d); setDecalage(d.serveur_now - Date.now());
  }, []);

  // Rejoindre automatiquement quand on arrive par le lien (sauf si on est déjà dans le duel)
  useEffect(() => {
    let actif = true;
    getDuel(code).then(async (d) => {
      if (!actif) return;
      if (!d.moi && d.statut === 'attente' && !rejoint.current) {
        rejoint.current = true;
        try { d = await rejoindreDuel(code); } catch (e) { setFatale(messageErreur(e, 'Impossible de rejoindre ce duel.')); return; }
      }
      appliquer(d);
    }).catch((e) => actif && setFatale(messageErreur(e, 'Duel introuvable.')));
    return () => { actif = false; };
  }, [code, appliquer]);

  // Interrogation régulière tant que le duel n'est pas terminé
  useEffect(() => {
    if (!duel || fatale || duel.statut === 'termine') return undefined;
    const i = setInterval(() => { getDuel(code).then(appliquer).catch(() => {}); }, 1500);
    return () => clearInterval(i);
  }, [duel, code, fatale, appliquer]);

  useEffect(() => { const i = setInterval(() => setMaintenant(Date.now()), 250); return () => clearInterval(i); }, []);

  // Code de départ posé une seule fois, quand le problème est connu
  useEffect(() => {
    if (duel?.probleme && !depart.current) { depart.current = true; setCodeSaisi(duel.probleme.code_depart); }
  }, [duel]);

  if (fatale) return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="erreur" role="alert">{fatale}</div>
      <Link to="/duel" className="btn-outline">Retour</Link>
    </div>
  );
  if (!duel) return <p className="text-slate-500">Chargement…</p>;

  const lien = window.location.href;
  const moiId = user?.id;
  const maintenantServeur = maintenant + decalage;
  const adversaire = duel.joueurs.find((j) => j.id !== moiId);
  const moi = duel.joueurs.find((j) => j.id === moiId);

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { window.prompt('Copiez ce lien :', lien); }
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Je te défie en duel de code sur DevConnect ! Rejoins-moi : ${lien}`)}`;

  const lancer = async () => {
    setOccupe(true); setErreur('');
    const r = await executerTests({ code: codeSaisi, nomFonction: duel.probleme.nom_fonction, tests: duel.tests });
    setOccupe(false);
    if (r.erreur === 'execution_impossible') { setErreur("L'exécution du code est impossible sur cet appareil."); return; }
    if (r.erreur) { setErreur(`Erreur dans votre code : ${r.erreur}`); setResultats(r.resultats.length ? r.resultats : null); return; }
    setResultats(r.resultats);
    const reussis = r.resultats.filter((x) => x.ok).length;
    try { appliquer(await envoyerProgres(code, { tests_reussis: reussis, total: duel.tests.length })); } catch (e) { setErreur(messageErreur(e, 'Envoi impossible.')); }
  };

  /* ---- Attente de l'adversaire ---- */
  if (duel.statut === 'attente') return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-2xl font-bold">⚔️ Duel de code</h1>
      <div className="card space-y-3">
        <p className="text-slate-600">En attente d'un adversaire…</p>
        <p className="font-mono text-4xl font-bold tracking-widest text-brand">{duel.code}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <a className="btn" href={whatsapp} target="_blank" rel="noopener noreferrer">💬 Inviter par WhatsApp</a>
          <button type="button" className="btn-outline" onClick={copier}>{copie ? 'Lien copié ✓' : 'Copier le lien'}</button>
        </div>
        <p className="text-xs text-slate-500">Le duel démarre dès que votre ami rejoint.</p>
      </div>
    </div>
  );

  /* ---- Compte à rebours ---- */
  if (duel.statut === 'compte_a_rebours') {
    const reste = Math.max(0, Math.ceil((duel.start_at - maintenantServeur) / 1000));
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">⚔️ {moi?.pseudo} contre {adversaire?.pseudo}</h1>
        <div className="card">
          <p className="text-slate-600">Préparez-vous…</p>
          <p className="my-4 text-7xl font-extrabold text-brand" aria-live="assertive">{reste || 'Go !'}</p>
          <p className="text-sm text-slate-500">Problème : {duel.probleme?.titre}</p>
        </div>
      </div>
    );
  }

  const fini = duel.statut === 'termine';
  const gagne = fini && duel.gagnant_id === moiId;
  const ecoule = Math.max(0, Math.round((maintenantServeur - duel.start_at) / 1000));
  const reste = Math.max(0, duel.duree_max_s - ecoule);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">⚔️ Duel de code</h1>
        {!fini && <span className="font-mono text-lg font-semibold text-brand" aria-label="Chronomètre">⏱ {formaterDuree(ecoule)} <span className="text-xs font-normal text-slate-500">(reste {formaterDuree(reste)})</span></span>}
      </div>

      {erreur && <div className="erreur" role="alert">{erreur}</div>}

      <div className="grid gap-2 sm:grid-cols-2">
        {moi && <Barre joueur={moi} moi gagnant={duel.gagnant_id === moi.id} />}
        {adversaire && <Barre joueur={adversaire} gagnant={duel.gagnant_id === adversaire.id} />}
      </div>

      {fini && (
        <div className={`card border-l-4 ${gagne ? 'border-emerald-500' : 'border-slate-400'}`} role="status">
          <p className="text-lg font-bold">{!duel.gagnant_id ? '⌛ Temps écoulé, personne n’a terminé.' : gagne ? `🏆 Victoire ! +${duel.points.gagnant} points de réputation` : `Défaite… ${adversaire?.pseudo} a été plus rapide. +${duel.points.perdant} points pour avoir participé.`}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={async () => { try { const d = await creerDuel(); navigate(`/duel/${d.code}`); } catch (e) { setErreur(messageErreur(e)); } }}>Nouveau duel</button>
            <Link to="/classement" className="btn-outline">Voir le classement</Link>
          </div>
        </div>
      )}

      {duel.probleme && (
        <section className="card">
          <h2 className="text-xl font-bold">{duel.probleme.titre}</h2>
          <div className="mt-2 text-[15px] leading-relaxed text-slate-800"><RichText texte={duel.probleme.enonce} /></div>
          {duel.probleme.exemples.length > 0 && (
            <ul className="mt-3 space-y-1 font-mono text-xs text-slate-700">
              {duel.probleme.exemples.map((x, i) => <li key={i} className="rounded bg-slate-50 px-2 py-1">{duel.probleme.nom_fonction}({x.entree.map((a) => JSON.stringify(a)).join(', ')}) → {JSON.stringify(x.attendu)}</li>)}
            </ul>
          )}
        </section>
      )}

      {duel.tests && (
        <section className="space-y-3">
          <EditeurCode valeur={codeSaisi} onChange={setCodeSaisi} onCollageBloque={() => setErreur('Le collage est désactivé : écrivez votre solution ici.')} disabled={occupe || fini} nomFonction={duel.probleme.nom_fonction} />
          {!fini && <button type="button" className="btn" onClick={lancer} disabled={occupe}>{occupe ? 'Exécution…' : 'Lancer les tests'}</button>}
          {resultats && <ResultatsTests tests={duel.tests} resultats={resultats} />}
        </section>
      )}
    </div>
  );
}

export default function Duel() {
  const { code } = useParams();
  return code ? <Combat key={code} code={code.toUpperCase()} /> : <Accueil />;
}
