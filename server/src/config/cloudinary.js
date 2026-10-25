const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true
});

// Sans les trois variables CLOUDINARY_*, l'envoi d'images est désactivé (le reste de l'API fonctionne).
cloudinary.configured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

module.exports = cloudinary;
