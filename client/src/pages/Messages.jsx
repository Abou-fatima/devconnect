import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { canalStack, canalVille, lireCanal, lireRecents, majuscule } from '../lib/canaux';
import { listerMesSalons } from '../services/salons';
import { useNonLus } from '../hooks/useNonLus';
import { usePrives } from '../context/PrivesContext';
import { effacerNonLus } from '../lib/nonlus';
import Conversation from '../components/Conversation';
import SalonCreerModal from '../components/SalonCreerModal';
import SalonsDecouvrir from '../components/SalonsDecouvrir';
import Icone from '../components/Icone';

const lien = (canal) => `/messages/${encodeURIComponent(canal)}`;

function Salon({ canal, nom, actif, nonLus = 0, apercu = '' }) {
  const { t } = useTranslation();
  const infos = lireCanal(canal);
  if (!infos) return null;
  const label = infos.type === 'stack' ? `#${infos.valeur}` : infos.type === 'ville' ? majuscule(infos.valeur) : infos.type === 'salon' ? (nom || '…') : `@${nom || '…'}`;
  return (
    <Link
      to={lien(canal)}
      aria-current={actif ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] transition-colors ${actif ? 'bg-brand font-medium text-white' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      {infos.type === 'ville' && <Icone nom="lieu" />}
      {infos.type === 'salon' && <Icone nom="groupe" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {apercu && <span className={`block truncate text-xs ${actif ? 'text-white/80' : nonLus > 0 ? 'font-medium text-slate-700' : 'text-slate-500'}`}>{apercu}</span>}
      </span>
      {nonLus > 0 && !actif && (
        <span className="ml-auto shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-slate-900" aria-label={t('prives.non_lus', { count: nonLus })}>{nonLus > 99 ? '99+' : nonLus}</span>
      )}
    </Link>
  );
}

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canal: param } = useParams();
  const navigate = useNavigate();
  const canal = param ? decodeURIComponent(param) : null;
  const [recents, setRecents] = useState(() => lireRecents(user?.id));
  const [type, setType] = useState('stack');
  const [saisie, setSaisie] = useState('');
  const [invalide, setInvalide] = useState(false);
  const { socket } = useRealtime();
  const [mesSalons, setMesSalons] = useState([]);
  const [version, setVersion] = useState(0); // augmente quand un salon change : liste et conversation se rechargent
  const { map: nonLus } = useNonLus();
  useEffect(() => { if (canal && user?.id) effacerNonLus(user.id, canal); }, [canal, user?.id]); // ouvrir un salon remet son compteur à zéro
  const { conversations, ouvrir } = usePrives();
  useEffect(() => (canal && canal.startsWith('prive:') ? ouvrir(canal) : undefined), [canal, ouvrir]); // ouvrir une conversation privée remet son compteur à zéro
  const [creer, setCreer] = useState(false);
  const [decouvrir, setDecouvrir] = useState(false);

  useEffect(() => { let actif = true; listerMesSalons().then((l) => { if (actif) setMesSalons(l); }).catch(() => {}); return () => { actif = false; }; }, [canal, version]);

  // Salon supprimé, ou retiré du salon par son créateur : on met la liste à jour et on quitte la conversation.
  useEffect(() => {
    if (!socket) return undefined;
    const fini = (e) => { setVersion((v) => v + 1); if (e?.canal === canal) navigate('/messages'); };
    socket.on('salon_supprime', fini);
    socket.on('salon_retire', fini);
    return () => { socket.off('salon_supprime', fini); socket.off('salon_retire', fini); };
  }, [socket, canal, navigate]);

  // Le salon ouvert rejoint la liste des récents (la conversation l'enregistre déjà ; on relit pour afficher).
  useEffect(() => { setRecents(lireRecents(user?.id)); }, [canal, user?.id]);

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

  const apercuDe = (c) => {
    const a = c.dernier.apercu;
    const texte = a.type === 'image' ? t('prives.image') : a.type === 'audio' ? t('prives.vocal') : a.texte;
    return (c.dernier.de_moi ? t('prives.vous') : '') + texte;
  };
  // Conversations du serveur (avec non lus), puis celles seulement connues de ce navigateur
  const prives = [
    ...conversations.map((c) => ({ canal: c.canal, nom: c.autre.pseudo, nonLus: c.non_lus, apercu: apercuDe(c) })),
    ...recents.filter((r) => r.canal.startsWith('prive:') && !conversations.some((c) => c.canal === r.canal)).map((r) => ({ canal: r.canal, nom: r.nom, nonLus: 0, apercu: '' }))
  ];
  const publics = recents.filter((r) => !r.canal.startsWith('prive:') && !r.canal.startsWith('salon:'));

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

          <section className="px-2 pb-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2 className="text-sm font-semibold text-slate-500">{t('salons.mes')}</h2>
              <button type="button" onClick={() => setCreer(true)} className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white hover:bg-brand-light"><Icone nom="plus" /> {t('salons.creer_bouton')}</button>
            </div>
            {mesSalons.length > 0
              ? mesSalons.map((x) => <Salon key={x.id} canal={x.canal} nom={x.nom} actif={x.canal === canal} nonLus={nonLus[x.canal] || 0} />)
              : <p className="px-3 text-sm text-slate-400">{t('salons.mes_vide')}</p>}
            <button type="button" onClick={() => setDecouvrir(!decouvrir)} aria-expanded={decouvrir} className="mt-1 w-full rounded-lg px-3 py-1.5 text-left text-sm text-brand-light hover:bg-slate-50"><Icone nom="recherche" /> {t('salons.decouvrir')}</button>
            {decouvrir && <div className="px-1 pb-1"><SalonsDecouvrir compact onOuvrir={(c) => { setVersion((v) => v + 1); navigate(lien(c)); }} /></div>}
          </section>

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
              ? prives.map((r) => <Salon key={r.canal} canal={r.canal} nom={r.nom} actif={r.canal === canal} nonLus={r.nonLus} apercu={r.apercu} />)
              : <p className="px-3 text-sm text-slate-400">{t('chat.prives_vide')} <Link to="/developpeurs" className="text-brand-light underline">{t('chat.trouver_devs')}</Link></p>}
          </section>
        </aside>

        <section className={`${canal ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`}>
          {canal
            ? <Conversation key={`${canal}-${version}`} canal={canal} onRetour={() => navigate('/messages')} onNom={nomPrive} onChange={() => setVersion((v) => v + 1)} />
            : (
              <div className="h-full overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-xl">
                  <p className="text-lg font-semibold text-slate-700">{t('salons.decouvrir_titre')}</p>
                  <p className="mb-3 mt-1 text-sm text-slate-500">{t('salons.decouvrir_texte')}</p>
                  <button type="button" onClick={() => setCreer(true)} className="btn mb-4"><Icone nom="plus" /> {t('salons.creer_bouton')}</button>
                  <SalonsDecouvrir key={version} onOuvrir={(c) => { setVersion((v) => v + 1); navigate(lien(c)); }} />
                </div>
              </div>
            )}
        </section>
      </div>
      {creer && <SalonCreerModal onFerme={() => setCreer(false)} onCree={(s) => { setCreer(false); setVersion((v) => v + 1); navigate(lien(s.canal)); }} />}
    </div>
  );
}
