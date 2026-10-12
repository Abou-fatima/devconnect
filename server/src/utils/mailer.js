const env = require('../config/env');

let transporter = null;
const getTransporter = () => {
  if (transporter || !env.smtp.host) return transporter;
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
  });
  return transporter;
};

// Envoie un code OTP. Retourne true si un vrai envoi a eu lieu.
// Email : SMTP si configuré. Téléphone : brancher ici le fournisseur SMS choisi par l'équipe.
// Sans configuration (dev), le code est affiché dans la console du serveur.
async function sendOtp({ canal, destinataire, code }) {
  if (canal === 'email' && getTransporter()) {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to: destinataire,
      subject: 'Votre code DevConnect',
      text: `Votre code de vérification DevConnect : ${code}\nIl expire dans ${Math.round(env.otpTtl / 60)} minutes.`
    });
    return true;
  }
  if (!env.isProd) {
    console.log(`[OTP ${canal}] ${destinataire} -> ${code}`);
  } else {
    console.warn(`[OTP] aucun fournisseur ${canal} configuré : code non envoyé à ${destinataire}`);
  }
  return false;
}

module.exports = { sendOtp };
