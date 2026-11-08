import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDefi, getDefiCourant, listerDefis, demarrerDefi, soumettreDefi } from '../services/defis';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { executerTests } from '../lib/sandboxDefi';
import { formaterDuree, tempsRestant } from '../lib/defis';
import EditeurCode from '../components/EditeurCode';
import ResultatsTests from '../components/ResultatsTests';
import RichText from '../components/RichText';
import Avatar from '../components/Avatar';

const cleBrouillon = (id) => `defi_brouillon_${id}`;
const lireBrouillon = (id) => { try { return localStorage.getItem(cleBrouillon(id)) || ''; } catch { return ''; } };
const ecrireBrouillon = (id, code) => { try { localStorage.setItem(cleBrouillon(id), code); } catch { /* ignore */ } };

export default function Defi() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(undefined); // undefined : chargement ; { defi: null } : aucun défi
  const [autres, setAutres] = useState([]);
  const [erreur, setErreur] = useState('');
  // Essai en cours
  const [session, setSession] = useState(null); // { tests, debut_at }
  const [code, setCode] = useState('');
  const [resultats, setResultats] = useState(null);
  const [essais, setEssais] = useState(0);
  const collages = useRef(0);
  const [occupe, setOccupe] = useState(false);
  const [maintenant, setMaintenant] = useState(Date.now());

  const charger = useCallback(() => {
    setErreur('');
    return (id ? getDefi(id) : getDefiCourant()).then(setData).catch((e) => { setErreur(messageErreur(e)); setData({ defi: null }); });
  }, [id]);

  useEffect(() => { setData(undefined); setSession(null); setResultats(null); setEssais(0); charger(); }, [charger]);
  useEffect(() => { listerDefis().then(setAutres).catch(() => {}); }, []);
  useEffect(() => { const i = setInterval(() => setMaintenant(Date.now()), 1000); return () => clearInterval(i); }, []);

  const defi = data?.defi;
  const moi = data?.ma_participation;

  const commencer = async () => {
    setErreur(''); setOccupe(true);
    try {
      const r = await demarrerDefi(defi.id);
      if (r.deja_reussi) { await charger(); return; }
      setSession({ tests: r.tests, debut_at: r.debut_at });
      setCode(r.code || lireBrouillon(defi.id) || defi.code_depart);
      setResultats(null);
    } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); }
  };

  const changerCode = (c) => { setCode(c); if (defi) ecrireBrouillon(defi.id, c); };

  const lancer = async () => {
    setOccupe(true); setErreur('');
    const r = await executerTests({ code, nomFonction: defi.nom_fonction, tests: session.tests });
    setOccupe(false);
    setEssais((n) => n + 1);
    if (r.erreur === 'execution_impossible') { setErreur(t('defi.execution_impossible')); return; }
    if (r.erreur) { setErreur(`${t('defi.erreur_code')} ${r.erreur}`); setResultats(r.resultats.length ? r.resultats : null); return; }
    setResultats(r.resultats);
  };

  const toutPasse = resultats && resultats.length === session?.tests.length && resultats.every((r) => r.ok);

  const soumettre = async () => {
    setOccupe(true); setErreur('');
    try {
      const reussis = resultats.filter((r) => r.ok).length;
      const maj = await soumettreDefi(defi.id, { code, tests_reussis: reussis, total: session.tests.length, essais: Math.max(1, essais), paste_bloques: collages.current });
      setData(maj); setSession(null);
    } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); }
  };

  if (data === undefined) return <p className="text-slate-500">{t('commun.chargement')}</p>;

  const peutLancerDefi = user && ['admin', 'moderateur'].includes(user.role);
  const enCours = defi?.statut === 'en_cours';
  const reste = defi ? tempsRestant(defi.fin, maintenant) : null;
  const ecoule = session ? Math.max(0, Math.round((maintenant - new Date(session.debut_at).getTime()) / 1000)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('defi.titre_page')}</h1>
        {peutLancerDefi && <Link to="/defi/nouveau" className="btn-outline">{t('defi.lancer')}</Link>}
      </div>

      {erreur && <div className="erreur" role="alert">{erreur}</div>}

      {!defi ? (
        <div className="card text-slate-600">{t('defi.aucun')}</div>
      ) : (
        <>
          <section className="card">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${enCours ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{t(`defi.statut_${defi.statut}`)}</span>
              {enCours && reste && <span className="text-slate-600">⏳ {t('defi.reste', { temps: reste })}</span>}
              <span className="text-slate-500">· {t('defi.participants', { count: data.participants })} · {t('defi.reussis', { count: data.reussis })}</span>
              {defi.tags.map((tag) => <span key={tag} className="rounded bg-slate-100 px-1.5 text-xs">{tag}</span>)}
            </div>
            <h2 className="mt-2 text-xl font-bold">{defi.titre}</h2>
            <div className="mt-2 text-[15px] leading-relaxed text-slate-800"><RichText texte={defi.enonce} /></div>
            {defi.exemples.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold">{t('defi.exemples')}</p>
                <ul className="mt-1 space-y-1 font-mono text-xs text-slate-700">
                  {defi.exemples.map((x, i) => <li key={i} className="rounded bg-slate-50 px-2 py-1">{defi.nom_fonction}({x.entree.map((a) => JSON.stringify(a)).join(', ')}) → {JSON.stringify(x.attendu)}</li>)}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">{t('defi.regle', { cache: defi.nb_tests - defi.exemples.length })}</p>
          </section>

          {/* Participation */}
          {!user && enCours && <div className="card">{t('defi.connexion')} <Link to="/connexion" className="font-semibold text-brand underline">{t('defi.se_connecter')}</Link></div>}

          {user && moi?.reussi && (
            <div className="card border-l-4 border-emerald-500" role="status">
              <p className="font-semibold">🎉 {t('defi.reussi', { temps: formaterDuree(moi.duree_s), essais: moi.essais })}</p>
              {moi.rang && <p className="text-sm text-slate-600">{t('defi.ton_rang', { rang: moi.rang })}</p>}
            </div>
          )}

          {user && enCours && !moi?.reussi && !session && (
            <div className="card">
              <p className="mb-3 text-slate-700">{moi?.commence ? t('defi.reprendre_texte') : t('defi.commencer_texte')}</p>
              <button type="button" className="btn" onClick={commencer} disabled={occupe}>{moi?.commence ? t('defi.reprendre') : t('defi.commencer')}</button>
            </div>
          )}

          {session && (
            <section className="space-y-3" aria-label={t('defi.espace')}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-lg font-semibold text-brand" aria-label={t('defi.chrono')}>⏱ {formaterDuree(ecoule)}</span>
                <span className="text-slate-500">{t('defi.essais', { count: essais })}</span>
              </div>
              <EditeurCode valeur={code} onChange={changerCode} onCollageBloque={() => { collages.current += 1; setErreur(t('defi.collage_refuse')); }} disabled={occupe} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline" onClick={lancer} disabled={occupe}>{occupe ? t('defi.execution') : t('defi.lancer_tests')}</button>
                <button type="button" className="btn" onClick={soumettre} disabled={occupe || !toutPasse}>{t('defi.soumettre')}</button>
              </div>
              {!toutPasse && <p className="text-xs text-slate-500">{t('defi.soumettre_aide')}</p>}
              {resultats && <ResultatsTests tests={session.tests} resultats={resultats} />}
            </section>
          )}

          {/* Classement */}
          <section className="card">
            <h2 className="mb-2 font-semibold">{t('defi.classement')}</h2>
            {data.classement.length === 0 ? (
              <p className="text-sm text-slate-500">{t('defi.classement_vide')}</p>
            ) : (
              <ol>
                {[...data.classement, ...(data.mon_classement ? [data.mon_classement] : [])].map((c, i) => (
                  <li key={c.rang} className={`flex items-center gap-3 border-b border-slate-100 py-2 last:border-0 ${c.user && user && c.user.id === user.id ? 'bg-amber-50' : ''} ${data.mon_classement && i === data.classement.length ? 'mt-2 border-t border-dashed' : ''}`}>
                    <span className="w-7 text-center font-bold tabular-nums text-slate-500">{c.rang <= 3 ? ['🥇', '🥈', '🥉'][c.rang - 1] : c.rang}</span>
                    {c.user && <Avatar user={c.user} size={32} />}
                    <span className="min-w-0 flex-1 truncate font-medium">{c.user ? c.user.pseudo : t('defi.anonyme')}{c.user && user && c.user.id === user.id && <span className="ml-1 text-xs font-normal text-slate-500">({t('defi.vous')})</span>}</span>
                    <span className="font-mono text-sm tabular-nums text-brand">{formaterDuree(c.duree_s)}</span>
                    <span className="hidden w-20 text-right text-xs text-slate-500 sm:block">{t('defi.essais', { count: c.essais })}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {autres.length > 1 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">{t('defi.autres')}</h2>
          <ul className="space-y-1 text-sm">
            {autres.map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <Link to={`/defi/${d.id}`} className={`truncate hover:underline ${defi && d.id === defi.id ? 'font-semibold text-brand' : ''}`}>{d.titre}</Link>
                <span className="shrink-0 text-slate-500">{t(`defi.statut_${d.statut}`)} · {t('defi.participants', { count: d.participants })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
