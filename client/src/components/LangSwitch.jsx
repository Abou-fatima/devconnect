import { useTranslation } from 'react-i18next';

export default function LangSwitch() {
  const { i18n } = useTranslation();
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/30 text-xs">
      {['fr', 'en'].map((l) => (
        <button key={l} onClick={() => i18n.changeLanguage(l)} aria-pressed={i18n.language === l}
          className={`px-2 py-1 uppercase ${i18n.language === l ? 'bg-white text-brand' : 'text-white'}`}>{l}</button>
      ))}
    </div>
  );
}
