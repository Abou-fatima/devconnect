import { Children, cloneElement, isValidElement } from "react";

// Champ de formulaire : libellé, aide, et message d'erreur affiché juste sous la zone de saisie.
export default function Field({ label, hint, erreur, children }) {
  const enfant =
    erreur && Children.count(children) === 1 && isValidElement(children)
      ? cloneElement(children, { "aria-invalid": true })
      : children;
  return (
    <label className={`block ${erreur ? "champ-erreur" : ""}`}>
      <span className="label">{label}</span>
      {enfant}
      {erreur && (
        <span
          role="alert"
          className="mt-1 block text-sm font-medium text-red-600"
        >
          {erreur}
        </span>
      )}
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}
