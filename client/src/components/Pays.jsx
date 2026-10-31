import { useTranslation } from 'react-i18next';
import { nomPays } from '../lib/forum';

// Pays affiché en code (GN) avec son nom au survol. Les drapeaux emoji ne s'affichent pas sous Windows : on évite.
export default function Pays({ code, avecNom = false }) {
  const { i18n } = useTranslation();
  if (!code) return null;
  const nom = nomPays(code, i18n.language);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={nom}>
      <span className="rounded bg-slate-100 px-1 text-[11px] font-semibold text-slate-600">{String(code).toUpperCase()}</span>
      {avecNom && <span>{nom}</span>}
    </span>
  );
}
