import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { abonnementActuel, activerPush, desactiverPush, pushPris, serveurPushActif } from '../services/push';
import Icone from './Icone';

// Active ou coupe les notifications système sur cet appareil. N'apparaît pas si le navigateur ou le serveur ne les gère pas.
export default function BoutonPush() {
  const { t } = useTranslation();
  const [etat, setEtat] = useState('chargement'); // chargement | cache | off | on | refuse | occupe
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      if (!pushPris()) { if (vivant) setEtat('cache'); return; }
      const { actif } = await serveurPushActif();
      if (!actif) { if (vivant) setEtat('cache'); return; }
      if (Notification.permission === 'denied') { if (vivant) setEtat('refuse'); return; }
      const sub = await abonnementActuel();
      if (vivant) setEtat(sub && Notification.permission === 'granted' ? 'on' : 'off');
    })();
    return () => { vivant = false; };
  }, []);

  if (etat === 'chargement' || etat === 'cache') return null;

  const basculer = async () => {
    setErreur(false);
    if (etat === 'on') { setEtat('occupe'); await desactiverPush(); setEtat('off'); return; }
    setEtat('occupe');
    const r = await activerPush();
    if (r === 'ok') setEtat('on');
    else { setEtat(r === 'refuse' ? 'refuse' : 'off'); if (r === 'erreur') setErreur(true); }
  };

  return (
    <div className="border-t border-slate-100 px-4 py-2.5 text-sm">
      {etat === 'refuse'
        ? <p className="text-slate-500"><Icone nom="clocheBarree" /> {t('push.refuse')}</p>
        : (
          <button type="button" onClick={basculer} disabled={etat === 'occupe'} aria-pressed={etat === 'on'} className="flex w-full items-center gap-2 text-left text-brand-light hover:underline disabled:opacity-60">
            <Icone nom={etat === 'on' ? 'cloche' : 'clocheBarree'} />
            <span>{etat === 'on' ? t('push.desactiver') : t('push.activer')}</span>
          </button>
        )}
      {etat === 'off' && <p className="mt-1 text-xs text-slate-500">{t('push.aide')}</p>}
      {erreur && <p className="mt-1 text-xs text-red-700" role="alert">{t('push.erreur')}</p>}
    </div>
  );
}
