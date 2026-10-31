import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRealtime } from '../context/RealtimeContext';
import { lienNotification } from '../lib/notifications';
import NotificationItem from '../components/NotificationItem';

export default function Notifications() {
  const { t } = useTranslation();
  const { notifs, nonLues, etat, aSuivre, marquerLue, toutMarquerLu, chargerPlus, recharger } = useRealtime();
  const navigate = useNavigate();
  const [seulementNonLues, setSeulementNonLues] = useState(false);
  const [plus, setPlus] = useState(false);

  const ouvrir = (n) => { marquerLue(n.id); navigate(lienNotification(n)); };
  const visibles = seulementNonLues ? notifs.filter((n) => !n.lue) : notifs;
  const voirPlus = async () => { setPlus(true); await chargerPlus(); setPlus(false); };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('notif.titre')}</h1>
        {nonLues > 0 && <button type="button" onClick={toutMarquerLu} className="btn-outline !py-1.5 text-sm">{t('notif.tout_lu')}</button>}
      </div>

      <div className="mb-3 flex gap-1 text-sm" role="group" aria-label={t('notif.filtre')}>
        {[[false, t('notif.toutes')], [true, t('notif.non_lues', { count: nonLues })]].map(([val, label]) => (
          <button key={String(val)} type="button" onClick={() => setSeulementNonLues(val)} aria-pressed={seulementNonLues === val}
            className={`rounded-full px-3 py-1 ${seulementNonLues === val ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden !p-0">
        {etat === 'chargement' && <p className="p-8 text-center text-slate-400">{t('commun.chargement')}</p>}
        {etat === 'erreur' && (
          <div className="p-6 text-center">
            <p className="erreur">{t('notif.erreur')}</p>
            <button type="button" onClick={recharger} className="btn mt-3">{t('chat.reessayer')}</button>
          </div>
        )}
        {etat === 'ok' && visibles.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            <p className="font-medium text-slate-700">{seulementNonLues ? t('notif.tout_lu_titre') : t('notif.vide_titre')}</p>
            <p className="mt-1 text-sm">{seulementNonLues ? t('notif.tout_lu_texte') : t('notif.vide')}</p>
          </div>
        )}
        {visibles.map((n) => <NotificationItem key={n.id} n={n} onOuvrir={ouvrir} />)}
      </div>

      {aSuivre && <div className="mt-4 text-center"><button type="button" onClick={voirPlus} disabled={plus} className="btn-outline">{plus ? t('commun.chargement') : t('notif.plus')}</button></div>}
    </div>
  );
}
