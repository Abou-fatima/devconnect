// Exécution du code d'un défi dans le NAVIGATEUR, jamais sur le serveur : un Web Worker jetable, sans accès à la page,
// sans réseau, avec une limite de temps par test (une boucle infinie est arrêtée net).
// Le worker répond avec un jeton secret tiré à chaque lancement : le code du participant ne peut pas le lire,
// donc ne peut pas fabriquer de faux « test réussi ».

export const SOURCE_WORKER = `
(function () {
  var envoyer = self.postMessage.bind(self);
  function egal(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && egal(a[k], b[k]); });
  }
  function afficher(v) {
    if (typeof v === 'function') return 'function';
    try { var s = JSON.stringify(v); return (s === undefined ? String(v) : s).slice(0, 200); } catch (e) { return String(v).slice(0, 200); }
  }
  self.onmessage = function (e) {
    var d = e.data, jeton = d.jeton;
    ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'Worker', 'SharedWorker', 'BroadcastChannel'].forEach(function (k) {
      try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (x) { try { self[k] = undefined; } catch (y) {} }
    });
    var fn;
    try {
      fn = new Function(d.code + '\\nreturn (typeof ' + d.nom + ' === "function") ? ' + d.nom + ' : undefined;')();
    } catch (err) {
      envoyer({ jeton: jeton, type: 'erreur_code', message: String(err && err.message || err) });
      return;
    }
    if (typeof fn !== 'function') {
      envoyer({ jeton: jeton, type: 'erreur_code', message: 'La fonction ' + d.nom + ' n’est pas définie.' });
      return;
    }
    d.tests.forEach(function (t, i) {
      var entree = JSON.parse(JSON.stringify(t.entree));
      try {
        var res = fn.apply(null, entree);
        if (res && typeof res.then === 'function') {
          envoyer({ jeton: jeton, type: 'test', i: i, ok: false, obtenu: 'Promise', erreur: 'Le résultat doit être renvoyé directement (pas de promesse).' });
        } else {
          envoyer({ jeton: jeton, type: 'test', i: i, ok: egal(res, t.attendu), obtenu: afficher(res) });
        }
      } catch (err) {
        envoyer({ jeton: jeton, type: 'test', i: i, ok: false, erreur: String(err && err.message || err).slice(0, 200) });
      }
    });
    envoyer({ jeton: jeton, type: 'fin' });
  };
})();
`;

const jetonAleatoire = () => {
  const a = new Uint32Array(4);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => n.toString(36)).join('');
};

/* Lance les tests. Résout toujours (jamais d'exception) avec :
   { resultats: [{ ok, obtenu?, erreur? }], erreur? (code invalide, fonction absente…), delai? (temps dépassé) } */
export function executerTests({ code, nomFonction, tests, delaiParTest = 2000 }) {
  return new Promise((resolve) => {
    let url;
    let w;
    try {
      url = URL.createObjectURL(new Blob([SOURCE_WORKER], { type: 'text/javascript' }));
      w = new Worker(url);
    } catch {
      if (url) URL.revokeObjectURL(url);
      resolve({ resultats: [], erreur: 'execution_impossible' });
      return;
    }
    const jeton = jetonAleatoire();
    const resultats = [];
    let minuteur;
    let termine = false;
    const fin = (extra) => {
      if (termine) return;
      termine = true;
      clearTimeout(minuteur);
      w.terminate();
      URL.revokeObjectURL(url);
      while (resultats.length < tests.length) resultats.push({ ok: false, erreur: 'Non exécuté' });
      resolve({ resultats, ...extra });
    };
    const armer = () => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => {
        resultats.push({ ok: false, erreur: 'Temps dépassé (boucle infinie ?)' });
        fin({ delai: true });
      }, delaiParTest);
    };
    w.onmessage = (e) => {
      const m = e.data;
      if (!m || m.jeton !== jeton) return;
      if (m.type === 'erreur_code') fin({ erreur: m.message });
      else if (m.type === 'test') { resultats[m.i] = { ok: m.ok === true, obtenu: m.obtenu, erreur: m.erreur }; armer(); }
      else if (m.type === 'fin') fin({});
    };
    w.onerror = (ev) => { if (ev.preventDefault) ev.preventDefault(); fin({ erreur: ev.message || 'Erreur dans votre code' }); };
    armer();
    w.postMessage({ jeton, code, nom: nomFonction, tests: tests.map((t) => ({ entree: t.entree, attendu: t.attendu })) });
  });
}
