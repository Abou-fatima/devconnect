// Registre des icônes Font Awesome Free (solid + regular) utilisées par l'interface.
// On importe chaque icône une par une : le build n'embarque que celles-ci (pas toute la bibliothèque).
import {
  faArrowLeft, faArrowRight, faArrowUpRightFromSquare, faAt, faBell, faBellSlash, faBookOpen, faBriefcase, faCaretUp, faCheck,
  faCircleCheck, faCircleInfo, faClipboardList, faComments, faEarthAfrica, faEnvelope, faEye, faGraduationCap, faHand,
  faHandshake, faHeart, faImage, faKey, faLeaf, faLightbulb, faLocationDot, faLock, faMagnifyingGlass, faMedal, faMicrophone,
  faPaperPlane, faPen, faRocket, faSeedling, faShieldHalved, faStar, faThumbsUp, faTrash, faTree, faTrophy, faUser, faUserGroup,
  faWandMagicSparkles, faXmark, faHouse, faCompass, faHourglassHalf, faStop, faPlus, faCircleQuestion, faChevronRight, faFaceSmile, faReply
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartVide } from '@fortawesome/free-regular-svg-icons';

export const ICONES = {
  messages: faComments, etoile: faStar, courrier: faEnvelope, mentorat: faGraduationCap, equipe: faHandshake, projet: faRocket,
  monde: faEarthAfrica, verrou: faLock, cloche: faBell, clocheBarree: faBellSlash, lieu: faLocationDot, recherche: faMagnifyingGlass,
  coeur: faHeart, coeurVide: faHeartVide, liste: faClipboardList, corbeille: faTrash, groupe: faUserGroup, trophee: faTrophy,
  mallette: faBriefcase, succes: faCircleCheck, pousse: faSeedling, feuille: faLeaf, arbre: faTree, info: faCircleInfo, image: faImage,
  micro: faMicrophone, vues: faEye, modifier: faPen, idee: faLightbulb, bouclier: faShieldHalved, utilisateur: faUser, cle: faKey,
  pouce: faThumbsUp, envoye: faPaperPlane, main: faHand, livres: faBookOpen, magie: faWandMagicSparkles, badge: faMedal,
  medaille: faMedal, ok: faCheck, fermer: faXmark, retour: faArrowLeft, suite: faArrowRight, externe: faArrowUpRightFromSquare,
  haut: faCaretUp, arobase: faAt, maison: faHouse, boussole: faCompass, sablier: faHourglassHalf, stop: faStop, plus: faPlus, aide: faCircleQuestion, chevron: faChevronRight, reaction: faFaceSmile, repondre: faReply
};
