import { useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../services/auth";
import BoutonGithub from "../components/BoutonGithub";
import { messageErreur } from "../services/api";
import { erreursChamps } from "../lib/erreurs";
import { validerConnexion } from "../lib/validation";
import { useAuth } from "../context/AuthContext";
import Field from "../components/Field";

export default function Connexion() {
  const { t } = useTranslation();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ identifiant: "", mot_de_passe: "" });
  const [erreur, setErreur] = useState(
    params.get("erreur") === "github" ? t("auth.erreur_github") : "",
  );
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const formRef = useRef(null);

  const change = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErreurs((x) => (x[k] ? { ...x, [k]: undefined } : x));
  };
  const focusPremiere = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus(),
    );

  const submit = async (e) => {
    e.preventDefault();
    setErreur("");
    const locales = validerConnexion(form, t);
    setErreurs(locales);
    if (Object.keys(locales).length) {
      focusPremiere();
      return;
    }
    setEnvoi(true);
    try {
      setSession(await login(form));
      navigate(location.state?.from || "/profil", { replace: true });
    } catch (err) {
      if (err?.response?.status === 401) {
        setErreurs({ mot_de_passe: t("erreurs.identifiants") });
        focusPremiere();
      } else {
        const champs = erreursChamps(err);
        if (Object.keys(champs).some((k) => k in form)) {
          setErreurs(champs);
          focusPremiere();
        } else setErreur(messageErreur(err, t("commun.erreur")));
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="anim-scale">
        <h1 className="mb-4 text-2xl font-bold">{t("auth.titre_connexion")}</h1>
        <form
          ref={formRef}
          onSubmit={submit}
          noValidate
          className="card space-y-4"
        >
          {erreur && (
            <div className="erreur" role="alert">
              {erreur}
            </div>
          )}
          <Field label={t("auth.identifiant")} erreur={erreurs.identifiant}>
            <input
              className="input"
              value={form.identifiant}
              onChange={change("identifiant")}
              autoComplete="username"
            />
          </Field>
          <Field label={t("auth.mdp")} erreur={erreurs.mot_de_passe}>
            <input
              className="input"
              type="password"
              value={form.mot_de_passe}
              onChange={change("mot_de_passe")}
              autoComplete="current-password"
            />
          </Field>
          <button className="btn w-full" disabled={envoi}>
            {t("auth.se_connecter")}
          </button>
          <div className="text-center text-sm text-slate-400">
            {t("auth.ou")}
          </div>
          <BoutonGithub />
        </form>
        <p className="mt-4 text-center text-sm">
          {t("auth.pas_de_compte")}{" "}
          <Link to="/inscription" className="text-brand-light underline">
            {t("nav.inscription")}
          </Link>
        </p>
      </div>
    </div>
  );
}
