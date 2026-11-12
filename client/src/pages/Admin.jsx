import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { messageErreur } from '../services/api';
import { classerSignalement, listerSignalements, statistiques, supprimerContenu } from '../services/admin';
import Pays from '../components/Pays';
import Icone from '../components/Icone';

/* ------------------------------------------------------------------ Signalements */

function Signalement({ item, onFait, onErreur }) {
  const { t } = useTranslation();
  const [confirme, setConfirme] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [motifs, setMotifs] = useState(false);

  const agir = async (action, messageOk) => {
    setOccupe(true);
    try { await action(item.id); onFait(item.id, messageOk); } catch (e) { onErreur(messageErreur(e, t('commun.erreur'))); setOccupe(false); setConfirme(false); }
  };
  const liste = item.signalements || [];

  return (
    <li className="card">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{t(`admin.signalements.types.${item.type}`, item.type)}</span>
        <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-700">{t('admin.signalements.nb', { count: item.nb_signalements })}</span>
        <span className="text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
        {item.auteur && <span className="text-slate-500">{t('admin.signalements.par', { pseudo: item.auteur.pseudo })}</span>}
      </div>
      {item.titre && <h3 className="mt-2 font-semibold">{item.titre}</h3>}
      <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{item.extrait}</p>

      <button type="button" onClick={() => setMotifs(!motifs)} aria-expanded={motifs} className="mt-2 text-xs text-slate-500 underline">{t('admin.signalements.motifs')}</button>
      {motifs && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
          {liste.map((s, i) => <li key={`${s.user_id}-${i}`}>{s.motif || t('admin.signalements.sans_motif')}</li>)}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.question_id && <Link to={`/forum/questions/${item.question_id}`} target="_blank" rel="noopener noreferrer" className="btn-outline !px-3 !py-1.5 text-sm">{t('admin.signalements.voir')}</Link>}
        <button type="button" disabled={occupe} onClick={() => agir(classerSignalement, t('admin.signalements.garde_ok'))} className="btn-outline !px-3 !py-1.5 text-sm">{t('admin.signalements.garder')}</button>
        {!confirme ? (
          <button type="button" disabled={occupe} onClick={() => setConfirme(true)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">{t('admin.signalements.supprimer')}</button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">{t('admin.signalements.confirmer')}</span>
            <button type="button" disabled={occupe} onClick={() => agir(supprimerContenu, t('admin.signalements.supprime_ok'))} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">{t('admin.signalements.oui')}</button>
            <button type="button" onClick={() => setConfirme(false)} className="btn-outline !px-3 !py-1.5 text-sm">{t('admin.signalements.annuler')}</button>
          </span>
        )}
      </div>
    </li>
  );
}

function Signalements({ onInfo }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async (p) => {
    setErreur('');
    try { setDonnees(await listerSignalements({ page: p, limit: 10 })); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); }
  }, [t]);
  useEffect(() => { charger(page); }, [page, charger]);

  const fait = (id, message) => {
    onInfo(message);
    // Page vide après l'action : on revient à la précédente.
    const reste = (donnees?.data || []).filter((x) => x.id !== id);
    if (!reste.length && page > 1) setPage(page - 1); else charger(page);
  };

  if (erreur) return <div className="erreur" role="alert">{erreur}</div>;
  if (!donnees) return <p className="text-slate-500">{t('commun.chargement')}</p>;
  if (!donnees.data.length) {
    return (
      <div className="card text-center">
        <p className="text-3xl text-emerald-600" aria-hidden><Icone nom="succes" /></p>
        <h2 className="mt-2 font-semibold">{t('admin.signalements.vide_titre')}</h2>
        <p className="text-sm text-slate-600">{t('admin.signalements.vide_texte')}</p>
      </div>
    );
  }
  return (
    <>
      <ul className="space-y-3">{donnees.data.map((s) => <Signalement key={s.id} item={s} onFait={fait} onErreur={onInfo} />)}</ul>
      {donnees.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('commun.precedent')}</button>
          <span>{t('commun.page', { page, pages: donnees.pages })}</span>
          <button type="button" className="btn-outline" disabled={page >= donnees.pages} onClick={() => setPage(page + 1)}>{t('commun.suivant')}</button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Statistiques */

function Chiffre({ libelle, valeur, alerte }) {
  return (
    <div className={`rounded-xl border p-4 ${alerte ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className={`text-2xl font-bold ${alerte ? 'text-red-700' : 'text-brand'}`}>{valeur ?? 0}</div>
      <div className="text-sm text-slate-600">{libelle}</div>
    </div>
  );
}

/* Barres sur 14 jours : chaque barre a son texte (survol et lecteurs d'écran). */
function Barres({ titre, serie }) {
  const { t } = useTranslation();
  const total = serie.reduce((s, x) => s + x.n, 0);
  const max = Math.max(1, ...serie.map((x) => x.n));
  return (
    <section className="card" aria-label={titre}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{titre}</h3>
        <span className="text-sm text-slate-500">{t('admin.stats.total_14', { n: total })}</span>
      </div>
      <ol className="mt-3 flex h-32 items-end gap-1" aria-hidden={false}>
        {serie.map((x) => (
          <li key={x.jour} className="flex h-full flex-1 flex-col justify-end" title={t('admin.stats.jour', { jour: x.jour, n: x.n })}>
            <span className="sr-only">{t('admin.stats.jour', { jour: x.jour, n: x.n })}</span>
            <div className="w-full rounded-t bg-brand-light" style={{ height: `${Math.max(x.n ? 6 : 2, (x.n / max) * 100)}%`, opacity: x.n ? 1 : 0.25 }} />
          </li>
        ))}
      </ol>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500" aria-hidden><span>{serie[0]?.jour.slice(5)}</span><span>{serie[serie.length - 1]?.jour.slice(5)}</span></div>
    </section>
  );
}

function Classe({ titre, lignes, rendu }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return (
    <section className="card">
      <h3 className="font-semibold">{titre}</h3>
      {!lignes.length ? <p className="mt-2 text-sm text-slate-500">{t('admin.stats.aucune_donnee')}</p> : (
        <ul className="mt-2 space-y-2">
          {lignes.map((l) => (
            <li key={l.cle} className="text-sm">
              <div className="flex justify-between"><span>{rendu(l)}</span><span className="font-medium">{l.n}</span></div>
              <div className="mt-0.5 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-brand-light" style={{ width: `${(l.n / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Statistiques() {
  const { t } = useTranslation();
  const [s, setS] = useState(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    setErreur(''); setOccupe(true);
    try { setS(await statistiques()); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOccupe(false); }
  }, [t]);
  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <div className="erreur" role="alert">{erreur}</div>;
  if (!s) return <p className="text-slate-500">{t('commun.chargement')}</p>;
  const roles = s.utilisateurs.par_role;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-500">{t('admin.stats.maj', { heure: new Date(s.genere_le).toLocaleTimeString() })}</span>
        <button type="button" onClick={charger} disabled={occupe} className="btn-outline !px-3 !py-1.5 text-sm">{occupe ? t('commun.chargement') : t('admin.stats.actualiser')}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre libelle={t('admin.stats.utilisateurs')} valeur={s.utilisateurs.total} />
        <Chiffre libelle={t('admin.stats.nouveaux')} valeur={s.utilisateurs.nouveaux_7j} />
        <Chiffre libelle={t('admin.stats.questions')} valeur={s.forum.questions} />
        <Chiffre libelle={t('admin.stats.reponses')} valeur={s.forum.reponses} />
        <Chiffre libelle={t('admin.stats.resolues')} valeur={s.forum.resolues} />
        <Chiffre libelle={t('admin.stats.sans_reponse')} valeur={s.forum.sans_reponse} />
        <Chiffre libelle={t('admin.stats.projets')} valeur={s.projets.total} />
        <Chiffre libelle={t('admin.stats.projets_en_cours')} valeur={s.projets.en_cours} />
        <Chiffre libelle={t('admin.stats.messages')} valeur={s.communication.messages} />
        <Chiffre libelle={t('admin.stats.vocaux')} valeur={s.communication.vocaux} />
        <Chiffre libelle={t('admin.stats.candidatures')} valeur={s.collaboration.candidatures} />
        <Chiffre libelle={t('admin.stats.mentorats')} valeur={s.collaboration.mentorats} />
        <Chiffre libelle={t('admin.stats.signalements')} valeur={s.moderation.signalements_en_attente} alerte={s.moderation.signalements_en_attente > 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Barres titre={t('admin.stats.inscriptions')} serie={s.inscriptions_14j} />
        <Barres titre={t('admin.stats.questions_jour')} serie={s.questions_14j} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Classe titre={t('admin.stats.top_pays')} lignes={s.top_pays.map((x) => ({ cle: x.code, n: x.n, code: x.code }))} rendu={(l) => <Pays code={l.code} avecNom />} />
        <Classe titre={t('admin.stats.top_tags')} lignes={s.top_tags.map((x) => ({ cle: x.tag, n: x.n, tag: x.tag }))} rendu={(l) => `#${l.tag}`} />
        <Classe titre={t('admin.stats.roles')} lignes={['admin', 'moderateur', 'dev'].map((r) => ({ cle: r, n: roles[r], r }))} rendu={(l) => t(`admin.stats.role_${l.r}`)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

export default function Admin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [onglet, setOnglet] = useState('signalements');
  const [info, setInfo] = useState('');
  useEffect(() => { if (!info) return undefined; const id = setTimeout(() => setInfo(''), 4000); return () => clearTimeout(id); }, [info]);

  const onglets = [['signalements', t('admin.onglet_signalements')], ['stats', t('admin.onglet_stats')]];
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('admin.titre')}</h1>
      <p className="text-slate-600">{t('admin.sous_titre')}</p>
      <p className="mt-1 text-xs text-slate-500">{t('admin.role', { role: user?.role })}</p>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-slate-200">
        {onglets.map(([cle, libelle]) => (
          <button key={cle} role="tab" type="button" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${onglet === cle ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{libelle}</button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {info && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{info}</div>}
        {onglet === 'signalements' ? <Signalements onInfo={setInfo} /> : <Statistiques />}
      </div>
    </div>
  );
}
