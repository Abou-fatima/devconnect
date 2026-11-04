import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getOptions, updateMe } from "../services/users";
import { messageErreur } from "../services/api";
import { PAYS_PROPOSES, actionsPour, marquerFait } from "../lib/onboarding";
import Illustration from "../components/Illustration";
import imgMessages from "../assets/illustrations/messages.webp";
import imgProgression from "../assets/illustrations/progression.webp";
import imgConnexion from "../assets/illustrations/connexion.webp";

const OBJECTIFS_ICONES = {
  apprendre: "📚",
  collaborer: "🤝",
  mentorat: "🎓",
  offrir_mentorat: "🌟",
  emploi: "💼",
  projet_perso: "🚀",
};
const NIVEAUX_ICONES = {
  debutant: "🌱",
  intermediaire: "🌿",
  avance: "🌳",
  expert: "🏆",
};
const STACKS_DEFAUT = [
  "javascript",
  "react",
  "node",
  "python",
  "php",
  "java",
  "flutter",
  "html-css",
  "mongodb",
  "git",
  "ui-ux",
  "docker",
];
const ETAPES = 4;

/* Parcours de bienvenue en 4 étapes : objectifs, niveau, technologies, puis premiers pas.
   Chaque écran pose une seule question, tout est passable, rien n'est obligatoire sauf le choix du niveau. */
export default function Bienvenue() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [etape, setEtape] = useState(1);
  const [objectifs, setObjectifs] = useState(user.objectifs || []);
  const [niveau, setNiveau] = useState(user.profil?.niveau || "");
  const [stacks, setStacks] = useState(user.stacks || []);
  const [pays, setPays] = useState(user.pays || "");
  const [ville, setVille] = useState(user.ville || "");
  const [saisie, setSaisie] = useState("");
  const [options, setOptions] = useState({
    objectifs: Object.keys(OBJECTIFS_ICONES),
    niveaux: Object.keys(NIVEAUX_ICONES),
    stacks: STACKS_DEFAUT,
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const titre = useRef(null);

  useEffect(() => {
    getOptions()
      .then((o) => setOptions((x) => ({ ...x, ...o })))
      .catch(() => {});
  }, []);
  useEffect(() => {
    titre.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [etape]); // l'écran suivant est annoncé et visible

  const propositions = useMemo(
    () =>
      [...new Set([...STACKS_DEFAUT, ...(options.stacks || [])])].slice(0, 20),
    [options.stacks],
  );
  const noms = useMemo(() => {
    try {
      return new Intl.DisplayNames([i18n.language], { type: "region" });
    } catch {
      return null;
    }
  }, [i18n.language]);

  const basculer = (liste, setListe, v) =>
    setListe(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);
  const ajouterStack = (brut) => {
    const s = brut.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30);
    if (s && !stacks.includes(s) && stacks.length < 20)
      setStacks([...stacks, s]);
    setSaisie("");
  };

  const passer = () => {
    marquerFait(user.id);
    navigate("/", { replace: true });
  };

  const terminer = async () => {
    setEnvoi(true);
    setErreur("");
    const body = {
      objectifs,
      stacks,
      ...(pays && { pays }),
      ...(ville.trim() && { ville: ville.trim() }),
      profil: { niveau },
    };
    try {
      setUser(await updateMe(body));
      marquerFait(user.id);
      setEtape(4);
    } catch (e) {
      setErreur(messageErreur(e, t("commun.erreur")));
    } finally {
      setEnvoi(false);
    }
  };

  const carte = (actif) =>
    `flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-brand ${actif ? "border-brand bg-brand/5 shadow-sm" : "border-slate-200 bg-white"}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className="min-w-0 flex-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={ETAPES}
          aria-valuenow={etape}
          aria-label={t("onboarding.progression", { etape, total: ETAPES })}
        >
          <div className="mb-1 text-xs font-medium text-slate-500">
            {t("onboarding.progression", { etape, total: ETAPES })}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(etape / ETAPES) * 100}%` }}
            />
          </div>
        </div>
        {etape < 4 && (
          <button
            type="button"
            onClick={passer}
            className="shrink-0 text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            {t("onboarding.plus_tard")}
          </button>
        )}
      </div>

      <div key={etape} className="anim-scale card">
        {etape === 1 && (
          <>
            <Illustration src={imgMessages} />
            <h1
              ref={titre}
              tabIndex={-1}
              className="text-2xl font-bold outline-none"
            >
              {t("onboarding.bienvenue", { pseudo: user.pseudo })}
            </h1>
            <p className="mt-1 text-slate-600">
              {t("onboarding.objectifs_texte")}
            </p>
            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">
                {t("onboarding.objectifs_titre")}
              </legend>
              {options.objectifs.map((o) => (
                <label key={o} className={carte(objectifs.includes(o))}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={objectifs.includes(o)}
                    onChange={() => basculer(objectifs, setObjectifs, o)}
                  />
                  <span className="text-2xl" aria-hidden>
                    {OBJECTIFS_ICONES[o] || "✨"}
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {t(`profil.objectifs_liste.${o}`)}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {t(`onboarding.objectif_aide.${o}`, { defaultValue: "" })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        {etape === 2 && (
          <>
            <Illustration src={imgProgression} />
            <h1
              ref={titre}
              tabIndex={-1}
              className="text-2xl font-bold outline-none"
            >
              {t("onboarding.niveau_titre")}
            </h1>
            <p className="mt-1 text-slate-600">
              {t("onboarding.niveau_texte")}
            </p>
            <fieldset className="mt-4 grid gap-2">
              <legend className="sr-only">
                {t("onboarding.niveau_titre")}
              </legend>
              {options.niveaux.map((n) => (
                <label key={n} className={carte(niveau === n)}>
                  <input
                    type="radio"
                    name="niveau"
                    className="sr-only"
                    checked={niveau === n}
                    onChange={() => setNiveau(n)}
                  />
                  <span className="text-2xl" aria-hidden>
                    {NIVEAUX_ICONES[n] || "🌱"}
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {t(`profil.niveaux.${n}`)}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {t(`onboarding.niveau_aide.${n}`, { defaultValue: "" })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        {etape === 3 && (
          <>
            <Illustration src={imgConnexion} />
            <h1
              ref={titre}
              tabIndex={-1}
              className="text-2xl font-bold outline-none"
            >
              {t("onboarding.stacks_titre")}
            </h1>
            <p className="mt-1 text-slate-600">
              {t("onboarding.stacks_texte")}
            </p>
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="group"
              aria-label={t("onboarding.stacks_titre")}
            >
              {[...new Set([...propositions, ...stacks])].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={stacks.includes(s)}
                  onClick={() => basculer(stacks, setStacks, s)}
                  className={`rounded-full border px-3 py-1 text-sm transition-all duration-150 hover:-translate-y-0.5 ${stacks.includes(s) ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ajouterStack(saisie);
              }}
            >
              <label className="sr-only" htmlFor="ob-stack">
                {t("onboarding.autre_techno")}
              </label>
              <input
                id="ob-stack"
                className="input flex-1"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder={t("onboarding.autre_techno")}
                maxLength={30}
              />
              <button className="btn-outline" disabled={!saisie.trim()}>
                {t("onboarding.ajouter")}
              </button>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ob-pays" className="label">
                  {t("onboarding.pays")}
                </label>
                <select
                  id="ob-pays"
                  className="input"
                  value={pays}
                  onChange={(e) => setPays(e.target.value)}
                >
                  <option value="">{t("onboarding.pays_vide")}</option>
                  {PAYS_PROPOSES.map((c) => (
                    <option key={c} value={c}>
                      {noms?.of(c) || c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ob-ville" className="label">
                  {t("onboarding.ville")}
                </label>
                <input
                  id="ob-ville"
                  className="input"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>
            {erreur && (
              <div className="erreur mt-3" role="alert">
                {erreur}
              </div>
            )}
          </>
        )}

        {etape === 4 && (
          <>
            <div className="text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl"
                aria-hidden
              >
                🎉
              </div>
              <h1
                ref={titre}
                tabIndex={-1}
                className="mt-3 text-2xl font-bold outline-none"
              >
                {t("onboarding.pret_titre")}
              </h1>
              <p className="mt-1 text-slate-600">
                {t("onboarding.pret_texte")}
              </p>
            </div>
            <ul className="stagger mt-5 grid gap-2">
              {actionsPour(objectifs).map((a) => (
                <li key={a.cle}>
                  <Link
                    to={a.lien}
                    onClick={() => marquerFait(user.id)}
                    className="card lift group flex items-center gap-3 !p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xl transition-transform duration-300 group-hover:scale-110"
                      aria-hidden
                    >
                      {a.icone}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {t(`onboarding.action.${a.cle}.titre`)}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {t(`onboarding.action.${a.cle}.texte`)}
                      </span>
                    </span>
                    <span
                      className="text-slate-400 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("onboarding.visite")}
            </h2>
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {["forum", "projets", "mentorat", "messages"].map((k) => (
                <li key={k} className="rounded-lg bg-slate-50 p-2.5">
                  <span className="font-semibold">
                    {t(`onboarding.visite_${k}.titre`)}
                  </span>{" "}
                  <span className="text-slate-600">
                    {t(`onboarding.visite_${k}.texte`)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 text-center">
              <Link to="/" className="btn-outline">
                {t("onboarding.aller_accueil")}
              </Link>
            </div>
          </>
        )}

        {etape < 4 && (
          <div className="mt-6 flex items-center justify-between gap-2">
            {etape > 1 ? (
              <button
                type="button"
                onClick={() => setEtape(etape - 1)}
                className="btn-outline"
              >
                ← {t("onboarding.retour")}
              </button>
            ) : (
              <span />
            )}
            {etape < 3 && (
              <button
                type="button"
                onClick={() => setEtape(etape + 1)}
                disabled={etape === 2 && !niveau}
                className="btn"
              >
                {etape === 1 && objectifs.length === 0
                  ? t("onboarding.passer_etape")
                  : t("onboarding.suivant")}{" "}
                →
              </button>
            )}
            {etape === 3 && (
              <button
                type="button"
                onClick={terminer}
                disabled={envoi || !niveau}
                className="btn"
              >
                {envoi ? t("commun.chargement") : t("onboarding.terminer")}
              </button>
            )}
          </div>
        )}
        {etape === 2 && !niveau && (
          <p className="mt-2 text-right text-xs text-slate-500">
            {t("onboarding.niveau_requis")}
          </p>
        )}
      </div>
    </div>
  );
}
