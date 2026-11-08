import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { nomPays } from '../lib/forum';
import { VIEWBOX, PAYS_AFRIQUE, VOISINS } from '../data/afriqueCarte';

// Du plus clair (aucun membre) au plus foncé (le plus de membres).
const COULEURS = ['#e2e8f0', '#bfdbfe', '#60a5fa', '#2563eb', '#1F3864'];

// Niveau 0 à 4 selon la part du pays le plus peuplé.
function niveau(total, max) {
  if (!total) return 0;
  const r = total / max;
  return r >= 0.75 ? 4 : r >= 0.4 ? 3 : r >= 0.15 ? 2 : 1;
}

export default function Carte() {
  const { t, i18n } = useTranslation();
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [survol, setSurvol] = useState(null);
  const [actif, setActif] = useState(null);

  useEffect(() => {
    api.get('/meta/pays').then((r) => setDonnees(r.data)).catch(() => setErreur(true));
  }, []);

  const totaux = useMemo(() => Object.fromEntries((donnees?.pays || []).map((p) => [p.pays, p.total])), [donnees]);
  const max = donnees?.pays?.[0]?.total || 1;
  const nom = (code) => nomPays(code, i18n.language);
  // Le pays choisi est dessiné en dernier : son contour passe au-dessus de ses voisins.
  const ordre = useMemo(() => [...PAYS_AFRIQUE].sort((a, b) => (a.code === actif) - (b.code === actif)), [actif]);

  const courant = survol || actif;
  const compte = (code) => (totaux[code] ? t('carte.nb_devs', { count: totaux[code] }) : t('carte.aucun_dev'));

  if (erreur) return <div className="erreur" role="alert">{t('carte.erreur')}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('carte.titre')}</h1>
      <p className="mb-4 mt-1 max-w-2xl text-slate-600">{t('carte.sous_titre')}</p>

      {donnees && (
        <dl className="mb-4 grid max-w-md grid-cols-2 gap-3">
          <div className="card text-center"><dt className="text-xs uppercase tracking-wide text-slate-500">{t('carte.membres')}</dt><dd className="text-2xl font-bold text-brand">{donnees.membres}</dd></div>
          <div className="card text-center"><dt className="text-xs uppercase tracking-wide text-slate-500">{t('carte.pays_representes')}</dt><dd className="text-2xl font-bold text-brand">{donnees.pays.length}</dd></div>
        </dl>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="card relative overflow-hidden p-2 sm:p-4" aria-label={t('carte.aria_carte')}>
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-1.5 text-sm shadow" aria-live="polite">
            {courant
              ? <><strong>{nom(courant)}</strong> · {compte(courant)}</>
              : <span className="text-slate-500">{t('carte.invite')}</span>}
          </div>
          <svg viewBox={VIEWBOX} className="mx-auto block h-auto w-full max-w-[680px]" role="group" aria-label={t('carte.aria_carte')}>
            <path d={VOISINS} fill="#eef2f7" stroke="#fff" strokeWidth="1" />
            {ordre.map((p, i) => {
              const total = totaux[p.code] || 0;
              const choisi = actif === p.code;
              return (
                <path key={p.code} d={p.d} fill={COULEURS[niveau(total, max)]}
                  stroke={choisi ? '#f59e0b' : '#fff'} strokeWidth={choisi ? 3 : 1.4} strokeLinejoin="round"
                  className="cursor-pointer outline-none transition-[filter] hover:brightness-90 focus-visible:brightness-90"
                  style={{ animation: `fade-in 0.5s ${Math.min(i, 30) * 18}ms both` }}
                  tabIndex={0} role="button" aria-pressed={choisi} aria-label={`${nom(p.code)} : ${compte(p.code)}`}
                  onPointerEnter={() => setSurvol(p.code)} onPointerLeave={() => setSurvol(null)}
                  onFocus={() => setSurvol(p.code)} onBlur={() => setSurvol(null)}
                  onClick={() => setActif(choisi ? null : p.code)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActif(choisi ? null : p.code); } }} />
              );
            })}
            {/* Code du pays sur les pays assez grands et peuplés */}
            {PAYS_AFRIQUE.filter((p) => totaux[p.code] && p.aire > 1500).map((p) => (
              <text key={`t${p.code}`} x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700"
                fill={niveau(totaux[p.code], max) >= 3 ? '#fff' : '#1e293b'} pointerEvents="none">{p.code}</text>
            ))}
          </svg>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600" aria-hidden>
            <span>{t('carte.legende_moins')}</span>
            {COULEURS.map((c) => <span key={c} className="h-3 w-6 rounded-sm border border-slate-300" style={{ background: c }} />)}
            <span>{t('carte.legende_plus')}</span>
          </div>
        </section>

        <aside className="space-y-4">
          {actif && (
            <div className="card border-l-4 border-accent" aria-live="polite">
              <h2 className="text-lg font-bold">{nom(actif)}</h2>
              <p className="text-slate-600">{compte(actif)}</p>
              {totaux[actif]
                ? <Link to={`/developpeurs?pays=${actif}`} className="btn mt-3 inline-block">{t('carte.voir_devs')}</Link>
                : <p className="mt-2 text-sm text-slate-500">{t('carte.premier')}</p>}
            </div>
          )}
          <div className="card">
            <h2 className="mb-2 font-semibold">{t('carte.classement')}</h2>
            {!donnees
              ? <p className="text-sm text-slate-500">{t('commun.chargement')}</p>
              : donnees.pays.length === 0
                ? <p className="text-sm text-slate-500">{t('carte.aucune_donnee')}</p>
                : (
                  <ol className="space-y-2">
                    {donnees.pays.slice(0, 8).map((p) => (
                      <li key={p.pays}>
                        <button type="button" onClick={() => setActif(p.pays)} className="block w-full text-left">
                          <span className="flex justify-between text-sm"><span>{nom(p.pays)}</span><span className="font-semibold text-brand">{p.total}</span></span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(6, (p.total / max) * 100)}%` }} /></span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
          </div>
        </aside>
      </div>
    </div>
  );
}
