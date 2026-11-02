// Matière première du jeu de démonstration : noms, villes, textes en français et en anglais.
// Aucun accès base ici : tout est testable sans MongoDB.

const PAYS = {
  GN: ["Conakry", "Kankan", "Labé", "Kindia"],
  SN: ["Dakar", "Thiès", "Saint-Louis"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro"],
  ML: ["Bamako", "Sikasso"],
  BF: ["Ouagadougou", "Bobo-Dioulasso"],
  BJ: ["Cotonou", "Porto-Novo"],
  TG: ["Lomé", "Kara"],
  CM: ["Douala", "Yaoundé"],
  MA: ["Casablanca", "Rabat"],
  NG: ["Lagos", "Abuja"],
  GH: ["Accra", "Kumasi"],
  CD: ["Kinshasa", "Lubumbashi"],
};
// Les pays francophones sont plus fréquents (poids) : c'est la communauté visée par la CADEV.
const POIDS_PAYS = {
  GN: 6,
  SN: 4,
  CI: 4,
  ML: 2,
  BF: 2,
  BJ: 2,
  TG: 2,
  CM: 3,
  MA: 2,
  NG: 1,
  GH: 1,
  CD: 2,
};

const PRENOMS = [
  "Mamadou",
  "Fatoumata",
  "Ibrahima",
  "Aminata",
  "Ousmane",
  "Mariama",
  "Alpha",
  "Aïssatou",
  "Sékou",
  "Kadiatou",
  "Abdoulaye",
  "Hawa",
  "Moussa",
  "Djénéba",
  "Boubacar",
  "Safiatou",
  "Yacouba",
  "Awa",
  "Cheick",
  "Nana",
  "Karim",
  "Salimata",
  "Issa",
  "Rokia",
  "Thierno",
  "Binta",
  "Amadou",
  "Oumou",
  "Lamine",
  "Fanta",
  "Seydou",
  "Mame",
  "Kofi",
  "Ama",
  "Chidi",
  "Ngozi",
  "Jean",
  "Marie",
  "Paul",
  "Estelle",
  "Yassine",
  "Salma",
];
const NOMS = [
  "Diallo",
  "Bah",
  "Camara",
  "Sow",
  "Barry",
  "Keita",
  "Traoré",
  "Sylla",
  "Touré",
  "Condé",
  "Soumah",
  "Bangoura",
  "Kaba",
  "Diop",
  "Ndiaye",
  "Fall",
  "Koné",
  "Ouattara",
  "Sanogo",
  "Coulibaly",
  "Sawadogo",
  "Zongo",
  "Agbo",
  "Mensah",
  "Owusu",
  "Okafor",
  "Nkosi",
  "Ndong",
  "Mbarga",
  "Benali",
];

const STACKS = [
  "javascript",
  "typescript",
  "react",
  "vue",
  "node",
  "express",
  "python",
  "django",
  "flask",
  "php",
  "laravel",
  "java",
  "spring",
  "kotlin",
  "flutter",
  "react-native",
  "go",
  "mongodb",
  "postgresql",
  "mysql",
  "docker",
  "git",
  "linux",
  "devops",
  "machine-learning",
  "ui-ux",
  "cybersecurite",
];
const NIVEAUX = ["debutant", "intermediaire", "avance", "expert"];

const BIOS = {
  fr: [
    "Développeur passionné, j’apprends chaque jour et j’aime partager ce que je sais.",
    "Étudiant en informatique, je construis mes premiers projets web.",
    "Développeuse full-stack, je cherche des projets utiles pour ma communauté.",
    "Je crée des applications mobiles pour résoudre des problèmes locaux.",
    "Autodidacte, j’ai appris le code avec des tutoriels et beaucoup de pratique.",
    "Freelance depuis deux ans, je donne volontiers un coup de main aux débutants.",
  ],
  en: [
    "Passionate developer, learning every day and happy to share what I know.",
    "Computer science student building my first web projects.",
    "Full-stack developer looking for projects that matter to my community.",
    "I build mobile apps that solve local problems.",
    "Self-taught: I learned to code from tutorials and a lot of practice.",
  ],
};

// Modèles de questions ({s} = technologie). Chaque entrée : titre, corps et réponse type.
const QUESTIONS = {
  fr: [
    {
      t: "Comment bien débuter avec {s} ?",
      c: "Je commence avec {s} et je ne sais pas par où démarrer. Quelles ressources et quel ordre d’apprentissage me conseillez-vous ?",
      r: "Commence par un petit projet concret plutôt que par la théorie. La documentation officielle de {s} est très bien faite, et refaire un mini-projet (une liste de tâches par exemple) t’apprendra l’essentiel en une semaine.",
    },
    {
      t: "Erreur incompréhensible avec {s} : par où chercher ?",
      c: "J’obtiens une erreur avec {s} que je ne comprends pas. Comment faire pour la diagnostiquer proprement avant de poser la question ?",
      r: "Lis le message en entier, remonte à la première ligne de la trace qui concerne ton code, puis réduis le problème au plus petit exemple qui reproduit l’erreur. Souvent la cause apparaît à ce moment-là.",
    },
    {
      t: "Quelles bonnes pratiques pour structurer un projet {s} ?",
      c: "Mon projet {s} grossit et devient difficile à maintenir. Comment organisez-vous vos dossiers et votre code ?",
      r: "Sépare par fonctionnalité plutôt que par type de fichier, garde des fonctions courtes, et ajoute des tests dès que la logique devient importante. Un README clair aide aussi toute l’équipe.",
    },
    {
      t: "{s} ou une autre solution pour mon premier projet ?",
      c: "Je dois choisir une technologie pour un projet de fin d’études. {s} est-il un bon choix pour un débutant ?",
      r: "Oui, si tu trouves facilement de l’aide autour de toi : une grande communauté compte plus que la technologie elle-même. Choisis ce que tes camarades ou mentors connaissent déjà.",
    },
    {
      t: "Comment déployer une application {s} gratuitement ?",
      c: "J’ai terminé mon application {s} en local. Quelles options gratuites pour la mettre en ligne ?",
      r: "Beaucoup d’hébergeurs proposent une offre gratuite suffisante pour une démo. Pense à mettre les secrets dans des variables d’environnement et jamais dans le dépôt Git.",
    },
    {
      t: "Améliorer les performances d’une application {s}",
      c: "Mon application {s} est lente avec beaucoup de données. Comment trouver ce qui ralentit ?",
      r: "Mesure avant d’optimiser : repère la requête ou la fonction la plus lente avec un profiler, puis ajoute un index ou un cache seulement là où c’est utile.",
    },
  ],
  en: [
    {
      t: "How do I get started with {s}?",
      c: "I am starting with {s} and do not know where to begin. Which resources and learning order would you recommend?",
      r: "Start with a small concrete project rather than theory. The official {s} documentation is great, and rebuilding a mini project (a to-do list, say) teaches the essentials in a week.",
    },
    {
      t: "Confusing {s} error: where should I look first?",
      c: "I get an error with {s} that I do not understand. How do I diagnose it properly before asking?",
      r: "Read the whole message, find the first line of the trace that points to your code, then shrink the problem to the smallest example that reproduces it. The cause often shows up at that point.",
    },
    {
      t: "Best practices to structure a {s} project?",
      c: "My {s} project keeps growing and is getting hard to maintain. How do you organise folders and code?",
      r: "Group by feature rather than by file type, keep functions short, and add tests as soon as the logic matters. A clear README helps the whole team too.",
    },
    {
      t: "How can I deploy a {s} app for free?",
      c: "My {s} app works locally. What free options exist to put it online?",
      r: "Many hosts have a free tier that is enough for a demo. Keep secrets in environment variables and never in the Git repository.",
    },
  ],
};

const COMMENTAIRES = {
  fr: [
    "Merci, c’est très clair !",
    "Bonne question, je me la posais aussi.",
    "Tu peux partager un extrait de ton code ?",
    "Ça a marché pour moi, merci beaucoup.",
    "Pense aussi à lire les logs du serveur.",
  ],
  en: [
    "Thanks, that is very clear!",
    "Good question, I was wondering the same.",
    "Can you share a snippet of your code?",
    "It worked for me, thank you.",
    "Also check the server logs.",
  ],
};

// Projets : idée de départ, adaptée aux réalités locales (utile = critère de jugement).
const PROJETS = {
  fr: [
    [
      "AgriConnect",
      "Mettre en relation agriculteurs et acheteurs pour vendre sans intermédiaire, avec prix du marché en temps réel.",
      "agriculture",
    ],
    [
      "SantéProche",
      "Trouver la pharmacie de garde ou le centre de santé le plus proche, même avec une connexion faible.",
      "sante",
    ],
    [
      "ÉcoleEnLigne",
      "Cours et exercices téléchargeables pour étudier hors connexion, pensés pour les élèves du secondaire.",
      "education",
    ],
    [
      "TontinePlus",
      "Gérer une tontine entre amis ou en famille : cotisations, tours et rappels par SMS.",
      "finance",
    ],
    [
      "TransportDakar",
      "Itinéraires et horaires des minibus et taxis collectifs, alimentés par la communauté.",
      "transport",
    ],
    [
      "MarchéLocal",
      "Une vitrine en ligne pour les commerçants du quartier, avec paiement mobile.",
      "commerce",
    ],
    [
      "LangueMaternelle",
      "Dictionnaire collaboratif en soussou, wolof, bambara et pulaar avec prononciation audio.",
      "culture",
    ],
    [
      "EauPotable",
      "Cartographier les points d’eau et signaler les pannes pour une réparation plus rapide.",
      "environnement",
    ],
    [
      "EmploiJeunes",
      "Offres de stages et de petits boulots pour jeunes diplômés, avec CV simplifié.",
      "emploi",
    ],
    [
      "MétéoChamp",
      "Alertes météo par SMS pour aider les agriculteurs à planifier semis et récoltes.",
      "agriculture",
    ],
  ],
  en: [
    [
      "CodeBuddy",
      "Pair beginners with peers to build small apps together every week.",
      "education",
    ],
    [
      "FarmPrice",
      "Daily crop prices from local markets, shared by the community.",
      "agriculture",
    ],
    [
      "SafeRoute",
      "Crowd-sourced road conditions and safe routes for night travel.",
      "transport",
    ],
    [
      "OfflineLib",
      "A library of tutorials that works fully offline once synced.",
      "education",
    ],
  ],
};

const ROLES_PROJET = [
  "frontend",
  "backend",
  "design",
  "mobile",
  "devops",
  "data",
];
const TACHES = {
  fr: [
    "Maquette de l’écran d’accueil",
    "Mettre en place l’authentification",
    "Écrire la documentation",
    "Créer l’API des produits",
    "Tester sur téléphone",
    "Préparer la démo",
    "Configurer la base de données",
    "Corriger les bugs signalés",
  ],
  en: [
    "Home screen mockup",
    "Set up authentication",
    "Write the documentation",
    "Build the products API",
    "Test on a phone",
    "Prepare the demo",
    "Set up the database",
    "Fix reported bugs",
  ],
};

const MESSAGES = {
  fr: [
    "Salut tout le monde 👋",
    "Quelqu’un a déjà utilisé cette bibliothèque ?",
    "Merci pour l’aide, ça marche maintenant !",
    "On fait un point demain soir ?",
    "Super ressource, je partage le lien plus tard.",
  ],
  en: [
    "Hi everyone 👋",
    "Has anyone used this library before?",
    "Thanks for the help, it works now!",
    "Shall we sync tomorrow evening?",
    "Great resource, I will share the link later.",
  ],
};

const MESSAGES_CANDIDATURE = [
  "Je connais bien cette technologie et je suis disponible le soir.",
  "Ce projet répond à un vrai besoin chez nous, je veux aider.",
  "Je débute mais je suis très motivé et je m’engage à finir ce que je commence.",
];
const SUJETS_MENTORAT = [
  "Apprendre à créer une API",
  "Préparer mon premier entretien",
  "Structurer mon projet de fin d’études",
  "Progresser en {s}",
];
const MESSAGES_MENTORAT = [
  "Je débute et j’aimerais être guidé pas à pas, je peux consacrer une heure par jour.",
  "Je bloque sur mon projet depuis une semaine et j’ai besoin d’un regard expérimenté.",
];

module.exports = {
  PAYS,
  POIDS_PAYS,
  PRENOMS,
  NOMS,
  STACKS,
  NIVEAUX,
  BIOS,
  QUESTIONS,
  COMMENTAIRES,
  PROJETS,
  ROLES_PROJET,
  TACHES,
  MESSAGES,
  MESSAGES_CANDIDATURE,
  SUJETS_MENTORAT,
  MESSAGES_MENTORAT,
};
