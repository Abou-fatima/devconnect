import { useTranslation } from "react-i18next";

// Affiché le temps de charger une page (chargement à la demande) : le menu reste en place, la page apparaît sans à-coup.
export default function PageChargement() {
  const { t } = useTranslation();
  return (
    <div
      className="anim-fade"
      role="status"
      aria-busy="true"
      aria-label={t("commun.chargement")}
    >
      <div className="shimmer h-7 w-1/3 rounded" />
      <div className="shimmer mt-3 h-4 w-2/3 rounded" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-36">
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer mt-3 h-3 w-full rounded" />
            <div className="shimmer mt-2 h-3 w-5/6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
