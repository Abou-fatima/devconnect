import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';
// Textes des pages projet : fichiers séparés pour ne pas toucher fr.json / en.json (évite les conflits entre développeurs).
import projetsFr from './projets.fr.json';
import projetsEn from './projets.en.json';
import mentoratFr from './mentorat.fr.json';
import mentoratEn from './mentorat.en.json';
import vocalFr from './vocal.fr.json';
import vocalEn from './vocal.en.json';
import onboardingFr from './onboarding.fr.json';
import onboardingEn from './onboarding.en.json';
import aideFr from './aide.fr.json';
import aideEn from './aide.en.json';
import erreursFr from './erreurs.fr.json';
import erreursEn from './erreurs.en.json';
import adminFr from './admin.fr.json';
import adminEn from './admin.en.json';
import salonsFr from './salons.fr.json';
import salonsEn from './salons.en.json';
import visiteurFr from './visiteur.fr.json';
import visiteurEn from './visiteur.en.json';
import imagesFr from './images.fr.json';
import imagesEn from './images.en.json';
import piedFr from './pied.fr.json';
import piedEn from './pied.en.json';
import introuvableFr from './introuvable.fr.json';
import introuvableEn from './introuvable.en.json';
import privesFr from './prives.fr.json';
import privesEn from './prives.en.json';
import sonFr from './son.fr.json';
import sonEn from './son.en.json';
import pushFr from './push.fr.json';
import pushEn from './push.en.json';
import reactionsFr from './reactions.fr.json';
import reactionsEn from './reactions.en.json';
import economieFr from './economie.fr.json';
import economieEn from './economie.en.json';
import partageFr from './partage.fr.json';
import partageEn from './partage.en.json';
import carteFr from './carte.fr.json';
import carteEn from './carte.en.json';

let saved = null;
try { saved = localStorage.getItem('lang'); } catch { /* ignore */ }
const initial = saved || (navigator.language || 'fr').slice(0, 2);

i18n.use(initReactI18next).init({
  resources: { fr: { translation: { ...fr, projets: projetsFr, mentorat: mentoratFr, vocal: vocalFr, onboarding: onboardingFr, aide: aideFr, erreurs: erreursFr, admin: adminFr, salons: salonsFr, visiteur: visiteurFr, images: imagesFr, pied: piedFr, introuvable: introuvableFr, prives: privesFr, son: sonFr, push: pushFr, reactions: reactionsFr, economie: economieFr, partage: partageFr, carte: carteFr } }, en: { translation: { ...en, projets: projetsEn, mentorat: mentoratEn, vocal: vocalEn, onboarding: onboardingEn, aide: aideEn, erreurs: erreursEn, admin: adminEn, salons: salonsEn, visiteur: visiteurEn, images: imagesEn, pied: piedEn, introuvable: introuvableEn, prives: privesEn, son: sonEn, push: pushEn, reactions: reactionsEn, economie: economieEn, partage: partageEn, carte: carteEn } } },
  lng: ['fr', 'en'].includes(initial) ? initial : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (l) => {
  try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
});

export default i18n;
