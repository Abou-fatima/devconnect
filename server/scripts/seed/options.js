// Options de la ligne de commande et garde-fou « base locale » du seed (fonctions pures, testables sans MongoDB).

function lireArguments(argv) {
  const a = { clean: false, force: false, utilisateurs: 200, questions: 60, projets: 32, graine: 2026 };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i]; const nombre = () => { const n = Number(argv[i + 1]); i += 1; if (!Number.isInteger(n) || n < 1) throw new Error(`Valeur invalide après ${k}`); return n; };
    if (k === '--clean') a.clean = true;
    else if (k === '--force') a.force = true;
    else if (k === '--users') a.utilisateurs = nombre();
    else if (k === '--questions') a.questions = nombre();
    else if (k === '--projets') a.projets = nombre();
    else if (k === '--graine') a.graine = nombre();
    else throw new Error(`Option inconnue : ${k}`);
  }
  if (a.utilisateurs < 10 || a.utilisateurs > 5000) throw new Error('--users doit être entre 10 et 5000');
  return a;
}

const estLocale = (uri) => /^mongodb(\+srv)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\]|mongo|mongodb)(:\d+)?\//i.test(uri);

module.exports = { lireArguments, estLocale };
