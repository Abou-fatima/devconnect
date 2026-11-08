// Aides de l'éditeur du défi (fonctions pures, sans dépendance) : autocomplétion et indentation automatique.

const MOTS = ('break case catch class const continue default else export false finally for function if import in instanceof let new null of return switch this throw true try typeof undefined var while ' +
  'Array Boolean Date JSON Map Math Number Object Promise RegExp Set String Symbol console parseInt parseFloat isNaN isFinite ' +
  'length push pop shift unshift slice splice concat join split reverse sort map filter reduce forEach find findIndex includes indexOf some every flat flatMap fill keys values entries ' +
  'toString toUpperCase toLowerCase trim trimStart trimEnd replace replaceAll match startsWith endsWith padStart padEnd repeat charAt charCodeAt substring ' +
  'floor ceil round abs max min pow sqrt random trunc sign fromCharCode isInteger stringify parse hasOwnProperty').split(/\s+/);

const ID = /[A-Za-z_$][\w$]*/g;

// Mot en cours de frappe juste avant le curseur : { debut, mot } ou null.
export function motCourant(texte, curseur) {
  const m = /[A-Za-z_$][\w$]*$/.exec(String(texte).slice(0, curseur));
  return m ? { debut: curseur - m[0].length, mot: m[0] } : null;
}

// Suggestions pour le mot en cours : mots de JavaScript, identifiants déjà écrits dans le code, nom de la fonction du défi.
export function suggestions(texte, curseur, nomFonction = '', max = 6) {
  const cur = motCourant(texte, curseur);
  if (!cur || cur.mot.length < 2) return [];
  const bas = cur.mot.toLowerCase();
  const connus = new Set([...(String(texte).match(ID) || [])]);
  const apres = String(texte).slice(curseur).match(/^[\w$]*/)[0]; // le mot continue après le curseur : on ne propose rien
  if (apres) return [];
  connus.delete(cur.mot);
  const liste = [];
  const vus = new Set();
  for (const mot of [nomFonction, ...connus, ...MOTS]) {
    if (!mot || vus.has(mot) || mot === cur.mot) continue;
    vus.add(mot);
    if (mot.toLowerCase().startsWith(bas)) liste.push(mot);
    if (liste.length >= max) break;
  }
  return liste;
}

// Remplace le mot en cours par la suggestion ; renvoie { texte, curseur }.
export function appliquer(texte, curseur, mot) {
  const cur = motCourant(texte, curseur);
  if (!cur) return { texte, curseur };
  return { texte: texte.slice(0, cur.debut) + mot + texte.slice(curseur), curseur: cur.debut + mot.length };
}

// Entrée : garde l'indentation de la ligne ; ajoute un cran après une accolade ouvrante. Renvoie { texte, curseur }.
export function indenter(texte, debut, fin) {
  const ligne = texte.slice(texte.lastIndexOf('\n', debut - 1) + 1, debut);
  const base = /^[ \t]*/.exec(ligne)[0];
  const ouvre = /[{[(]\s*$/.test(ligne);
  const insere = `\n${base}${ouvre ? '  ' : ''}`;
  return { texte: texte.slice(0, debut) + insere + texte.slice(fin), curseur: debut + insere.length };
}
