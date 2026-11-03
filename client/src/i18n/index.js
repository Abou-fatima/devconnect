import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";
import en from "./en.json";
// Textes des pages projet : fichiers séparés pour ne pas toucher fr.json / en.json (évite les conflits entre développeurs).
import projetsFr from "./projets.fr.json";
import projetsEn from "./projets.en.json";
import mentoratFr from "./mentorat.fr.json";
import mentoratEn from "./mentorat.en.json";
import vocalFr from "./vocal.fr.json";
import vocalEn from "./vocal.en.json";
import onboardingFr from "./onboarding.fr.json";
import onboardingEn from "./onboarding.en.json";
import aideFr from "./aide.fr.json";
import aideEn from "./aide.en.json";
import erreursFr from "./erreurs.fr.json";
import erreursEn from "./erreurs.en.json";

let saved = null;
try {
  saved = localStorage.getItem("lang");
} catch {
  /* ignore */
}
const initial = saved || (navigator.language || "fr").slice(0, 2);

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      translation: {
        ...fr,
        projets: projetsFr,
        mentorat: mentoratFr,
        vocal: vocalFr,
        onboarding: onboardingFr,
        aide: aideFr,
        erreurs: erreursFr,
      },
    },
    en: {
      translation: {
        ...en,
        projets: projetsEn,
        mentorat: mentoratEn,
        vocal: vocalEn,
        onboarding: onboardingEn,
        aide: aideEn,
        erreurs: erreursEn,
      },
    },
  },
  lng: ["fr", "en"].includes(initial) ? initial : "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (l) => {
  try {
    localStorage.setItem("lang", l);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l;
});

export default i18n;
