import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { creerProjet, detailProjet, modifierProjet } from "../services/projets";
import { getOptions } from "../services/users";
import { messageErreur } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  CATEGORIES,
  ROLES_SUGGERES,
  STATUTS,
  STYLE_STATUT,
  idPersonne,
  idProjet,
  lienSur,
  nettoyerRole,
  nettoyerStack,
} from "../lib/projets";
import { effacerBrouillon, ecrireBrouillon, lireBrouillon } from "../lib/forum";
import SaisieTags from "../components/SaisieTags";

const CLE = "devconnect:brouillon-projet";
const VIDE = {
  titre: "",
  description: "",
  statut: "idee",
  categorie: "",
  stack: [],
  roles: [],
  github: "",
  demo: "",
  video: "",
};

export default function ProjetForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const edition = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState(VIDE);
  const [etat, setEtat] = useState(edition ? "chargement" : "ok"); // chargement | ok | interdit | introuvable
  const [stacks, setStacks] = useState([]);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [restaure, setRestaure] = useState(false);
  const pret = useRef(false);
  const champ = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    getOptions()
      .then((o) => setStacks(o.stacks || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (edition) {
      let actif = true;
      detailProjet(id)
        .then(({ projet }) => {
          if (!actif) return;
          if (String(idPersonne(projet.porteur_id)) !== String(user?.id)) {
            setEtat("interdit");
            return;
          }
          setF({
            titre: projet.titre || "",
            description: projet.description || "",
            statut: projet.statut || "idee",
            categorie: projet.categorie || "",
            stack: projet.stack || [],
            roles: projet.roles_recherches || [],
            github: projet.liens?.github || "",
            demo: projet.liens?.demo || "",
            video: projet.liens?.video || "",
          });
          setEtat("ok");
          pret.current = true;
        })
        .catch(() => {
          if (actif) setEtat("introuvable");
        });
      return () => {
        actif = false;
      };
    }
    const b = lireBrouillon(CLE);
    if (b && (b.titre || b.description)) {
      setF({ ...VIDE, ...b });
      setRestaure(true);
    }
    pret.current = true;
    return undefined;
  }, [id, edition, user?.id]);

  // Brouillon : seulement pour un nouveau projet.
  useEffect(() => {
    if (
      !edition &&
      pret.current &&
      (f.titre || f.description || f.stack.length)
    )
      ecrireBrouillon(CLE, f);
  }, [f, edition]);

  const liensInvalides = ["github", "demo", "video"].filter(
    (k) => f[k].trim() && !lienSur(f[k].trim()),
  );
  const valide = f.titre.trim().length >= 3 && liensInvalides.length === 0;

  const envoyer = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setErreur("");
    setEnvoi(true);
    const liens = Object.fromEntries(
      ["github", "demo", "video"]
        .filter((k) => f[k].trim())
        .map((k) => [k, f[k].trim()]),
    );
    const body = {
      titre: f.titre.trim(),
      description: f.description.trim(),
      statut: f.statut,
      categorie: f.categorie.trim(),
      stack: f.stack,
      roles_recherches: f.roles,
      liens,
    };
    try {
      const p = edition
        ? await modifierProjet(id, body)
        : await creerProjet(body);
      if (!edition) effacerBrouillon(CLE);
      navigate(`/projets/${idProjet(p) || id}`, { replace: true });
    } catch (err) {
      setErreur(messageErreur(err, t("commun.erreur")));
      setEnvoi(false);
    }
  };
  const recommencer = () => {
    effacerBrouillon(CLE);
    setF(VIDE);
    setRestaure(false);
  };

  if (etat === "chargement")
    return (
      <p className="text-slate-500" aria-busy="true">
        {t("commun.chargement")}
      </p>
    );
  if (etat !== "ok")
    return (
      <div className="card mx-auto max-w-md py-8 text-center">
        <p className="text-lg font-semibold">
          {etat === "interdit"
            ? t("projets.pas_proprietaire")
            : t("projets.introuvable")}
        </p>
        <Link to="/projets" className="btn mt-4">
          {t("projets.retour_projets")}
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-2 text-sm">
        <Link
          to={edition ? `/projets/${id}` : "/projets"}
          className="text-brand-light hover:underline"
        >
          ← {edition ? t("projets.retour_projet") : t("projets.titre")}
        </Link>
      </nav>
      <h1 className="text-2xl font-bold">
        {edition ? t("projets.modifier_titre") : t("projets.creer_titre")}
      </h1>
      {!edition && (
        <p className="mb-4 text-slate-600">{t("projets.creer_intro")}</p>
      )}

      {restaure && (
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          <span>{t("projets.brouillon_restaure")}</span>
          <button
            type="button"
            onClick={recommencer}
            className="font-medium underline"
          >
            {t("projets.brouillon_effacer")}
          </button>
        </div>
      )}
      {erreur && (
        <div className="erreur mb-3" role="alert">
          {erreur}
        </div>
      )}

      <form onSubmit={envoyer} className="card space-y-5">
        <div>
          <label htmlFor="p-titre" className="label">
            {t("projets.champ_titre")}
          </label>
          <input
            id="p-titre"
            className="input"
            value={f.titre}
            onChange={champ("titre")}
            maxLength={150}
            required
            minLength={3}
            placeholder={t("projets.champ_titre_placeholder")}
          />
          <p className="mt-1 text-xs text-slate-500">{f.titre.length} / 150</p>
        </div>

        <div>
          <label htmlFor="p-desc" className="label">
            {t("projets.champ_description")}
          </label>
          <textarea
            id="p-desc"
            className="input min-h-[9rem]"
            rows={7}
            value={f.description}
            onChange={champ("description")}
            maxLength={5000}
            placeholder={t("projets.champ_description_placeholder")}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("projets.champ_description_aide")} · {f.description.length} /
            5000
          </p>
        </div>

        <fieldset>
          <legend className="label">{t("projets.champ_statut")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUTS.map((s) => (
              <label
                key={s}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${f.statut === s ? "border-brand bg-brand/5 ring-2 ring-brand/30" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="statut"
                  value={s}
                  checked={f.statut === s}
                  onChange={champ("statut")}
                  className="sr-only"
                />
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLE_STATUT[s]}`}
                >
                  {t(`projets.statut.${s}`)}
                </span>
                <span className="mt-1 block text-slate-600">
                  {t(`projets.statut_aide.${s}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="p-cat" className="label">
            {t("projets.champ_categorie")}
          </label>
          <input
            id="p-cat"
            className="input"
            list="categories-projet"
            value={f.categorie}
            onChange={champ("categorie")}
            maxLength={100}
            placeholder={t("projets.champ_categorie_placeholder")}
          />
          <datalist id="categories-projet">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="p-stack" className="label">
            {t("projets.champ_stack")}{" "}
            <span className="font-normal text-slate-500">
              ({f.stack.length}/20)
            </span>
          </label>
          <SaisieTags
            id="p-stack"
            valeur={f.stack}
            onChange={(v) => setF((x) => ({ ...x, stack: v }))}
            nettoyer={nettoyerStack}
            suggestions={stacks}
            max={20}
            placeholder={t("projets.champ_stack_placeholder")}
            libelleRetirer={(x) => t("projets.retirer_tag", { tag: x })}
            libelleSuggestions={t("projets.suggestions")}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("projets.champ_stack_aide")}
          </p>
        </div>

        <div>
          <label htmlFor="p-roles" className="label">
            {t("projets.champ_roles")}{" "}
            <span className="font-normal text-slate-500">
              ({f.roles.length}/20)
            </span>
          </label>
          <SaisieTags
            id="p-roles"
            valeur={f.roles}
            onChange={(v) => setF((x) => ({ ...x, roles: v }))}
            nettoyer={nettoyerRole}
            suggestions={ROLES_SUGGERES}
            max={20}
            placeholder={t("projets.champ_roles_placeholder")}
            libelleRetirer={(x) => t("projets.retirer_tag", { tag: x })}
            libelleSuggestions={t("projets.suggestions")}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("projets.champ_roles_aide")}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="label">{t("projets.champ_liens")}</legend>
          {["github", "demo", "video"].map((k) => (
            <div key={k}>
              <label htmlFor={`p-${k}`} className="sr-only">
                {t(`projets.lien_${k}`)}
              </label>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-sm text-slate-600">
                  {t(`projets.lien_${k}`)}
                </span>
                <input
                  id={`p-${k}`}
                  type="url"
                  inputMode="url"
                  className="input"
                  value={f[k]}
                  onChange={champ(k)}
                  maxLength={2048}
                  placeholder="https://"
                  aria-invalid={liensInvalides.includes(k)}
                />
              </div>
              {liensInvalides.includes(k) && (
                <p className="ml-[4.5rem] mt-1 text-xs text-red-600">
                  {t("projets.lien_invalide")}
                </p>
              )}
            </div>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" type="submit" disabled={!valide || envoi}>
            {envoi
              ? t("commun.chargement")
              : edition
                ? t("commun.enregistrer")
                : t("projets.publier")}
          </button>
          <Link
            to={edition ? `/projets/${id}` : "/projets"}
            className="btn-outline"
          >
            {t("commun.annuler")}
          </Link>
          {f.titre.trim().length < 3 && (
            <span className="text-xs text-slate-500">
              {t("projets.completer")}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
