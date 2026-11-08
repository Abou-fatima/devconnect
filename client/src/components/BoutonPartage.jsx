import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

/* Partager une question ou un projet : WhatsApp (message prêt à envoyer) ou copie du lien.
   Le lien partagé est la page d'aperçu du serveur (/api/partage/...) : WhatsApp y lit le titre et la description,
   puis la personne arrive sur la vraie page. */
export default function BoutonPartage({ type, id, titre }) {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  const lien = new URL(`${api.defaults.baseURL}/partage/${type}/${id}`, window.location.origin).href;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${titre}\n${lien}`)}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch { window.prompt(t('partage.copier_manuel'), lien); }
  };

  const classes = 'rounded-full border border-slate-300 px-2.5 py-0.5 text-xs hover:bg-slate-100';
  return (
    <span className="inline-flex items-center gap-1.5">
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={classes} aria-label={t('partage.whatsapp_label')}>
        <span aria-hidden>💬</span> {t('partage.whatsapp')}
      </a>
      <button type="button" onClick={copier} className={classes} aria-live="polite">
        <span aria-hidden>{copie ? '✓' : '🔗'}</span> {copie ? t('partage.copie') : t('partage.copier')}
      </button>
    </span>
  );
}
