import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { creerDefi } from '../services/defis';
import { messageErreur } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { executerTests } from '../lib/sandboxDefi';
import { lireJson, REGEX_NOM_FONCTION } from '../lib/defis';

const LIGNE_VIDE = { entree: '', attendu: '', visible: false };

/* Création d'un défi (administrateur ou modérateur). Exigeant : la solution de référence doit réussir tous les tests
   avant la publication, sinon le défi serait impossible ou faux. Elle n'est pas enregistrée. */
export default function DefiNouveau() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ titre: '', enonce: '', nom_fonction: '', tags: 'javascript', jours: 7, solution: '' });
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE, visible: true }, { ...LIGNE_VIDE, visible: true }, { ...LIGNE_VIDE }]);
  const [erreur, setErreur] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [occupe, setOccupe] = useState(false);

  if (!user || !['admin', 'moderateur'].includes(user.role)) return <div className="erreur">{t('defi.reserve')}</div>;

  const maj = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const majLigne = (i, k, v) => setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  // Lit les lignes de tests ; renvoie { tests } ou { erreur }.
  const lireTests = () => {
    const tests = [];
    for (let i = 0; i < lignes.length; i += 1) {
      const e = lireJson(lignes[i].entree);
      const a = lireJson(lignes[i].attendu);
      if (!e.ok || !Array.isArray(e.valeur)) return { erreur: t('defi.err_entree', { n: i + 1 }) };
      if (!a.ok) return { erreur: t('defi.err_attendu', { n: i + 1 }) };
      tests.push({ entree: e.valeur, attendu: a.valeur, visible: lignes[i].visible });
    }
    return { tests };
  };

  const verifier = async () => {
    setErreur(''); setVerdict(null);
    if (!REGEX_NOM_FONCTION.test(f.nom_fonction)) { setErreur(t('defi.err_nom')); return null; }
    const lu = lireTests();
    if (lu.erreur) { setErreur(lu.erreur); return null; }
    if (lu.tests.length < 3 || !lu.tests.some((x) => x.visible) || !lu.tests.some((x) => !x.visible)) { setErreur(t('defi.err_regles_tests')); return null; }
    if (!f.solution.trim()) { setErreur(t('defi.err_solution')); return null; }
    const r = await executerTests({ code: f.solution, nomFonction: f.nom_fonction, tests: lu.tests });
    setVerdict(r);
    if (r.erreur || !r.resultats.every((x) => x.ok)) { setErreur(t('defi.err_solution_echoue')); return null; }
    return lu.tests;
  };

  const publier = async (e) => {
    e.preventDefault();
    setOccupe(true);
    try {
      const tests = await verifier();
      if (!tests) return;
      const d = await creerDefi({
        titre: f.titre, enonce: f.enonce, nom_fonction: f.nom_fonction,
        tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5),
        jours: Number(f.jours) || 7, tests,
      });
      navigate(`/defi/${d.id}`);
    } catch (err) { setErreur(messageErreur(err)); } finally { setOccupe(false); }
  };

  return (
    <form onSubmit={publier} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('defi.lancer')}</h1>
        <Link to="/defi" className="btn-outline">{t('defi.retour')}</Link>
      </div>
      {erreur && <div className="erreur" role="alert">{erreur}</div>}

      <div className="card space-y-3">
        <label className="block"><span className="mb-1 block text-sm font-medium">{t('defi.f_titre')} *</span>
          <input className="input" value={f.titre} onChange={(e) => maj('titre', e.target.value)} required minLength={3} maxLength={100} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">{t('defi.f_enonce')} *</span>
          <textarea className="input" rows={5} value={f.enonce} onChange={(e) => maj('enonce', e.target.value)} required minLength={10} maxLength={3000} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="mb-1 block text-sm font-medium">{t('defi.f_fonction')} *</span>
            <input className="input font-mono" value={f.nom_fonction} onChange={(e) => maj('nom_fonction', e.target.value)} required placeholder="inverser" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">{t('defi.f_tags')}</span>
            <input className="input" value={f.tags} onChange={(e) => maj('tags', e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">{t('defi.f_jours')}</span>
            <input className="input" type="number" min={1} max={30} value={f.jours} onChange={(e) => maj('jours', e.target.value)} /></label>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">{t('defi.f_tests')}</h2>
        <p className="text-sm text-slate-600">{t('defi.f_tests_aide')}</p>
        {lignes.map((l, i) => (
          <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input className="input font-mono text-sm" value={l.entree} onChange={(e) => majLigne(i, 'entree', e.target.value)} placeholder='["abc"]' aria-label={t('defi.entree_n', { n: i + 1 })} />
            <input className="input font-mono text-sm" value={l.attendu} onChange={(e) => majLigne(i, 'attendu', e.target.value)} placeholder='"cba"' aria-label={t('defi.attendu_n', { n: i + 1 })} />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={l.visible} onChange={(e) => majLigne(i, 'visible', e.target.checked)} />{t('defi.visible')}</label>
            <button type="button" className="text-sm text-red-600 hover:underline disabled:opacity-40" disabled={lignes.length <= 3} onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))}>{t('defi.retirer')}</button>
          </div>
        ))}
        {lignes.length < 30 && <button type="button" className="btn-outline" onClick={() => setLignes((ls) => [...ls, { ...LIGNE_VIDE }])}>{t('defi.ajouter_test')}</button>}
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">{t('defi.f_solution')} *</h2>
        <p className="text-sm text-slate-600">{t('defi.f_solution_aide')}</p>
        <textarea className="input font-mono text-sm" rows={6} value={f.solution} onChange={(e) => maj('solution', e.target.value)} spellCheck={false} />
        {verdict && (
          <p className={`text-sm ${verdict.resultats.every((x) => x.ok) && !verdict.erreur ? 'text-emerald-700' : 'text-red-700'}`}>
            {verdict.erreur ? `${t('defi.erreur_code')} ${verdict.erreur}` : t('defi.tests_reussis', { reussis: verdict.resultats.filter((x) => x.ok).length, total: verdict.resultats.length })}
          </p>
        )}
        <button type="button" className="btn-outline" onClick={verifier} disabled={occupe}>{t('defi.verifier')}</button>
      </div>

      <button type="submit" className="btn" disabled={occupe}>{t('defi.publier')}</button>
    </form>
  );
}
