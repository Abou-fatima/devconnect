import { Component } from "react";
import { withTranslation } from "react-i18next";

/* Évite l'écran blanc : si une page ne se charge pas (réseau coupé, ou nouvelle version publiée pendant la visite),
   on propose de réessayer au lieu de laisser une page vide. */
class Barriere extends Component {
  state = { erreur: false };
  static getDerivedStateFromError() {
    return { erreur: true };
  }
  componentDidCatch(e) {
    console.error("[page]", e);
  }
  render() {
    if (!this.state.erreur) return this.props.children;
    const { t } = this.props;
    return (
      <div className="card mx-auto max-w-md text-center" role="alert">
        <p className="font-semibold">{t("commun.erreur")}</p>
        <button
          type="button"
          className="btn mt-3"
          onClick={() => window.location.reload()}
        >
          {t("chat.reessayer")}
        </button>
      </div>
    );
  }
}

export default withTranslation()(Barriere);
