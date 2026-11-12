// Trois défis de démonstration (JavaScript). Chacun porte sa solution de référence : le test `tests/defis.test.js`
// les exécute et vérifie que les tests donnés sont cohérents avant toute publication.
const t = (entree, attendu, visible = false) => ({ entree, attendu, visible });

const DEFIS_DEMO = [
  {
    titre: "Inverser une chaîne",
    enonce: "Écrivez la fonction `inverser(texte)` qui renvoie le texte lu à l'envers.\n\nExemple : inverser(\"Dakar\") renvoie \"rakaD\". Une chaîne vide reste vide.",
    nom_fonction: "inverser",
    tags: ["javascript", "debutant"],
    solution: "function inverser(texte) { return [...texte].reverse().join(''); }",
    tests: [t(["Dakar"], "rakaD", true), t([""], "", true), t(["abc"], "cba"), t(["a"], "a"), t(["Conakry 2026"], "6202 yrkanoC"), t(["éa"], "aé")],
  },
  {
    titre: "Palindrome ou pas ?",
    enonce: "Écrivez la fonction `estPalindrome(texte)` qui renvoie `true` si le texte se lit pareil dans les deux sens, en ignorant les majuscules, les espaces et la ponctuation.\n\nExemple : estPalindrome(\"Kayak\") renvoie true ; estPalindrome(\"Bonjour\") renvoie false.",
    nom_fonction: "estPalindrome",
    tags: ["javascript", "chaines"],
    solution: "function estPalindrome(texte) { const s = texte.toLowerCase().replace(/[^a-z0-9]/g, ''); return s === [...s].reverse().join(''); }",
    tests: [t(["Kayak"], true, true), t(["Bonjour"], false, true), t(["Ressasser"], true), t(["A man, a plan, a canal: Panama"], true), t(["DevConnect"], false), t([""], true)],
  },
  {
    titre: "Somme des nombres pairs",
    enonce: "Écrivez la fonction `sommePairs(nombres)` qui renvoie la somme des nombres pairs d'une liste.\n\nExemple : sommePairs([1, 2, 3, 4]) renvoie 6. Une liste sans nombre pair donne 0.",
    nom_fonction: "sommePairs",
    tags: ["javascript", "tableaux"],
    solution: "function sommePairs(nombres) { return nombres.filter((n) => n % 2 === 0).reduce((a, b) => a + b, 0); }",
    tests: [t([[1, 2, 3, 4]], 6, true), t([[]], 0, true), t([[1, 3, 5]], 0), t([[2, 4, 6, 8]], 20), t([[-2, -1, 0, 7, 10]], 8), t([[100]], 100)],
  },
];

module.exports = { DEFIS_DEMO };
