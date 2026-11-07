import { Children, cloneElement, isValidElement } from 'react';

// Champ de formulaire : libellé, aide, et message d'erreur affiché juste sous la zone de saisie.
// requis : ajoute l'étoile rouge « * » au libellé (champ obligatoire) et prévient les lecteurs d'écran (aria-required).
export default function Field({ label, hint, erreur, requis = false, children }) {
  const attributs = {};
  if (erreur) attributs['aria-invalid'] = true;
  if (requis) attributs['aria-required'] = true;
  const enfant = Object.keys(attributs).length && Children.count(children) === 1 && isValidElement(children) ? cloneElement(children, attributs) : children;
  return (
    <label className={`block ${erreur ? 'champ-erreur' : ''}`}>
      <span className="label">{label}{requis && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}</span>
      {enfant}
      {erreur && <span role="alert" className="mt-1 block text-sm font-medium text-red-600">{erreur}</span>}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
