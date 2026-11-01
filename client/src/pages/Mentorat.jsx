import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { accepterDemande, listerMentors, mesDemandes, refuserDemande, retirerDemande, terminerAccompagnement } from '../services/mentorat';
import { updateMe } from '../services/users';
import { messageErreur } from '../services/api';
import useDebounce from '../hooks/useDebounce';
import MentorCarte from '../components/MentorCarte';
import DemandeMentoratModal from '../components/DemandeMentoratModal';
import DemandeMentoratCarte from '../components/DemandeMentoratCarte';

const OFFRE = 'offrir_mentorat';

export default function Mentorat() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const onglet = params.get('onglet') === 'demandes' && user ? 'demandes' : 'mentors';
  const stack = params.get('stack') || '';
  const pays = (params.get('pays') || '').toUpperCase();
  const qUrl = params.get('q') || '';

  const [recherche, setRecherche] = useState(qUrl);
  const rechercheDiff = useDebounce(recherche);
  const [mentors, setMentors] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [etat, setEtat] = useState('chargement');
  const [erreur, setErreur] = useState('');
  const [plus, setPlus] = useState(false);
  const [cible, setCible] = useState(null);
  const [info, setInfo] = useState('');
  const [demandes, setDemandes] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [offre, setOffre] = useState(false);

  const estMentor = Boolean(user?.objectifs?.includes(OFFRE));

  const maj = useCallback((chg) => {
    const p = Object.fromEntries(params.entries());
    Object.entries(chg).forEach(([k, v]) => { if (v) p[k] = v; else delete p[k]; });
    setParams(p, { replace: true });
  }, [params, setParams]);

  useEffect(() => { if (rechercheDiff !== qUrl) maj({ q: rechercheDiff.trim() }); }, [rechercheDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtre = { limit: 12, ...(stack && { stack }), ...(/^[A-Z]{2}$/.test(pays) && { pays }), ...(qUrl && { q: qUrl }) };

  const charger = useCallback(() => {
    setEtat('chargement');
    listerMentors({ ...filtre, page: 1 })
      .then((d) => { setMentors(d.data); setPage(1); setPages(d.pages || 1); setTotal(d.total ?? d.data.length); setEtat('ok'); })
      .catch((e) => { setErreur(messageErreur(e, t('commun.erreur'))); setEtat('erreur'); });
  }, [stack, pays, qUrl, user?.id, t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (onglet === 'mentors') charger(); }, [charger, onglet]);

  const chargerDemandes = useCallback(() => {
    mesDemandes().then(setDemandes).catch((e) => setErreur(messageErreur(e, t('commun.erreur'))));
  }, [t]);
  useEffect(() => { if (user) chargerDemandes(); }, [user?.id, chargerDemandes]); // eslint-disable-line react-hooks/exhaustive-deps

  const voirPlus = async () => {
    setPlus(true);
    try {
      const d = await listerMentors({ ...filtre, page: page + 1 });
      setMentors((prev) => [...prev, ...d.data.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1); setPages(d.pages);
    } catch { /* réessayer */ } finally { setPlus(false); }
  };

  const agir = async (fn, id) => {
    setOccupe(true); setErreur('');
    try { await fn(id); await chargerDemandes(); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOccupe(false); }
  };

  const basculerOffre = async () => {
    setOffre(true); setErreur(''); setInfo('');
    const actuels = user.objectifs || [];
    const objectifs = estMentor ? actuels.filter((o) => o !== OFFRE) : [...actuels, OFFRE];
    try {
      await updateMe({ objectifs });
      await refresh();
      setInfo(t(estMentor ? 'mentorat.devenir_retire' : 'mentorat.devenir_ok'));
      if (onglet === 'mentors') charger();
    } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); } finally { setOffre(false); }
  };

  const onglets = [['mentors', t('mentorat.onglet_mentors')], ...(user ? [['demandes', t('mentorat.onglet_demandes')]] : [])];
  const aTraiter = demandes?.a_traiter || 0;
  const filtres = Boolean(qUrl || stack || pays);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t('mentorat.titre')}</h1>
        <p className="text-slate-600">{t('mentorat.sous_titre')}</p>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
        {onglets.map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle} onClick={() => maj({ onglet: cle === 'mentors' ? '' : cle })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${onglet === cle ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {libelle}{cle === 'demandes' && aTraiter > 0 && <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{aTraiter}</span>}
          </button>
        ))}
      </div>

      {info && <div className="anim-fade mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900" role="status">{info}</div>}
      {erreur && etat !== 'erreur' && <div className="erreur mb-3" role="alert">{erreur}</div>}

      {onglet === 'mentors' && (
        <div>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">🎓 {t('mentorat.devenir_titre')}</h2>
              <p className="text-sm text-slate-600">{user && estMentor ? t('mentorat.devenir_actif') : t('mentorat.devenir_texte')}</p>
            </div>
            {user
              ? <button type="button" onClick={basculerOffre} disabled={offre} className={estMentor ? 'btn-outline' : 'btn'}>{estMentor ? t('mentorat.devenir_retirer') : t('mentorat.devenir_oui')}</button>
              : <Link to="/connexion" className="btn">{t('mentorat.connexion_demander')}</Link>}
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <input type="search" className="input" aria-label={t('mentorat.rechercher_placeholder')} placeholder={t('mentorat.rechercher_placeholder')} value={recherche} onChange={(e) => setRecherche(e.target.value)} maxLength={100} />
            <input className="input" aria-label={t('mentorat.stack_placeholder')} placeholder={t('mentorat.stack_placeholder')} value={stack} onChange={(e) => maj({ stack: e.target.value.trim().toLowerCase() })} maxLength={60} />
            <input className="input uppercase" aria-label={t('mentorat.pays_placeholder')} placeholder={t('mentorat.pays_placeholder')} value={pays} onChange={(e) => maj({ pays: e.target.value.trim() })} maxLength={2} />
          </div>
          <div aria-live="polite" className="mb-2 text-sm text-slate-500">{etat === 'ok' && t('mentorat.nb_mentors', { count: total })}</div>

          {etat === 'chargement' && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((i) => <li key={i} className="card h-44"><div className="flex gap-3"><div className="shimmer h-12 w-12 rounded-full" /><div className="flex-1"><div className="shimmer h-4 w-2/3 rounded" /><div className="shimmer mt-2 h-3 w-1/2 rounded" /></div></div><div className="shimmer mt-4 h-3 w-full rounded" /><div className="shimmer mt-2 h-3 w-5/6 rounded" /></li>)}
            </ul>
          )}
          {etat === 'erreur' && <div className="card text-center"><p className="erreur">{erreur}</p><button type="button" onClick={charger} className="btn mt-3">{t('chat.reessayer')}</button></div>}
          {etat === 'ok' && mentors.length === 0 && (
            <div className="card py-10 text-center">
              <p className="text-lg font-semibold text-slate-800">{t('mentorat.aucun')}</p>
              <p className="mx-auto mt-1 max-w-sm text-slate-600">{t('mentorat.aucun_texte')}</p>
              {filtres && <button type="button" onClick={() => { setRecherche(''); setParams({}, { replace: true }); }} className="btn-outline mt-4">{t('mentorat.effacer_filtres')}</button>}
            </div>
          )}
          {etat === 'ok' && mentors.length > 0 && <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mentors.map((m) => <li key={m.id}><MentorCarte m={m} moi={user} onDemander={setCible} versConnexion={() => navigate('/connexion', { state: { from: '/mentorat' } })} /></li>)}</ul>}
          {etat === 'ok' && page < pages && <div className="mt-5 text-center"><button type="button" onClick={voirPlus} disabled={plus} className="btn-outline">{plus ? t('commun.chargement') : t('mentorat.voir_plus')}</button></div>}
        </div>
      )}

      {onglet === 'demandes' && (
        <div className="space-y-6">
          {!demandes && !erreur && <div className="card h-24"><div className="shimmer h-4 w-1/3 rounded" /></div>}
          {demandes && (
            <>
              <section>
                <h2 className="mb-2 text-lg font-semibold">{t('mentorat.recues')}</h2>
                {demandes.recues.length === 0
                  ? <p className="card text-slate-500">{t('mentorat.aucune_recue')}</p>
                  : <ul className="stagger space-y-2">{demandes.recues.map((d) => <DemandeMentoratCarte key={d.id} d={d} type="recue" moiId={user.id} occupe={occupe} onAccepter={(id) => agir(accepterDemande, id)} onRefuser={(id) => agir(refuserDemande, id)} onTerminer={(id) => agir(terminerAccompagnement, id)} />)}</ul>}
              </section>
              <section>
                <h2 className="mb-2 text-lg font-semibold">{t('mentorat.envoyees')}</h2>
                {demandes.envoyees.length === 0
                  ? <div className="card text-slate-500"><p>{t('mentorat.aucune_envoyee')}</p><button type="button" onClick={() => maj({ onglet: '' })} className="btn mt-3">{t('mentorat.trouver')}</button></div>
                  : <ul className="stagger space-y-2">{demandes.envoyees.map((d) => <DemandeMentoratCarte key={d.id} d={d} type="envoyee" moiId={user.id} occupe={occupe} onTerminer={(id) => agir(terminerAccompagnement, id)} onRetirer={(id) => agir(retirerDemande, id)} />)}</ul>}
              </section>
            </>
          )}
        </div>
      )}

      {cible && <DemandeMentoratModal mentor={cible} onFermer={() => setCible(null)} onEnvoye={() => { setCible(null); setInfo(t('mentorat.envoyee_ok')); charger(); chargerDemandes(); }} />}
    </div>
  );
}
