import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { astuceMasquee, cleAstuce, masquerAstuce } from "../lib/aide";

// Petite astuce en haut de la page, une seule fois par type de page (mémorisé dans ce navigateur).
export default function AstucePage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const cle = cleAstuce(pathname);
  const [masque, setMasque] = useState(true);
  useEffect(() => {
    setMasque(!cle || astuceMasquee(cle));
  }, [cle]);
  if (masque || !cle) return null;
  const fermer = () => {
    masquerAstuce(cle);
    setMasque(true);
  };
  return (
    <div
      role="note"
      className="mb-4 flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
    >
      <span aria-hidden>💡</span>
      <p className="flex-1">
        <strong>{t("aide.astuce_titre")} : </strong>
        {t(`aide.astuces.${cle}`)}
      </p>
      <button
        type="button"
        onClick={fermer}
        className="shrink-0 font-medium underline"
      >
        {t("aide.astuce_ok")}
      </button>
    </div>
  );
}
