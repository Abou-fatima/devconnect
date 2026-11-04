import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import Illustration from "./Illustration";
import imgMessages from "../assets/illustrations/messages.webp";
import imgProgression from "../assets/illustrations/progression.webp";
import imgConnexion from "../assets/illustrations/connexion.webp";

// Présentation réservée aux visiteurs non connectés : trois blocs image + texte, en alternance.
const BLOCS = [
  { cle: "echanger", img: imgMessages, lien: "/inscription" },
  { cle: "progresser", img: imgProgression, lien: "/classement" },
  { cle: "construire", img: imgConnexion, lien: "/projets" },
];

export default function AccueilVisiteur() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="visiteur-titre">
      <Reveal>
        <h2 id="visiteur-titre" className="text-2xl font-bold">
          {t("visiteur.titre")}
        </h2>
        <p className="mt-1 max-w-2xl text-slate-600">{t("visiteur.texte")}</p>
      </Reveal>
      <div className="mt-5 space-y-5">
        {BLOCS.map((b, i) => (
          <Reveal key={b.cle} delai={0.05}>
            <div
              className={`card grid items-center gap-4 sm:grid-cols-2 sm:gap-8 ${i % 2 ? "sm:[&>div:first-child]:order-2" : ""}`}
            >
              <div>
                <Illustration src={b.img} className="!mb-0 sm:!h-56" />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {t(`visiteur.blocs.${b.cle}.titre`)}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t(`visiteur.blocs.${b.cle}.texte`)}
                </p>
                <Link
                  to={b.lien}
                  className="mt-3 inline-block font-medium text-brand-light hover:underline"
                >
                  {t(`visiteur.blocs.${b.cle}.lien`)} →
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
