import { useCallback, useEffect, useRef, useState } from 'react';

export const DUREE_MAX = 120; // secondes : au-delà, le fichier dépasserait la limite d'envoi
const FORMATS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export const vocalPossible = () => typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined';

/* Enregistrement d'une note vocale avec le micro.
   etat : 'repos' | 'enregistre' | 'pret' (enregistrement terminé, à écouter avant l'envoi) | 'erreur'
   erreur : 'refuse' (micro interdit) | 'absent' (pas de micro) | 'autre' */
export default function useEnregistreurVocal({ onDebut, onFin } = {}) {
  const [etat, setEtat] = useState('repos');
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState(null); // { blob, url }
  const rec = useRef({ media: null, flux: null, morceaux: [], minuteur: null, annule: false });

  const nettoyer = useCallback(() => {
    const r = rec.current;
    clearInterval(r.minuteur);
    r.flux?.getTracks().forEach((p) => p.stop()); // éteint le voyant du micro
    r.flux = null; r.media = null; r.minuteur = null;
  }, []);

  const liberer = useCallback((res) => { if (res?.url) URL.revokeObjectURL(res.url); }, []);

  const arreter = useCallback(() => {
    const m = rec.current.media;
    if (m && m.state !== 'inactive') m.stop();
  }, []);

  const demarrer = useCallback(async () => {
    if (!vocalPossible()) { setErreur('absent'); setEtat('erreur'); return; }
    setErreur(''); setResultat((r) => { liberer(r); return null; });
    let flux;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { setErreur(e?.name === 'NotFoundError' ? 'absent' : e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'refuse' : 'autre'); setEtat('erreur'); return; }
    const format = FORMATS.find((f) => window.MediaRecorder.isTypeSupported?.(f));
    let media;
    try { media = new window.MediaRecorder(flux, format ? { mimeType: format } : undefined); }
    catch { flux.getTracks().forEach((p) => p.stop()); setErreur('autre'); setEtat('erreur'); return; }
    const r = rec.current;
    r.media = media; r.flux = flux; r.morceaux = []; r.annule = false;
    media.ondataavailable = (e) => { if (e.data?.size) r.morceaux.push(e.data); };
    media.onstop = () => {
      const annule = r.annule; const type = media.mimeType || format || 'audio/webm';
      const blob = new Blob(r.morceaux, { type: type.split(';')[0] });
      nettoyer(); onFin?.();
      if (annule || blob.size < 1000) { setEtat('repos'); return; } // trop court : ignoré
      setResultat({ blob, url: URL.createObjectURL(blob) }); setEtat('pret');
    };
    media.start(250);
    setSecondes(0); setEtat('enregistre'); onDebut?.();
    r.minuteur = setInterval(() => setSecondes((s) => { if (s + 1 >= DUREE_MAX) arreter(); return s + 1; }), 1000);
  }, [arreter, liberer, nettoyer, onDebut, onFin]);

  const annuler = useCallback(() => {
    rec.current.annule = true;
    if (rec.current.media && rec.current.media.state !== 'inactive') rec.current.media.stop();
    else { nettoyer(); onFin?.(); }
    setResultat((r) => { liberer(r); return null; }); setEtat('repos'); setSecondes(0);
  }, [liberer, nettoyer, onFin]);

  const terminer = useCallback(() => { setResultat((r) => { liberer(r); return null; }); setEtat('repos'); setSecondes(0); }, [liberer]);

  useEffect(() => () => { rec.current.annule = true; try { rec.current.media?.state !== 'inactive' && rec.current.media?.stop(); } catch { /* déjà arrêté */ } nettoyer(); }, [nettoyer]);

  return { etat, secondes, erreur, resultat, demarrer, arreter, annuler, terminer };
}
