import { useState } from "react";
import { useTranslation } from "react-i18next";

// Note vocale : lecteur + transcription Whisper repliable (utile sans casque ou avec une connexion lente).
export default function LecteurVocal({ url, transcription, propre = false }) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="mt-1 min-w-[12rem]">
      <audio
        controls
        preload="none"
        src={url}
        className="h-9 w-full max-w-full"
        aria-label={t("vocal.note")}
      />
      {transcription && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            className={`text-xs underline-offset-2 hover:underline ${propre ? "text-white/80" : "text-brand"}`}
          >
            {ouvert ? t("vocal.masquer") : t("vocal.voir_texte")}
          </button>
          {ouvert && (
            <p
              className={`anim-fade mt-1 text-sm italic ${propre ? "text-white/90" : "text-slate-600"}`}
            >
              « {transcription} »
            </p>
          )}
        </div>
      )}
    </div>
  );
}
