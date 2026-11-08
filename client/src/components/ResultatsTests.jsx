import { useTranslation } from 'react-i18next';

const montrer = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };

/* Résultat de chaque test : les tests visibles montrent entrée, attendu et obtenu ; les tests cachés disent seulement réussi ou raté. */
export default function ResultatsTests({ tests, resultats }) {
  const { t } = useTranslation();
  const reussis = resultats.filter((r) => r.ok).length;
  return (
    <div className="card" aria-live="polite">
      <p className="mb-2 font-semibold">
        {t('defi.tests_reussis', { reussis, total: tests.length })}
        {reussis === tests.length && <span className="ml-2 text-emerald-600">✓ {t('defi.tout_passe')}</span>}
      </p>
      <ul className="space-y-1.5 text-sm">
        {tests.map((x, i) => {
          const r = resultats[i];
          if (!r) return null;
          return (
            <li key={i} className={`rounded-lg px-3 py-1.5 ${r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              <span className="font-medium">{r.ok ? '✓' : '✗'} {x.visible ? t('defi.test_visible', { n: i + 1 }) : t('defi.test_cache', { n: i + 1 })}</span>
              {x.visible && (
                <span className="mt-0.5 block font-mono text-xs">
                  {t('defi.entree')} {montrer(x.entree)} → {t('defi.attendu')} {montrer(x.attendu)}
                  {!r.ok && <> · {r.erreur ? `${t('defi.erreur')} ${r.erreur}` : `${t('defi.obtenu')} ${r.obtenu}`}</>}
                </span>
              )}
              {!x.visible && !r.ok && r.erreur && /Temps|promesse/.test(r.erreur) && <span className="ml-1 text-xs">({r.erreur})</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
