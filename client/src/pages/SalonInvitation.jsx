import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apercuInvitation, rejoindreParCode } from '../services/salons';
import { messageErreur } from '../services/api';
import Icone from '../components/Icone';

// Page ouverte par le lien d'invitation d'un salon : aperçu, puis « Rejoindre ».
export default function SalonInvitation() {
  const { t } = useTranslation();
  const { code } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [erreur, setErreur] = useState('');
  const [invalide, setInvalide] = useState(false);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let actif = true;
    apercuInvitation(code)
      .then((s) => { if (actif) setSalon(s); })
      .catch((e) => { if (!actif) return; if (e?.response?.status === 404 || e?.response?.status === 400) setInvalide(true); else setErreur(messageErreur(e, t('commun.erreur'))); });
    return () => { actif = false; };
  }, [code, t]);

  const ouvrir = (canal) => navigate(`/messages/${encodeURIComponent(canal)}`, { replace: true });
  const rejoindre = async () => {
    setOccupe(true); setErreur('');
    try { ouvrir((await rejoindreParCode(code)).canal); } catch (e) { setErreur(messageErreur(e, t('commun.erreur'))); setOccupe(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card anim-scale text-center">
        <p className="text-4xl text-brand" aria-hidden><Icone nom="messages" /></p>
        <h1 className="mt-2 text-xl font-bold">{t('salons.invitation.titre')}</h1>
        {invalide && <p className="erreur mt-4" role="alert">{t('salons.invitation.invalide')}</p>}
        {erreur && <p className="erreur mt-4" role="alert">{erreur}</p>}
        {!salon && !invalide && !erreur && <p className="mt-4 text-slate-500">{t('salons.invitation.chargement')}</p>}
        {salon && (
          <div className="mt-4">
            <p className="text-lg font-semibold">{salon.nom}</p>
            {salon.description && <p className="mt-1 text-sm text-slate-600">{salon.description}</p>}
            <p className="mt-1 text-xs text-slate-500">{salon.visibilite === 'public' ? <Icone nom="monde" /> : <Icone nom="verrou" />} {t(`salons.visibilite_${salon.visibilite}`)} · {t('salons.membres', { count: salon.nb_membres })}</p>
            {salon.membre
              ? (<><p className="mt-4 text-sm text-slate-600">{t('salons.invitation.deja')}</p><button type="button" className="btn mt-3" onClick={() => ouvrir(salon.canal)}>{t('salons.invitation.ouvrir')}</button></>)
              : <button type="button" className="btn mt-4" disabled={occupe} onClick={rejoindre}>{occupe ? t('commun.chargement') : t('salons.invitation.rejoindre')}</button>}
          </div>
        )}
        <p className="mt-5 text-sm"><Link to="/messages" className="text-brand-light underline"><Icone nom="retour" /> {t('chat.titre')}</Link></p>
      </div>
    </div>
  );
}
