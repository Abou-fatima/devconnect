import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listerSalonsPublics, rejoindreSalon } from "../services/salons";
import { messageErreur } from "../services/api";
import useDebounce from "../hooks/useDebounce";

// Liste des salons publics : on peut chercher, rejoindre ou ouvrir. compact = quelques salons dans la colonne de gauche.
export default function SalonsDecouvrir({ onOuvrir, compact = false }) {
  const { t } = useTranslation();
  const [saisie, setSaisie] = useState("");
  const q = useDebounce(saisie, 300);
  const [liste, setListe] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState("");
  const limite = compact ? 5 : 12;

  const charger = useCallback(
    async (p, remplacer) => {
      setErreur("");
      try {
        const d = await listerSalonsPublics({
          q: q || undefined,
          page: p,
          limit: limite,
        });
        setListe((prev) =>
          remplacer || !prev ? d.data : [...prev, ...d.data],
        );
        setPage(d.page);
        setPages(d.pages);
      } catch (e) {
        setErreur(messageErreur(e, t("commun.erreur")));
        setListe((prev) => prev || []);
      }
    },
    [q, limite, t],
  );
  useEffect(() => {
    charger(1, true);
  }, [charger]);

  const rejoindre = async (s) => {
    setOccupe(s.id);
    setErreur("");
    try {
      const maj = await rejoindreSalon(s.id);
      onOuvrir(maj.canal);
    } catch (e) {
      setErreur(messageErreur(e, t("commun.erreur")));
      setOccupe("");
    }
  };

  return (
    <div>
      {!compact && (
        <input
          type="search"
          className="input mb-3"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={t("salons.rechercher")}
          aria-label={t("salons.rechercher")}
        />
      )}
      {erreur && (
        <p className="erreur mb-2" role="alert">
          {erreur}
        </p>
      )}
      {liste === null && (
        <p className="text-sm text-slate-500">{t("commun.chargement")}</p>
      )}
      {liste && liste.length === 0 && !erreur && (
        <p className="text-sm text-slate-500">{t("salons.aucun_public")}</p>
      )}
      {liste && liste.length > 0 && (
        <ul className={compact ? "space-y-1" : "grid gap-3 sm:grid-cols-2"}>
          {liste.map((s) => (
            <li
              key={s.id}
              className={
                compact
                  ? "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  : "card flex flex-col"
              }
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.nom}</p>
                {!compact && s.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                    {s.description}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {t("salons.membres", { count: s.nb_membres })}
                </p>
              </div>
              <button
                type="button"
                disabled={occupe === s.id}
                onClick={() => (s.membre ? onOuvrir(s.canal) : rejoindre(s))}
                className={`${compact ? "btn-outline !px-2.5 !py-1 text-xs" : "btn mt-3 !py-1.5 text-sm"} shrink-0`}
              >
                {s.membre ? t("salons.ouvrir") : t("salons.rejoindre")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!compact && page < pages && (
        <div className="mt-3 text-center">
          <button
            type="button"
            className="btn-outline"
            onClick={() => charger(page + 1, false)}
          >
            {t("salons.plus")}
          </button>
        </div>
      )}
    </div>
  );
}
