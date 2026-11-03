// Messages de validation en français pour tous les schémas zod (sinon zod répond en anglais : « String must contain… »).
// Les messages écrits à la main dans les validateurs (ex. « Minimum 8 caractères ») gardent la priorité.
const { z } = require("zod");

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case "invalid_type":
      return {
        message:
          issue.received === "undefined" ? "Champ requis" : "Valeur invalide",
      };
    case "too_small":
      if (issue.type === "string")
        return {
          message:
            issue.minimum <= 1
              ? "Champ requis"
              : `Minimum ${issue.minimum} caractères`,
        };
      if (issue.type === "array")
        return { message: `Au moins ${issue.minimum} élément(s)` };
      return { message: `Valeur minimale : ${issue.minimum}` };
    case "too_big":
      if (issue.type === "string")
        return { message: `Maximum ${issue.maximum} caractères` };
      if (issue.type === "array")
        return { message: `Maximum ${issue.maximum} élément(s)` };
      return { message: `Valeur maximale : ${issue.maximum}` };
    case "invalid_string":
      if (issue.validation === "email") return { message: "Email invalide" };
      if (issue.validation === "url") return { message: "URL invalide" };
      return { message: "Format invalide" };
    case "invalid_enum_value":
      return { message: "Valeur non autorisée" };
    default:
      return { message: ctx.defaultError };
  }
});
