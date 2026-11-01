import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import Pays from './Pays';
import { canalPrive } from '../lib/canaux';
import { ilYA } from '../lib/notifications';

const STYLE = { en_attente: 'bg-amber-100 text-amber-900', acceptee: 'bg-emerald-100 text-emerald-800', refusee: 'bg-slate-100 text-slate-600', terminee: 'bg-slate-100 text-slate-600' };

/* Une demande, vue par le mentor (type="recue") ou par l'accompagné (type="envoyee"). */
export default function DemandeMentoratCarte({ d, type, moiId, occupe, onAccepter, onRefuser, onTerminer, onRetirer }) {
  const { t, i18n } = useTranslation();
  const [confirmer, setConfirmer] = useState(null); // 'refuser' | 'terminer' | 'retirer'
  const autre = type === 'recue' ? d.mentee : d.mentor;
  const attente = d.statut === 'en_attente';
  const encours = d.statut === 'acceptee';

  const Confirmation = ({ texte, oui, onOui }) => (
    <div className="anim-scale mt-3 rounded-lg bg-red-50 p-3" role="alertdialog">
      <p className="font-medium text-red-900">{texte}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={occupe} onClick={onOui} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">{oui}</button>
        <button type="button" onClick={() => setConfirmer(null)} className="btn-outline !py-1.5">{t('commun.annuler')}</button>
      </div>
    </div>
  );

  return (
    <li className="anim-fade rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        {autre && <Avatar user={{ pseudo: autre.pseudo, profil: { photo: autre.photo } }} size={40} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {autre && <Link to={`/developpeurs/${autre.id}`} className="font-semibold text-brand hover:underline">{autre.pseudo}</Link>}
            {autre && <Pays code={autre.pays} />}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[d.statut]}`}>{t(`mentorat.etat.${d.statut}`)}</span>
            <time className="text-xs text-slate-400" dateTime={d.created_at}>{ilYA(d.created_at, i18n.language)}</time>
          </div>
          <p className="mt-1 font-medium text-slate-800">{d.sujet}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{d.message}</p>
          {type === 'recue' && autre?.stacks?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{autre.stacks.slice(0, 5).map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{s}</span>)}</div>}

          {confirmer === null && (
            <div className="mt-3 flex flex-wrap gap-2">
              {type === 'recue' && attente && <>
                <button type="button" disabled={occupe} onClick={() => onAccepter(d.id)} className="btn !py-1.5">✓ {t('mentorat.accepter')}</button>
                <button type="button" onClick={() => setConfirmer('refuser')} className="btn-outline !py-1.5">{t('mentorat.refuser')}</button>
              </>}
              {type === 'envoyee' && attente && <button type="button" onClick={() => setConfirmer('retirer')} className="btn-outline !py-1.5">{t('mentorat.retirer')}</button>}
              {encours && autre && <Link to={`/messages/${encodeURIComponent(canalPrive(moiId, autre.id))}`} className="btn !py-1.5">✉ {t('mentorat.ecrire')}</Link>}
              {encours && <button type="button" onClick={() => setConfirmer('terminer')} className="btn-outline !py-1.5">{t('mentorat.terminer')}</button>}
              {type === 'recue' && attente && autre && <Link to={`/messages/${encodeURIComponent(canalPrive(moiId, autre.id))}`} className="btn-outline !py-1.5">✉ {t('mentorat.ecrire')}</Link>}
            </div>
          )}
          {confirmer === 'refuser' && <Confirmation texte={t('mentorat.refuser_confirm')} oui={t('mentorat.refuser_oui')} onOui={() => onRefuser(d.id)} />}
          {confirmer === 'terminer' && <Confirmation texte={t('mentorat.terminer_confirm')} oui={t('mentorat.terminer_oui')} onOui={() => onTerminer(d.id)} />}
          {confirmer === 'retirer' && <Confirmation texte={t('mentorat.retirer_confirm')} oui={t('mentorat.retirer_oui')} onOui={() => onRetirer(d.id)} />}
        </div>
      </div>
    </li>
  );
}
