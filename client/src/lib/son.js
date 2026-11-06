// Bip de notification : un seul son bref, généré par le navigateur (aucun fichier audio, aucune licence).
// Le navigateur n'autorise le son qu'après un premier clic ou toucher sur la page : on se contente alors de ne rien jouer.
const CLE = 'son_notifications';
let ctx = null;

export function sonActif() {
  try { return localStorage.getItem(CLE) !== 'off'; } catch { return true; }
}

export function definirSon(actif) {
  try { localStorage.setItem(CLE, actif ? 'on' : 'off'); } catch { /* ignore */ }
  if (actif) bip(); // petit aperçu quand on réactive
}

export function bip() {
  if (!sonActif()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx.state !== 'running' && ctx.state !== 'suspended') return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  } catch { /* le son est un confort : jamais bloquant */ }
}
