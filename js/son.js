/* Piano de synthèse (Web Audio) : un timbre riche en harmoniques, une attaque sèche, un son
 * qui décroît en deux temps (plus vite dans les aigus), une étouffoir à la fin de la note.
 * Sert à faire écouter le morceau, au métronome, et quand on joue sur les touches de l'écran. */

let ctx = null, sortie = null, ondes = [];

export function initAudio(){
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint:'interactive' });
  sortie = ctx.createGain();
  sortie.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
  sortie.connect(comp).connect(ctx.destination);
  // trois timbres : graves (riches), médiums, aigus (presque purs)
  const profils = [
    [0, 1, 0.75, 0.9, 0.55, 0.5, 0.3, 0.28, 0.15, 0.12, 0.08, 0.05],
    [0, 1, 0.55, 0.38, 0.22, 0.14, 0.09, 0.06, 0.04, 0.02],
    [0, 1, 0.22, 0.1, 0.05, 0.02]
  ];
  ondes = profils.map(p => ctx.createPeriodicWave(new Float32Array(p.length), Float32Array.from(p)));
  return ctx;
}
export async function reprendreAudio(){
  initAudio();
  if (ctx.state !== 'running') { try { await ctx.resume(); } catch { /* refusé */ } }
  return ctx;
}
export const contexte = () => ctx;
export function volume(v){ if (sortie) sortie.gain.value = v; }

let bruit = null;
function tampBruit(){
  if (bruit) return bruit;
  bruit = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
  const d = bruit.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return bruit;
}

/* jouer une note : midi, durée en secondes, force 0..1, instant (horloge audio) */
export function jouerNote(midi, { duree = 1.2, force = 0.8, quand = 0 } = {}){
  const c = initAudio();
  const t0 = Math.max(c.currentTime, quand || c.currentTime);
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = c.createOscillator();
  osc.setPeriodicWave(ondes[midi < 55 ? 0 : midi < 79 ? 1 : 2]);
  osc.frequency.value = f;
  const filtre = c.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.Q.value = 0.4;
  const brillance = 1800 + force * 5200 + (midi - 60) * 25;
  filtre.frequency.setValueAtTime(brillance, t0);
  filtre.frequency.exponentialRampToValueAtTime(Math.max(600, brillance * 0.22), t0 + 1.2);
  const g = c.createGain();
  const crete = 0.42 * force * Math.pow(2, -(midi - 60) / 48);
  const tau = Math.max(0.45, 3.2 - (midi - 36) * 0.045);            // les aigus s'éteignent vite
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(crete, t0 + 0.004);
  g.gain.setTargetAtTime(crete * 0.38, t0 + 0.004, 0.22);            // chute rapide après la frappe…
  g.gain.setTargetAtTime(0.0001, t0 + 0.3, tau);                     // …puis longue résonance
  const fin = t0 + Math.max(0.15, duree);
  g.gain.setTargetAtTime(0.0001, fin, 0.09);                         // étouffoir
  osc.connect(filtre).connect(g).connect(sortie);
  osc.start(t0);
  osc.stop(fin + 0.6);
  // bruit du marteau
  const b = c.createBufferSource(); b.buffer = tampBruit();
  const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = Math.min(4000, f * 3); bf.Q.value = 0.8;
  const bg = c.createGain(); bg.gain.value = 0.05 * force;
  b.connect(bf).connect(bg).connect(sortie);
  b.start(t0);
}

/* métronome : un petit « toc » de bois (bruit filtré), pour ne pas être pris pour une note */
export function clic(accent = false, quand = 0){
  const c = initAudio();
  const t0 = Math.max(c.currentTime, quand || c.currentTime);
  const b = c.createBufferSource(); b.buffer = tampBruit();
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = accent ? 1500 : 1000; f.Q.value = 2.5;
  const g = c.createGain();
  g.gain.setValueAtTime(accent ? 1.6 : 1.0, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
  b.connect(f).connect(g).connect(sortie);
  b.start(t0);
}
