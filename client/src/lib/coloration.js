// Coloration syntaxique des blocs de code, sans aucune bibliothèque : analyse simple par expressions régulières.
// colorier(code, langue) -> [{ type, texte }] ; mettre les morceaux bout à bout redonne exactement le code d'origine.
// Types : commentaire, chaine, nombre, mot_cle, literal, fonction, type, propriete, attribut, balise, variable, null (texte normal).
// Volontairement approximatif (pas un vrai analyseur) : c'est une aide à la lecture, jamais une modification du code.

const MAX = 20000; // au-delà, pas de coloration (rester rapide sur mobile)

const mots = (s) => new Set(s.split(/\s+/).filter(Boolean));

const MOTS_JS = mots('break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await interface type enum implements private public protected readonly as namespace declare abstract');
const MOTS_PY = mots('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self');
const MOTS_C = mots('abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new package private protected public return short static super switch synchronized this throw throws try void volatile while var string struct typedef namespace using unsigned signed sizeof func go defer fn let mut pub impl trait match use mod async await function echo foreach as fun val object override open lateinit');
const MOTS_SH = mots('if then else elif fi for while until do done case esac in function select return exit export local readonly source echo cd ls cat grep sed awk git npm npx node pip python sudo apt curl mkdir rm cp mv chmod chown set unset');
const MOTS_SQL = mots('select from where and or not in is null like between join inner left right outer full cross on group by order having limit offset insert into values update set delete create table alter drop index primary key foreign references unique default distinct as union all case when then else end exists count sum avg min max asc desc database view if begin commit rollback');
const MOTS_CSS = mots('important');
const LITTERAUX = mots('true false null undefined NaN Infinity True False None nil NULL TRUE FALSE');

const ID = /[A-Za-z_$][\w$]*/y;
const SPACE = /\s+/y;

// Règles : [type, expression régulière collante]. La première qui correspond gagne.
const R = {
  commentaireC: ['commentaire', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  commentaireDiese: ['commentaire', /#[^\n]*/y],
  commentaireSql: ['commentaire', /--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  commentaireHtml: ['commentaire', /<!--[\s\S]*?(?:-->|$)/y],
  chaine: ['chaine', /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?/y],
  chaineModele: ['chaine', /`(?:[^`\\]|\\[\s\S])*`?/y],
  chainePython: ['chaine', /"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?/y],
  nombre: ['nombre', /0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
  variable: ['variable', /\$\{?[A-Za-z_]\w*\}?|\$[0-9@#?*]/y],
  decorateur: ['fonction', /@[A-Za-z_][\w.]*/y]
};

const LANGAGES = {
  js: { regles: [R.commentaireC, R.chaine, R.chaineModele, R.nombre], mots: MOTS_JS, appel: true, classes: true },
  python: { regles: [R.commentaireDiese, R.chainePython, R.decorateur, R.nombre], mots: MOTS_PY, appel: true, classes: true },
  c: { regles: [R.commentaireC, R.chaine, R.nombre], mots: MOTS_C, appel: true, classes: true },
  php: { regles: [R.commentaireC, R.commentaireDiese, R.chaine, R.variable, R.nombre], mots: MOTS_C, appel: true, classes: true },
  bash: { regles: [R.commentaireDiese, R.chaine, R.variable, R.nombre], mots: MOTS_SH, appel: false, classes: false },
  sql: { regles: [R.commentaireSql, ['chaine', /'(?:[^'\\]|\\.|'')*'?/y], R.nombre], mots: MOTS_SQL, insensible: true, appel: true, classes: false },
  json: { regles: [['propriete', /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y], R.chaine, R.nombre], mots: new Set(), appel: false, classes: false },
  yaml: { regles: [R.commentaireDiese, ['propriete', /[A-Za-z_][\w.-]*(?=\s*:)/y], R.chaine, R.nombre], mots: new Set(), appel: false, classes: false },
  html: {
    regles: [R.commentaireHtml, ['balise', /<\/?[A-Za-z][\w:-]*|\/?>/y], ['attribut', /[A-Za-z_:@][\w:.@-]*(?==)/y], R.chaine],
    mots: new Set(), appel: false, classes: false, sansIdentifiants: true
  },
  css: {
    regles: [R.commentaireC, R.chaine, ['nombre', /#[\da-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg)?/y], ['mot_cle', /@[A-Za-z-]+/y], ['attribut', /[A-Za-z-]+(?=\s*:)/y], ['balise', /[.#][A-Za-z_][\w-]*/y]],
    mots: MOTS_CSS, appel: false, classes: false
  }
};

const ALIAS = {
  js: 'js', javascript: 'js', jsx: 'js', mjs: 'js', cjs: 'js', node: 'js', ts: 'js', typescript: 'js', tsx: 'js', vue: 'html',
  py: 'python', python: 'python', python3: 'python',
  java: 'c', c: 'c', cpp: 'c', 'c++': 'c', cs: 'c', csharp: 'c', 'c#': 'c', go: 'c', golang: 'c', rust: 'c', rs: 'c', kotlin: 'c', kt: 'c', dart: 'c', swift: 'c', scala: 'c',
  php: 'php', bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', powershell: 'bash', ps1: 'bash', cmd: 'bash',
  sql: 'sql', mysql: 'sql', postgres: 'sql', postgresql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml',
  html: 'html', xml: 'html', svg: 'html', css: 'css', scss: 'css', sass: 'css', less: 'css'
};

// Sans langue indiquée : on devine seulement quand c'est clair ; sinon pas de coloration.
export function deviner(code) {
  const c = String(code || '');
  if (/^\s*[[{][\s\S]*[\]}]\s*$/.test(c)) { try { JSON.parse(c); return 'json'; } catch { /* pas du JSON */ } }
  if (/^\s*<[A-Za-z!?]/.test(c)) return 'html';
  if (/\b(SELECT|INSERT INTO|UPDATE|CREATE TABLE|DELETE FROM)\b/i.test(c)) return 'sql';
  if (/^\s*(def |class \w+.*:|import \w+|from \w+ import|print\()/m.test(c)) return 'python';
  if (/\b(const|let|var|function)\b|=>|console\.|require\(/.test(c)) return 'js';
  if (/^\s*(\$ |npm |git |cd |sudo |pip )/m.test(c)) return 'bash';
  return null;
}

export const langageConnu = (langue) => ALIAS[String(langue || '').toLowerCase()] || null;

export function colorier(code, langue) {
  const src = String(code == null ? '' : code);
  const cle = langageConnu(langue) || (langue ? null : deviner(src));
  if (!cle || src.length > MAX) return [{ type: null, texte: src }];
  const L = LANGAGES[cle];
  const sortie = [];
  const ajouter = (type, texte) => {
    if (!texte) return;
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.type === type) dernier.texte += texte; else sortie.push({ type, texte });
  };
  let i = 0;
  while (i < src.length) {
    let pris = false;
    for (const [type, re] of L.regles) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m && m[0].length > 0) { ajouter(type, m[0]); i += m[0].length; pris = true; break; }
    }
    if (pris) continue;
    if (!L.sansIdentifiants) {
      ID.lastIndex = i;
      const m = ID.exec(src);
      if (m) {
        const mot = m[0];
        const test = L.insensible ? mot.toLowerCase() : mot;
        let type = null;
        if (LITTERAUX.has(mot) && cle !== 'sql') type = 'literal';
        else if (L.mots.has(test)) type = 'mot_cle';
        else if (L.appel && src[i + mot.length] === '(') type = 'fonction';
        else if (L.classes && /^[A-Z][a-z]/.test(mot)) type = 'type';
        ajouter(type, mot); i += mot.length; continue;
      }
    }
    SPACE.lastIndex = i;
    const e = SPACE.exec(src);
    if (e) { ajouter(null, e[0]); i += e[0].length; continue; }
    ajouter(null, src[i]); i += 1; // un caractère quelconque (symbole, chiffre isolé, accent…)
  }
  return sortie;
}
