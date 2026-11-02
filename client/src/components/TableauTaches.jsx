import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  creerTache,
  listerTaches,
  modifierTache,
  supprimerTache,
} from "../services/taches";
import { messageErreur } from "../services/api";
import { idPersonne } from "../lib/projets";
import Avatar from "./Avatar";

const COLONNES = ["a_faire", "en_cours", "termine"];
const STYLE = {
  a_faire: "bg-slate-100",
  en_cours: "bg-amber-50",
  termine: "bg-emerald-50",
};
const POINT = {
  a_faire: "bg-slate-400",
  en_cours: "bg-amber-500",
  termine: "bg-emerald-500",
};

/* Espace projet : tableau de tâches de l'équipe (à faire / en cours / terminé).
   Visible seulement par le porteur et les membres. Déplacement par boutons (clair sur mobile) ou par glisser-déposer. */
export default function TableauTaches({ projetId, equipe }) {
  const { t } = useTranslation();
  const [taches, setTaches] = useState(null);
  const [titre, setTitre] = useState("");
  const [assigne, setAssigne] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [survol, setSurvol] = useState(null);
  const [suppr, setSuppr] = useState(null);

  useEffect(() => {
    let actif = true;
    listerTaches(projetId)
      .then((d) => actif && setTaches(d))
      .catch(
        (e) =>
          actif &&
          (setErreur(messageErreur(e, t("commun.erreur"))), setTaches([])),
      );
    return () => {
      actif = false;
    };
  }, [projetId, t]);

  const membre = (id) => equipe.find((m) => m.id === id);

  const ajouter = async (e) => {
    e.preventDefault();
    if (titre.trim().length < 2) return;
    setOccupe(true);
    setErreur("");
    try {
      const nouvelle = await creerTache(projetId, {
        titre: titre.trim(),
        ...(assigne && { assigne_a: assigne }),
      });
      setTaches((l) => [...l, nouvelle]);
      setTitre("");
      setAssigne("");
    } catch (err) {
      setErreur(messageErreur(err, t("commun.erreur")));
    } finally {
      setOccupe(false);
    }
  };

  // Mise à jour immédiate à l'écran, annulée si le serveur refuse.
  const changer = async (tache, chg) => {
    const avant = taches;
    setTaches((l) => l.map((x) => (x.id === tache.id ? { ...x, ...chg } : x)));
    setErreur("");
    try {
      const maj = await modifierTache(projetId, tache.id, chg);
      setTaches((l) => l.map((x) => (x.id === maj.id ? maj : x)));
    } catch (err) {
      setTaches(avant);
      setErreur(messageErreur(err, t("commun.erreur")));
    }
  };

  const retirer = async (tache) => {
    setOccupe(true);
    setErreur("");
    try {
      await supprimerTache(projetId, tache.id);
      setTaches((l) => l.filter((x) => x.id !== tache.id));
      setSuppr(null);
    } catch (err) {
      setErreur(messageErreur(err, t("commun.erreur")));
    } finally {
      setOccupe(false);
    }
  };

  const deposer = (e, statut) => {
    e.preventDefault();
    setSurvol(null);
    const tache = taches.find(
      (x) => x.id === e.dataTransfer.getData("text/plain"),
    );
    if (tache && tache.statut !== statut) changer(tache, { statut });
  };

  if (taches === null)
    return (
      <section className="card" aria-busy="true">
        <div className="shimmer h-5 w-1/3 rounded" />
        <div className="shimmer mt-3 h-24 w-full rounded" />
      </section>
    );
  const fait = taches.filter((x) => x.statut === "termine").length;
  const pct = taches.length ? Math.round((fait / taches.length) * 100) : 0;

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">📋 {t("projets.taches.titre")}</h2>
        {taches.length > 0 && (
          <span className="text-sm text-slate-500">
            {t("projets.taches.avancement", { fait, total: taches.length })}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600">{t("projets.taches.sous_titre")}</p>
      {taches.length > 0 && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <form onSubmit={ajouter} className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="nouvelle-tache">
          {t("projets.taches.nouvelle")}
        </label>
        <input
          id="nouvelle-tache"
          className="input min-w-0 flex-1 basis-48"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          maxLength={120}
          placeholder={t("projets.taches.nouvelle_placeholder")}
        />
        <label className="sr-only" htmlFor="assigne-tache">
          {t("projets.taches.assigner")}
        </label>
        <select
          id="assigne-tache"
          className="input !w-auto"
          value={assigne}
          onChange={(e) => setAssigne(e.target.value)}
        >
          <option value="">{t("projets.taches.personne")}</option>
          {equipe.map((m) => (
            <option key={m.id} value={m.id}>
              {m.pseudo}
            </option>
          ))}
        </select>
        <button className="btn" disabled={occupe || titre.trim().length < 2}>
          {t("projets.taches.ajouter")}
        </button>
      </form>
      {erreur && (
        <div className="erreur mt-3" role="alert">
          {erreur}
        </div>
      )}

      {taches.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-slate-500">
          {t("projets.taches.vide")}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {COLONNES.map((col) => {
            const liste = taches.filter((x) => x.statut === col);
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSurvol(col);
                }}
                onDragLeave={() => setSurvol(null)}
                onDrop={(e) => deposer(e, col)}
                className={`rounded-xl p-2 transition-shadow ${STYLE[col]} ${survol === col ? "ring-2 ring-brand" : ""}`}
              >
                <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${POINT[col]}`}
                    aria-hidden
                  />
                  {t(`projets.taches.col.${col}`)}
                  <span className="text-slate-400">{liste.length}</span>
                </h3>
                <ul className="space-y-2">
                  {liste.map((x) => {
                    const m = x.assigne_a ? membre(x.assigne_a) : null;
                    const i = COLONNES.indexOf(col);
                    return (
                      <li
                        key={x.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", x.id)
                        }
                        className="anim-scale cursor-grab rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-200 active:cursor-grabbing"
                      >
                        <p
                          className={`break-words text-sm font-medium ${col === "termine" ? "text-slate-500 line-through" : "text-slate-800"}`}
                        >
                          {x.titre}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {m && (
                            <span className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs">
                              <Avatar user={m} size={18} />
                              {m.pseudo}
                            </span>
                          )}
                          <select
                            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                            aria-label={t("projets.taches.assigner")}
                            value={x.assigne_a || ""}
                            onChange={(e) =>
                              changer(x, { assigne_a: e.target.value || null })
                            }
                          >
                            <option value="">
                              {t("projets.taches.personne")}
                            </option>
                            {equipe.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.pseudo}
                              </option>
                            ))}
                          </select>
                          <span className="ml-auto flex gap-1">
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  changer(x, { statut: COLONNES[i - 1] })
                                }
                                className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                                aria-label={t("projets.taches.reculer")}
                                title={t("projets.taches.reculer")}
                              >
                                ←
                              </button>
                            )}
                            {i < 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  changer(x, { statut: COLONNES[i + 1] })
                                }
                                className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                                aria-label={t("projets.taches.avancer")}
                                title={t("projets.taches.avancer")}
                              >
                                →
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSuppr(x.id)}
                              className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50"
                              aria-label={t("projets.taches.supprimer")}
                              title={t("projets.taches.supprimer")}
                            >
                              🗑
                            </button>
                          </span>
                        </div>
                        {suppr === x.id && (
                          <div
                            className="anim-scale mt-2 rounded bg-red-50 p-2 text-sm"
                            role="alertdialog"
                          >
                            <p className="font-medium text-red-900">
                              {t("projets.taches.supprimer_confirm")}
                            </p>
                            <div className="mt-1 flex gap-2">
                              <button
                                type="button"
                                disabled={occupe}
                                onClick={() => retirer(x)}
                                className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {t("projets.taches.supprimer_oui")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSuppr(null)}
                                className="btn-outline !py-1"
                              >
                                {t("commun.annuler")}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
