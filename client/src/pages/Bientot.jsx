import { useTranslation } from 'react-i18next';

// Page provisoire pour le forum et le classement, en attendant l'API de Dev 2.
export default function Bientot({ cle }) {
  const { t } = useTranslation();
  return (
    <div className="py-10 text-center">
      <h1 className="text-2xl font-bold">{t(`${cle}.titre`)}</h1>
      <p className="mt-3 text-slate-500">{t(`${cle}.bientot`)}</p>
    </div>
  );
}
