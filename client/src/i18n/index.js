import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';
// Textes des pages projet : fichiers séparés pour ne pas toucher fr.json / en.json (évite les conflits entre développeurs).
import projetsFr from './projets.fr.json';
import projetsEn from './projets.en.json';

let saved = null;
try { saved = localStorage.getItem('lang'); } catch { /* ignore */ }
const initial = saved || (navigator.language || 'fr').slice(0, 2);

i18n.use(initReactI18next).init({
  resources: { fr: { translation: { ...fr, projets: projetsFr } }, en: { translation: { ...en, projets: projetsEn } } },
  lng: ['fr', 'en'].includes(initial) ? initial : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (l) => {
  try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
});

export default i18n;
