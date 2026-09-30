/* Clavier à l'écran : montre les touches à jouer (couleur de la main, numéro du doigt), les
 * réussites et les erreurs, ce que le micro entend — et se joue au doigt, avec le son du piano.
 * Fait de blocs HTML positionnés en pourcentage : il s'étire sur toute la largeur sans
 * déformer les textes. */
import { estNoire, nomCourt } from './notes.js';

const NOMS_BLANCHES = { 0:'Do', 2:'Ré', 4:'Mi', 5:'Fa', 7:'Sol', 9:'La', 11:'Si' };

export function plageClavier([min, max]){
  let lo = Math.floor(min / 12) * 12;                          // un Do
  let hi = Math.ceil((max + 1) / 12) * 12;                     // le Do suivant
  if (hi - lo < 24) hi = lo + 24;                               // au moins deux octaves
  if (hi - lo < 36 && max - min > 17) hi = lo + 36;
  if (lo < 36) lo = 36;
  if (hi > 96) hi = 96;
  return [lo, hi];
}

export function creerClavier([lo, hi], { surNote = null, noms = true } = {}){
  const racine = document.createElement('div');
  racine.className = 'clavier';
  const blanches = [];
  for (let m = lo; m <= hi; m++) if (!estNoire(m)) blanches.push(m);
  racine.style.setProperty('--n', blanches.length);
  const touches = new Map();
  const indexBlanche = new Map(blanches.map((m, i) => [m, i]));

  blanches.forEach((m, i) => {
    const t = document.createElement('div');
    t.className = 'touche blanche';
    t.style.setProperty('--i', i);
    t.dataset.midi = m;
    const nom = NOMS_BLANCHES[m % 12];
    if (m % 12 === 0) t.classList.add('do');
    if (noms) t.innerHTML = `<span class="doigt"></span><span class="nom">${nom}${m % 12 === 0 ? `<i class="oct">${Math.floor(m / 12) - 1}</i>` : ''}</span>`;
    else t.innerHTML = '<span class="doigt"></span>';
    racine.appendChild(t);
    touches.set(m, t);
  });
  for (let m = lo; m <= hi; m++){
    if (!estNoire(m)) continue;
    const t = document.createElement('div');
    t.className = 'touche noire';
    t.style.setProperty('--i', indexBlanche.get(m - 1) + 1);     // posée sur la frontière après la blanche de gauche
    t.dataset.midi = m;
    t.innerHTML = '<span class="doigt"></span>';
    racine.appendChild(t);
    touches.set(m, t);
  }

  let cibles = [];
  function cibler(liste){
    for (const m of cibles){
      const t = touches.get(m.midi);
      if (!t) continue;
      t.classList.remove('cible', 'main-D', 'main-G', 'faite');
      t.querySelector('.doigt').textContent = '';
    }
    cibles = liste || [];
    for (const n of cibles){
      const t = touches.get(n.midi);
      if (!t) continue;
      t.classList.add('cible', 'main-' + n.main);
      t.querySelector('.doigt').textContent = n.doigt || '';
    }
  }
  function etat(midi, e){
    const t = touches.get(midi);
    if (!t) return;
    t.classList.remove('ok', 'faux');
    void t.offsetWidth;
    if (e) t.classList.add(e);
  }
  function effacerEtats(){ for (const t of touches.values()) t.classList.remove('ok', 'faux', 'faite'); }
  function entendues(ensemble){
    for (const [m, t] of touches) t.classList.toggle('entendue', ensemble.has(m));
  }
  function presser(midi, on){
    const t = touches.get(midi);
    if (t) t.classList.toggle('presse', on);
  }

  // jeu au doigt / à la souris (plusieurs doigts à la fois)
  const enCours = new Map();
  racine.addEventListener('pointerdown', e => {
    const t = e.target.closest('.touche');
    if (!t) return;
    e.preventDefault();
    const midi = +t.dataset.midi;
    enCours.set(e.pointerId, midi);
    try { racine.setPointerCapture(e.pointerId); } catch { /* pas grave */ }
    presser(midi, true);
    if (surNote) surNote(midi);
  });
  const relacher = e => {
    const midi = enCours.get(e.pointerId);
    if (midi == null) return;
    enCours.delete(e.pointerId);
    presser(midi, false);
  };
  racine.addEventListener('pointerup', relacher);
  racine.addEventListener('pointercancel', relacher);

  // touches étroites : on retire d'abord le numéro d'octave, puis les noms (sauf les Do)
  const adapter = () => {
    const l = racine.clientWidth / blanches.length;
    if (!racine.clientWidth) return;
    racine.classList.toggle('etroit', l < 26);
    racine.classList.toggle('tres-etroit', l < 17);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(adapter).observe(racine);
  return { racine, cibler, etat, effacerEtats, entendues, presser, plage:[lo, hi], touches };
}
