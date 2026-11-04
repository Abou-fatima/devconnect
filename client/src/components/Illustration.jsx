// Illustration décorative (alt vide : le texte à côté porte déjà le sens). Le mélange « multiply » fond le fond clair de l'image dans la carte.
export default function Illustration({ src, className = "" }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width="320"
      height="280"
      className={`mx-auto mb-3 h-40 w-auto select-none mix-blend-multiply sm:h-48 ${className}`}
      draggable="false"
    />
  );
}
