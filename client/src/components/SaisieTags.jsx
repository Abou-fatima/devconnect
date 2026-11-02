import { useState } from "react";

// Champ « étiquettes » : Entrée, virgule ou espace ajoute, Retour arrière retire la dernière. Propose des suggestions cliquables.
export default function SaisieTags({
  id,
  valeur,
  onChange,
  nettoyer,
  suggestions = [],
  max = 10,
  placeholder,
  libelleRetirer,
  libelleSuggestions,
}) {
  const [saisie, setSaisie] = useState("");
  const ajouter = (brut) => {
    const v = nettoyer(brut);
    if (v && !valeur.includes(v) && valeur.length < max)
      onChange([...valeur, v]);
    setSaisie("");
  };
  const touche = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      if (saisie.trim()) {
        e.preventDefault();
        ajouter(saisie);
      } else if (e.key === "Enter") e.preventDefault();
    } else if (e.key === "Backspace" && !saisie && valeur.length)
      onChange(valeur.slice(0, -1));
  };
  const proposees = suggestions
    .filter(
      (s) => !valeur.includes(s) && (!saisie || s.includes(nettoyer(saisie))),
    )
    .slice(0, 8);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 transition focus-within:border-brand-light focus-within:ring-2 focus-within:ring-brand-light/30">
        {valeur.map((x) => (
          <span
            key={x}
            className="anim-scale inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 text-sm text-brand"
          >
            {x}
            <button
              type="button"
              onClick={() => onChange(valeur.filter((y) => y !== x))}
              aria-label={libelleRetirer(x)}
              className="text-brand/70 hover:text-brand"
            >
              ✕
            </button>
          </span>
        ))}
        {valeur.length < max && (
          <input
            id={id}
            className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={touche}
            onBlur={() => saisie.trim() && ajouter(saisie)}
            placeholder={valeur.length ? "" : placeholder}
            maxLength={50}
          />
        )}
      </div>
      {proposees.length > 0 && valeur.length < max && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">{libelleSuggestions}</span>
          {proposees.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ajouter(s)}
              className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 transition hover:bg-slate-200"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
