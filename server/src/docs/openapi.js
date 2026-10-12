// Documentation OpenAPI 3 de la partie Dev 1. Les autres développeurs ajoutent leurs routes dans `paths`.
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema) => ({ 'application/json': { schema } });
const err = (description) => ({ description, content: json(ref('Erreur')) });
const secured = [{ bearerAuth: [] }];

const authOk = (description) => ({ description, content: json(ref('AuthReponse')) });

module.exports = {
  openapi: '3.0.3',
  info: { title: 'DevConnect API', version: '0.2.0', description: 'API de la plateforme DevConnect (CADEV 2026).' },
  servers: [{ url: '/' }],
  tags: [{ name: 'Auth' }, { name: 'Utilisateurs' }, { name: 'Meta' }],
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'Inscription email + mot de passe',
      requestBody: { required: true, content: json({ type: 'object', required: ['pseudo', 'email', 'mot_de_passe'], properties: {
        pseudo: { type: 'string', example: 'alpha_bah' }, email: { type: 'string', example: 'alpha@mail.com' },
        mot_de_passe: { type: 'string', example: 'Azerty123' }, telephone: { type: 'string', example: '+224620000000' },
        pays: { type: 'string', example: 'GN' }, ville: { type: 'string', example: 'Conakry' } } }) },
      responses: { 201: authOk('Compte créé'), 400: err('Données invalides'), 409: err('Email, téléphone ou pseudo déjà utilisé') } } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Connexion (email ou téléphone + mot de passe)',
      requestBody: { required: true, content: json({ type: 'object', required: ['identifiant', 'mot_de_passe'], properties: {
        identifiant: { type: 'string', example: 'alpha@mail.com' }, mot_de_passe: { type: 'string' } } }) },
      responses: { 200: authOk('Connecté'), 401: err('Identifiants incorrects') } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Mon compte', security: secured,
      responses: { 200: { description: 'Utilisateur courant', content: json({ type: 'object', properties: { utilisateur: ref('UtilisateurPrive') } }) }, 401: err('Non connecté') } } },
    '/api/auth/otp/send': { post: { tags: ['Auth'], summary: 'Envoyer un code OTP (email ou téléphone)',
      description: 'En développement sans SMTP/SMS, le code est renvoyé dans `code_dev` et affiché dans la console du serveur.',
      requestBody: { required: true, content: json({ type: 'object', properties: { email: { type: 'string' }, telephone: { type: 'string', example: '+224620000000' } } }) },
      responses: { 200: { description: 'Code envoyé' }, 400: err('Données invalides'), 429: err('Trop de demandes') } } },
    '/api/auth/otp/verify': { post: { tags: ['Auth'], summary: 'Vérifier le code OTP : connecte ou crée le compte',
      requestBody: { required: true, content: json({ type: 'object', required: ['code'], properties: {
        email: { type: 'string' }, telephone: { type: 'string' }, code: { type: 'string', example: '123456' },
        pseudo: { type: 'string', description: 'Obligatoire pour un nouveau compte' } } }) },
      responses: { 200: authOk('Connecté'), 201: authOk('Compte créé'), 400: err('Code incorrect ou expiré'), 422: err('Pseudo requis pour un nouveau compte') } } },
    '/api/auth/github': { get: { tags: ['Auth'], summary: 'Démarre la connexion GitHub (redirection)',
      description: 'À ouvrir dans le navigateur. Après succès, redirige vers `FRONTEND_URL/auth/callback#token=...`.',
      responses: { 302: { description: 'Redirection vers GitHub' }, 503: err('OAuth non configuré') } } },
    '/api/users': { get: { tags: ['Utilisateurs'], summary: 'Rechercher des développeurs (F-06)',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Recherche sur le pseudo' },
        { name: 'stack', in: 'query', schema: { type: 'string', example: 'react,node' }, description: 'Une ou plusieurs stacks (au moins une en commun)' },
        { name: 'pays', in: 'query', schema: { type: 'string', example: 'GN' } },
        { name: 'niveau', in: 'query', schema: { type: 'string', enum: ['debutant', 'intermediaire', 'avance', 'expert'] } },
        { name: 'objectif', in: 'query', schema: { type: 'string' } },
        { name: 'tri', in: 'query', schema: { type: 'string', enum: ['reputation', 'recent', 'pseudo'], default: 'reputation' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } }],
      responses: { 200: { description: 'Résultats paginés', content: json({ type: 'object', properties: {
        data: { type: 'array', items: ref('UtilisateurPublic') }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } } }) } } } },
    '/api/users/me': { put: { tags: ['Utilisateurs'], summary: 'Modifier mon profil (F-02 à F-05)', security: secured,
      description: 'Seuls les champs envoyés sont modifiés. Une chaîne vide efface un champ texte.',
      requestBody: { required: true, content: json(ref('ProfilUpdate')) },
      responses: { 200: { description: 'Profil mis à jour', content: json({ type: 'object', properties: { utilisateur: ref('UtilisateurPrive') } }) }, 400: err('Données invalides'), 401: err('Non connecté'), 409: err('Pseudo déjà pris') } } },
    '/api/users/me/password': { put: { tags: ['Utilisateurs'], summary: 'Changer ou définir mon mot de passe', security: secured,
      requestBody: { required: true, content: json({ type: 'object', required: ['nouveau_mot_de_passe'], properties: {
        ancien_mot_de_passe: { type: 'string', description: 'Requis si un mot de passe existe déjà' }, nouveau_mot_de_passe: { type: 'string' } } }) },
      responses: { 200: { description: 'OK' }, 401: err('Ancien mot de passe incorrect') } } },
    '/api/users/{id}': { get: { tags: ['Utilisateurs'], summary: 'Profil public (F-07)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Profil', content: json({ type: 'object', properties: { utilisateur: ref('UtilisateurPublic') } }) }, 404: err('Introuvable') } } },
    '/api/meta/options': { get: { tags: ['Meta'], summary: 'Listes pour formulaires : niveaux, objectifs, stacks suggérées', responses: { 200: { description: 'OK' } } } }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erreur: { type: 'object', properties: { erreur: { type: 'string' }, details: {} } },
      UtilisateurPublic: { type: 'object', properties: {
        id: { type: 'string' }, pseudo: { type: 'string' }, role: { type: 'string' }, pays: { type: 'string' }, ville: { type: 'string' },
        stacks: { type: 'array', items: { type: 'string' } }, objectifs: { type: 'array', items: { type: 'string' } },
        badges: { type: 'array', items: { type: 'string' } }, reputation: { type: 'number' },
        profil: { type: 'object', properties: { bio: { type: 'string' }, photo: { type: 'string' }, niveau: { type: 'string' },
          liens: { type: 'object', properties: { github: { type: 'string' }, linkedin: { type: 'string' }, site: { type: 'string' }, whatsapp: { type: 'string' } } } } },
        created_at: { type: 'string', format: 'date-time' } } },
      UtilisateurPrive: { allOf: [ref('UtilisateurPublic'), { type: 'object', properties: {
        email: { type: 'string' }, telephone: { type: 'string' }, github_id: { type: 'string' }, a_un_mot_de_passe: { type: 'boolean' } } }] },
      AuthReponse: { type: 'object', properties: { token: { type: 'string' }, utilisateur: ref('UtilisateurPrive') } },
      ProfilUpdate: { type: 'object', properties: {
        pseudo: { type: 'string' }, pays: { type: 'string', example: 'GN' }, ville: { type: 'string' },
        stacks: { type: 'array', items: { type: 'string' }, example: ['react', 'node'] },
        objectifs: { type: 'array', items: { type: 'string' }, example: ['collaborer', 'mentorat'] },
        profil: { type: 'object', properties: { bio: { type: 'string' }, photo: { type: 'string' }, niveau: { type: 'string', enum: ['debutant', 'intermediaire', 'avance', 'expert'] },
          liens: { type: 'object', properties: { github: { type: 'string' }, linkedin: { type: 'string' }, site: { type: 'string' }, whatsapp: { type: 'string' } } } } } } }
    }
  }
};
