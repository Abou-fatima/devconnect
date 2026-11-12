// Lien d'invitation d'un salon et texte de partage.
export const lienInvitation = (code) =>
  `${window.location.origin}/salons/invitation/${code}`;
export const lienWhatsApp = (texte, lien) =>
  `https://wa.me/?text=${encodeURIComponent(`${texte} ${lien}`)}`;
