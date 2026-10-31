import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { canalStack, canalVille, lireCanal, lireRecents, majuscule } from '../lib/canaux';
import Conversation from '../components/Conversation';

const lien = (canal) => `/messages/${encodeURIComponent(canal)}`;

function Salon({ canal, nom, actif }) {
  const infos = lireCanal(canal);
  if (!infos) return null;
  const label = infos.type === 'stack' ? `#${infos.valeur}` : infos.type === 'ville' ? majuscule(infos.valeur) : `@${nom || '…'}`;
  return (
    <Link
      to={lien(canal)}
      aria-current={actif ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] transition-colors ${actif ? 'bg-brand font-medium text-white' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      {infos.type === 'ville' && <span aria-hidden>📍</span>}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canal: param } = useParams();
  const navigate = useNavigate();
  const canal = param ? decodeURIComponent(param) : null;
  const [recents, setRecents] = useState(lireRecents);
  const [type, setType] = useState('stack');
  const [saisie, setSaisie] = useState('');
  const [invalide, setInvalide] = useState(false);

  // Le salon ouvert rejoint la liste des récents (la conversation l'enregistre déjà ; on relit pour afficher).
  useEffect(() => { setRecents(lireRecents()); }, [canal]);

  const nomPrive = useCallback((c, pseudo) => {
    setRecents((r) => r.map((x) => (x.canal === c ? { ...x, nom: pseudo } : x)));
  }, []);

  const suggestions = useMemo(() => {
    const liste = [];
    (user?.stacks || []).slice(0, 6).forEach((s) => { const c = canalStack(s); if (c) liste.push(c); });
    const v = canalVille(user?.ville);
    if (v) liste.push(v);
    return liste;
  }, [user]);

  const rejoindre = (e) => {
    e.preventDefault();
    const c = type === 'stack' ? canalStack(saisie) : canalVille(saisie);
    if (!c) { setInvalide(true); return; }
    setInvalide(false);
    setSaisie('');
    navigate(lien(c));
  };

  const prives = recents.filter((r) => r.canal.startsWith('prive:'));
  const publics = recents.filter((r) => !r.canal.startsWith('prive:'));

  return (
    <div className="-mx-4 -mt-6 h-[calc(100dvh-9.5rem)] overflow-hidden border-slate-200 bg-white md:mx-0 md:mt-0 md:h-[calc(100dvh-7rem)] md:rounded-xl md:border md:shadow-sm">
      <div className="grid h-full md:grid-cols-[17rem_1fr]">
        <aside className={`${canal ? 'hidden md:flex' : 'flex'} min-h-0 flex-col overflow-y-auto border-slate-200 md:border-r`} aria-label={t('chat.salons')}>
          <h1 className="px-4 pb-1 pt-4 text-xl font-bold">{t('chat.titre')}</h1>

          <form onSubmit={rejoindre} className="space-y-2 px-4 pb-3 pt-2">
            <div className="flex gap-1 text-sm" role="group" aria-label={t('chat.type_salon')}>
              {['stack', 'ville'].map((x) => (
                <button key={x} type="button" onClick={() => { setType(x); setInvalide(false); }} aria-pressed={type === x}
                  className={`rounded-full px-3 py-1 ${type === x ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {t(`chat.type_${x}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input !py-1.5" value={saisie} onChange={(e) => { setSaisie(e.target.value); setInvalide(false); }}
                placeholder={t(`chat.rejoindre_${type}`)} aria-label={t('chat.rejoindre')} maxLength={60} aria-invalid={invalide} />
              <button className="btn !px-3" type="submit">{t('chat.rejoindre_btn')}</button>
            </div>
            {invalide && <p className="text-sm text-red-700" role="alert">{t('chat.salon_invalide')}</p>}
          </form>

          {suggestions.length > 0 && (
            <section className="px-2 pb-2">
              <h2 className="px-2 pb-1 text-sm font-semibold text-slate-500">{t('chat.pour_toi')}</h2>
              {suggestions.map((c) => <Salon key={c} canal={c} actif={c === canal} />)}
            </section>
          )}

          {publics.some((r) => !suggestions.includes(r.canal)) && (
            <section className="px-2 pb-2">
              <h2 className="px-2 pb-1 text-sm font-semibold text-slate-500">{t('chat.recents')}</h2>
              {publics.filter((r) => !suggestions.includes(r.canal)).map((r) => <Salon key={r.canal} canal={r.canal} actif={r.canal === canal} />)}
            </section>
          )}

          <section className="px-2 pb-4">
            <h2 className="px-2 pb-1 text-sm font-semibold text-slate-500">{t('chat.prives')}</h2>
            {prives.length > 0
              ? prives.map((r) => <Salon key={r.canal} canal={r.canal} nom={r.nom} actif={r.canal === canal} />)
              : <p className="px-3 text-sm text-slate-400">{t('chat.prives_vide')} <Link to="/developpeurs" className="text-brand-light underline">{t('chat.trouver_devs')}</Link></p>}
          </section>
        </aside>

        <section className={`${canal ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`}>
          {canal
            ? <Conversation key={canal} canal={canal} onRetour={() => navigate('/messages')} onNom={nomPrive} />
            : (
              <div className="m-auto max-w-xs px-6 text-center text-slate-500">
                <p className="text-lg font-semibold text-slate-700">{t('chat.choisir_titre')}</p>
                <p className="mt-1 text-sm">{t('chat.choisir_texte')}</p>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
