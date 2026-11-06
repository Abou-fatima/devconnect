import api from './api';

// Envoie une image à joindre à un message ; le serveur renvoie son adresse (image_url).
export const envoyerImageChat = (blob) => {
  const form = new FormData();
  form.append('file', blob, blob.name || 'image.jpg');
  return api.post('/upload/chat', form, { timeout: 60000, headers: { 'Content-Type': undefined } }).then((r) => r.data.image_url);
};
