import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageErreur } from '../services/api';
import * as g from '../services/adminGestion';

/* Gestion complète du site : utilisateurs, contenus du forum, projets. */

const ROLES = [['dev', 'Développeur'], ['moderateur', 'Modérateur'], ['admin', 'Administrateur']];
const STATUTS = [['idee', 'Idée'], ['en_cours', 'En cours'], ['termine', 'Terminé']];
const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Précédent</button>
      <span>Page {page} / {pages}</span>
      <button type="button" className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant</button>
    </div>
  );
}

function Recherche({ valeur, onChange, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input className="input min-w-0 flex-1" type="search" placeholder="Rechercher…" value={valeur} onChange={(e) => onChange(e.target.value)} />
      {children}
    </div>
  );
}

// Bouton de suppression à deux clics
function Supprimer({ onConfirme, occupe }) {
  const [sur, setSur] = useState(false);
  useEffect(() => { if (!sur) return undefined; const id = setTimeout(() => setSur(false), 4000); return () => clearTimeout(id); }, [sur]);
  return (
    <button type="button" disabled={occupe} onClick={() => (sur ? onConfirme() : setSur(true))}
      className={`rounded-lg px-3 py-1 text-xs font-medium ${sur ? 'bg-red-600 text-white' : 'border border-red-200 text-red-700 hover:bg-red-50'}`}>
      {sur ? 'Confirmer la suppression' : 'Supprimer'}
    </button>
  );
}

/* ------------------------------------------------------------------ Utilisateurs */

function LigneUtilisateur({ u, moi, estAdmin, onMaj, onSupprime, onInfo, onErreur }) {
  const [occupe, setOccupe] = useState(false);
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState({ pseudo: u.pseudo, pays: u.pays || '', ville: u.ville || '', bio: u.bio || '' });
  const soi = u.id === moi;

  const run = async (fn, ok) => {
    setOccupe(true);
    try { await fn(); if (ok) onInfo(ok); } catch (e) { onErreur(messageErreur(e, 'Action impossible.')); }
    setOccupe(false);
  };
  const bloquer = () => {
    if (u.bloque) return run(async () => onMaj((await g.bloquerUtilisateur(u.id, false)).utilisateur), 'Compte débloqué.');
    const motif = window.prompt('Motif du blocage (facultatif) :', '');
    if (motif === null) return undefined;
    return run(async () => onMaj((await g.bloquerUtilisateur(u.id, true, motif || undefined)).utilisateur), 'Compte bloqué.');
  };
  const role = (r) => run(async () => { await g.changerRole(u.id, r); onMaj({ ...u, role: r }); }, 'Rôle mis à jour.');
  const enregistrer = () => run(async () => { onMaj((await g.modifierUtilisateur(u.id, f)).utilisateur); setEdition(false); }, 'Profil mis à jour.');
  const supprimer = () => run(async () => { await g.supprimerUtilisateur(u.id); onSupprime(u.id); }, 'Compte supprimé.');

  return (
    <li className={`rounded-xl border p-3 ${u.bloque ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{u.pseudo}</span>
        {u.bloque && <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">Bloqué</span>}
        <span className="text-xs text-slate-500">{u.email || u.telephone || 'GitHub'} · {u.pays || '—'} · inscrit le {date(u.created_at)} · {u.reputation} pts</span>
      </div>
      {u.bloque && u.bloque_motif && <p className="mt-1 text-xs text-red-700">Motif : {u.bloque_motif}</p>}

      {edition ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="input" value={f.pseudo} onChange={(e) => setF({ ...f, pseudo: e.target.value })} placeholder="Pseudo" />
          <input className="input" value={f.pays} maxLength={2} onChange={(e) => setF({ ...f, pays: e.target.value })} placeholder="Pays (SN, GN…)" />
          <input className="input" value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} placeholder="Ville" />
          <textarea className="input sm:col-span-2" rows={2} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Bio" />
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="btn" disabled={occupe} onClick={enregistrer}>Enregistrer</button>
            <button type="button" className="btn" onClick={() => setEdition(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {estAdmin ? (
            <select className="input !w-auto !py-1 text-xs" value={u.role} disabled={occupe || soi} onChange={(e) => role(e.target.value)} aria-label="Rôle">
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ) : <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{u.role}</span>}
          {!soi && <button type="button" disabled={occupe} onClick={bloquer}
            className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50">{u.bloque ? 'Débloquer' : 'Bloquer'}</button>}
          {estAdmin && <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium" onClick={() => setEdition(true)}>Modifier</button>}
          {estAdmin && !soi && <Supprimer occupe={occupe} onConfirme={supprimer} />}
        </div>
      )}
    </li>
  );
}

function Utilisateurs({ estAdmin, moi, onInfo, onErreur }) {
  const [q, setQ] = useState('');
  const [bloques, setBloques] = useState(false);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const charger = useCallback(() => {
    g.listerUtilisateurs({ q, page, bloque: bloques ? 'true' : undefined }).then(setRes).catch((e) => onErreur(messageErreur(e, 'Chargement impossible.')));
  }, [q, page, bloques, onErreur]);
  useEffect(() => { const id = setTimeout(charger, 250); return () => clearTimeout(id); }, [charger]);
  const maj = (u) => setRes((r) => ({ ...r, data: r.data.map((x) => (x.id === u.id ? u : x)) }));
  const retire = (id) => setRes((r) => ({ ...r, data: r.data.filter((x) => x.id !== id), total: r.total - 1 }));
  return (
    <div>
      <Recherche valeur={q} onChange={(v) => { setQ(v); setPage(1); }}>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={bloques} onChange={(e) => { setBloques(e.target.checked); setPage(1); }} /> Bloqués seulement</label>
      </Recherche>
      {!res ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <p className="mb-2 text-xs text-slate-500">{res.total} compte(s)</p>
          <ul className="space-y-2">{res.data.map((u) => <LigneUtilisateur key={u.id} u={u} moi={moi} estAdmin={estAdmin} onMaj={maj} onSupprime={retire} onInfo={onInfo} onErreur={onErreur} />)}</ul>
          <Pagination page={res.page} pages={res.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Contenus */

function LigneContenu({ c, onMaj, onSupprime, onInfo, onErreur }) {
  const [edition, setEdition] = useState(false);
  const [titre, setTitre] = useState(c.titre || '');
  const [contenu, setContenu] = useState(c.contenu || '');
  const [occupe, setOccupe] = useState(false);
  const run = async (fn, ok) => { setOccupe(true); try { await fn(); onInfo(ok); } catch (e) { onErreur(messageErreur(e, 'Action impossible.')); } setOccupe(false); };
  const enregistrer = () => run(async () => {
    await g.modifierContenu(c.id, { ...(c.type === 'post' ? { titre } : {}), contenu });
    onMaj({ ...c, titre, contenu, extrait: contenu.slice(0, 300) }); setEdition(false);
  }, 'Contenu modifié.');
  const supprimer = () => run(async () => { await g.supprimerContenuForum(c.id); onSupprime(c.id); }, 'Contenu supprimé.');
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-0.5">{c.type}</span>
        <span>{c.auteur?.pseudo || 'Compte supprimé'} · {date(c.created_at)}</span>
        {c.nb_signalements > 0 && <span className="text-red-700">{c.nb_signalements} signalement(s)</span>}
      </div>
      {edition ? (
        <div className="mt-2 space-y-2">
          {c.type === 'post' && <input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} />}
          <textarea className="input" rows={5} value={contenu} onChange={(e) => setContenu(e.target.value)} />
          <div className="flex gap-2"><button type="button" className="btn" disabled={occupe} onClick={enregistrer}>Enregistrer</button><button type="button" className="btn" onClick={() => setEdition(false)}>Annuler</button></div>
        </div>
      ) : (
        <>
          {c.titre && <p className="mt-1 font-semibold">{c.titre}</p>}
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{c.extrait}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium" onClick={() => setEdition(true)}>Modifier</button>
            <Supprimer occupe={occupe} onConfirme={supprimer} />
            {c.type === 'post' && <Link className="px-2 py-1 text-xs text-brand underline" to={`/forum/${c.id}`}>Voir</Link>}
          </div>
        </>
      )}
    </li>
  );
}

function Contenus({ onInfo, onErreur }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const charger = useCallback(() => {
    g.listerContenus({ q, type: type || undefined, page }).then(setRes).catch((e) => onErreur(messageErreur(e, 'Chargement impossible.')));
  }, [q, type, page, onErreur]);
  useEffect(() => { const id = setTimeout(charger, 250); return () => clearTimeout(id); }, [charger]);
  const maj = (c) => setRes((r) => ({ ...r, data: r.data.map((x) => (x.id === c.id ? c : x)) }));
  const retire = (id) => setRes((r) => ({ ...r, data: r.data.filter((x) => x.id !== id), total: r.total - 1 }));
  return (
    <div>
      <Recherche valeur={q} onChange={(v) => { setQ(v); setPage(1); }}>
        <select className="input !w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Tous</option><option value="post">Questions</option><option value="reponse">Réponses</option><option value="commentaire">Commentaires</option>
        </select>
      </Recherche>
      {!res ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <p className="mb-2 text-xs text-slate-500">{res.total} contenu(s)</p>
          <ul className="space-y-2">{res.data.map((c) => <LigneContenu key={c.id} c={c} onMaj={maj} onSupprime={retire} onInfo={onInfo} onErreur={onErreur} />)}</ul>
          <Pagination page={res.page} pages={res.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Projets */

function LigneProjet({ p, onMaj, onSupprime, onInfo, onErreur }) {
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState({ titre: p.titre, description: p.description, statut: p.statut });
  const [occupe, setOccupe] = useState(false);
  const run = async (fn, ok) => { setOccupe(true); try { await fn(); onInfo(ok); } catch (e) { onErreur(messageErreur(e, 'Action impossible.')); } setOccupe(false); };
  const enregistrer = () => run(async () => { await g.modifierProjet(p.id, f); onMaj({ ...p, ...f }); setEdition(false); }, 'Projet modifié.');
  const supprimer = () => run(async () => { await g.supprimerProjet(p.id); onSupprime(p.id); }, 'Projet supprimé.');
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      {edition ? (
        <div className="space-y-2">
          <input className="input" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />
          <textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <select className="input !w-auto" value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <div className="flex gap-2"><button type="button" className="btn" disabled={occupe} onClick={enregistrer}>Enregistrer</button><button type="button" className="btn" onClick={() => setEdition(false)}>Annuler</button></div>
        </div>
      ) : (
        <>
          <p className="font-semibold">{p.titre}</p>
          <p className="text-xs text-slate-500">{p.porteur || '—'} · {p.membres} membre(s) · {STATUTS.find(([v]) => v === p.statut)?.[1]} · {date(p.created_at)}</p>
          <p className="mt-1 line-clamp-3 text-sm text-slate-700">{p.description}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium" onClick={() => setEdition(true)}>Modifier</button>
            <Supprimer occupe={occupe} onConfirme={supprimer} />
          </div>
        </>
      )}
    </li>
  );
}

function Projets({ onInfo, onErreur }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const charger = useCallback(() => {
    g.listerProjets({ q, page }).then(setRes).catch((e) => onErreur(messageErreur(e, 'Chargement impossible.')));
  }, [q, page, onErreur]);
  useEffect(() => { const id = setTimeout(charger, 250); return () => clearTimeout(id); }, [charger]);
  const maj = (p) => setRes((r) => ({ ...r, data: r.data.map((x) => (x.id === p.id ? p : x)) }));
  const retire = (id) => setRes((r) => ({ ...r, data: r.data.filter((x) => x.id !== id), total: r.total - 1 }));
  return (
    <div>
      <Recherche valeur={q} onChange={(v) => { setQ(v); setPage(1); }} />
      {!res ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <p className="mb-2 text-xs text-slate-500">{res.total} projet(s)</p>
          <ul className="space-y-2">{res.data.map((p) => <LigneProjet key={p.id} p={p} onMaj={maj} onSupprime={retire} onInfo={onInfo} onErreur={onErreur} />)}</ul>
          <Pagination page={res.page} pages={res.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

export default function AdminGestion() {
  const { user } = useAuth();
  const [onglet, setOnglet] = useState('utilisateurs');
  const [info, setInfo] = useState('');
  const [erreur, setErreur] = useState('');
  useEffect(() => { if (!info && !erreur) return undefined; const id = setTimeout(() => { setInfo(''); setErreur(''); }, 4500); return () => clearTimeout(id); }, [info, erreur]);
  const onInfo = useCallback((m) => { setErreur(''); setInfo(m); }, []);
  const onErreur = useCallback((m) => { setInfo(''); setErreur(m); }, []);
  const onglets = [['utilisateurs', 'Utilisateurs'], ['contenus', 'Forum'], ['projets', 'Projets']];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Gestion du site</h1>
          <p className="text-slate-600">Modifiez, bloquez ou supprimez les comptes et les contenus.</p>
        </div>
        <Link to="/admin" className="btn">Signalements et statistiques</Link>
      </div>
      <div role="tablist" className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {onglets.map(([cle, l]) => (
          <button key={cle} role="tab" type="button" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${onglet === cle ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {info && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{info}</div>}
        {erreur && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{erreur}</div>}
        {onglet === 'utilisateurs' && <Utilisateurs estAdmin={user?.role === 'admin'} moi={user?.id} onInfo={onInfo} onErreur={onErreur} />}
        {onglet === 'contenus' && <Contenus onInfo={onInfo} onErreur={onErreur} />}
        {onglet === 'projets' && <Projets onInfo={onInfo} onErreur={onErreur} />}
      </div>
    </div>
  );
}
