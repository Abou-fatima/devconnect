import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONES } from '../lib/icones';

// Icône Font Awesome par nom (voir lib/icones.js). Décorative par défaut : le texte à côté porte le sens.
// Pour une icône seule qui doit être lue par un lecteur d'écran, passer `titre`.
export default function Icone({ nom, className = '', titre, ...autres }) {
  const icone = ICONES[nom];
  if (!icone) return null;
  return <FontAwesomeIcon icon={icone} className={className} title={titre} aria-hidden={titre ? undefined : true} {...autres} />;
}
