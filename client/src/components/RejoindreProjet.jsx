import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  candidater,
  retirerCandidature,
  retirerMembre,
} from "../services/collaboration";
import { messageErreur } from "../services/api";

// Carte « Rejoindre l'équipe » (personne connectée ou non, qui n'est pas le porteur) : candidater, suivre sa candidature, quitter l'équipe.
export default function RejoindreProjet({
  projetId,
  projet,
  user,
  maCandidature,
  estMembre,
  monRole,
  onChange,
  versConnexion,
}) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmer, setConfirmer] = useState(false);

  const action = async (fn, apres) => {
    setOccupe(true);
    setErreur("");
    try {
      await fn();
      apres?.();
      await onChange();
    } catch (e) {
      setErreur(messageErreur(e, t("commun.erreur")));
    } finally {
      setOccupe(false);
    }
  };

  const envoyer = (e) => {
    e.preventDefault();
    action(
      () =>
        candidater(projetId, {
          message: message.trim(),
          ...(role.trim() && { role: role.trim() }),
        }),
      () => {
        setOuvert(false);
        setMessage("");
        setRole("");
      },
    );
  };

  const Erreur = () =>
    erreur ? (
      <div className="erreur mt-3" role="alert">
        {erreur}
      </div>
    ) : null;

  if (estMembre) {
    return (
      <section
        className="anim-scale rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        aria-label={t("projets.collab.membre_titre")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-emerald-900">
              ✓ {t("projets.collab.membre_titre")}
            </h2>
            {monRole && (
              <p className="text-sm text-emerald-800">
                {t("projets.collab.membre_role", { role: monRole })}
              </p>
            )}
          </div>
          {!confirmer && (
            <button
              type="button"
              onClick={() => setConfirmer(true)}
              className="btn-outline"
            >
              {t("projets.collab.quitter")}
            </button>
          )}
        </div>
        {confirmer && (
          <div
            className="anim-scale mt-3 rounded-lg bg-white p-3"
            role="alertdialog"
            aria-label={t("projets.collab.quitter_confirm")}
          >
            <p className="font-medium">{t("projets.collab.quitter_confirm")}</p>
            <p className="text-sm text-slate-600">
              {t("projets.collab.quitter_texte")}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={occupe}
                onClick={() =>
                  action(
                    () => retirerMembre(projetId, user.id),
                    () => setConfirmer(false),
                  )
                }
                className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("projets.collab.quitter_oui")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmer(false)}
                className="btn-outline !py-1.5"
              >
                {t("commun.annuler")}
              </button>
            </div>
          </div>
        )}
        <Erreur />
      </section>
    );
  }

  if (maCandidature?.statut === "en_attente") {
    return (
      <section
        className="anim-scale rounded-xl border border-amber-200 bg-amber-50 p-4"
        aria-label={t("projets.collab.envoyee_titre")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-amber-900">
              ⏳ {t("projets.collab.envoyee_titre")}
            </h2>
            <p className="text-sm text-amber-900/80">
              {t("projets.collab.envoyee_texte")}
            </p>
          </div>
          <button
            type="button"
            disabled={occupe}
            onClick={() => action(() => retirerCandidature(maCandidature.id))}
            className="btn-outline"
          >
            {t("projets.collab.retirer")}
          </button>
        </div>
        <Erreur />
      </section>
    );
  }

  if (projet.statut === "termine")
    return (
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
        {t("projets.collab.termine_note")}
      </p>
    );

  return (
    <section className="card" aria-label={t("projets.collab.rejoindre_titre")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            🤝 {t("projets.collab.rejoindre_titre")}
          </h2>
          <p className="text-sm text-slate-600">
            {t("projets.collab.rejoindre_texte")}
          </p>
          {maCandidature?.statut === "refusee" && (
            <p className="mt-1 text-sm text-slate-500">
              {t("projets.collab.refusee_note")}
            </p>
          )}
        </div>
        {!ouvert && (
          <button
            type="button"
            onClick={() => (user ? setOuvert(true) : versConnexion())}
            className="btn"
          >
            {user
              ? t("projets.collab.rejoindre_bouton")
              : t("projets.collab.rejoindre_connexion")}
          </button>
        )}
      </div>
      {ouvert && (
        <form onSubmit={envoyer} className="anim-scale mt-4 space-y-3">
          <div>
            <label htmlFor="cand-message" className="label">
              {t("projets.collab.message_label")}
            </label>
            <textarea
              id="cand-message"
              className="input min-h-[6rem]"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              required
              minLength={10}
              placeholder={t("projets.collab.message_placeholder")}
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("projets.collab.message_aide")} · {message.length} / 1000
            </p>
          </div>
          <div>
            <label htmlFor="cand-role" className="label">
              {t("projets.collab.role_label")}
            </label>
            <input
              id="cand-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              maxLength={100}
              placeholder={t("projets.collab.role_placeholder")}
            />
            {projet.roles_recherches?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {projet.roles_recherches.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded px-2 py-0.5 transition ${role === r ? "bg-brand text-white" : "bg-amber-100 text-amber-900 hover:bg-amber-200"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              disabled={occupe || message.trim().length < 10}
            >
              {occupe ? t("commun.chargement") : t("projets.collab.envoyer")}
            </button>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="btn-outline"
            >
              {t("commun.annuler")}
            </button>
          </div>
        </form>
      )}
      <Erreur />
    </section>
  );
}
