/* Petites illustrations des cartes (SVG en ligne, aucun fichier à charger).
 * Les couleurs viennent du CSS (--ill-1, --ill-2…) : blanches sur les cartes en
 * dégradé, colorées sur les cartes blanches. Le même dessin sert partout. */
import { estNoire } from './notes.js';

const C1 = 'var(--ill-1)', C2 = 'var(--ill-2)', C3 = 'var(--ill-3)', FOND = 'var(--ill-fond)', TRAIT = 'var(--ill-trait)', TXT = 'var(--ill-txt)';
const rempli = c => `style="fill:${c}"`;
const trace = (c, l = 2.4) => `style="fill:none;stroke:${c};stroke-width:${l}px;stroke-linecap:round;stroke-linejoin:round"`;
const svgIllus = (contenu, vb = '0 0 160 110') =>
  `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${contenu}</svg>`;

/* un clavier de 7 touches blanches, dont certaines en couleur */
function clavier(x, y, w, h, allumees = [], c = C1){
  const lw = w / 7;
  let s = '';
  for (let i = 0; i < 7; i++)
    s += `<rect x="${(x + i * lw + 1).toFixed(1)}" y="${y}" width="${(lw - 2).toFixed(1)}" height="${h}" rx="4"
      style="fill:${allumees.includes(i) ? c : FOND};stroke:${c};stroke-width:2px"/>`;
  for (const i of [0, 1, 3, 4, 5])
    s += `<rect x="${(x + (i + 1) * lw - lw * 0.3).toFixed(1)}" y="${y}" width="${(lw * 0.6).toFixed(1)}" height="${(h * 0.6).toFixed(1)}" rx="3" ${rempli(c)}/>`;
  return s;
}
const croche = (x, y, c = C1) =>
  `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" transform="rotate(-20 ${x} ${y})" ${rempli(c)}/><path d="M${x + 7} ${y - 2}V${y - 34}c4 8 14 10 14 24" ${trace(c, 2.6)}/>`;

export const CATEGORIES = {
  parcours: svgIllus(`
    ${clavier(14, 54, 132, 50, [0, 2, 4, 6])}
    <path d="M22 38q14-22 30-6t30-8 30-10" ${trace(C2, 3)}/>
    ${croche(116, 26, C1)}
    <path d="M140 4l3 7 7.5 1-5.6 5 1.7 7.4-6.6-3.9-6.6 3.9 1.7-7.4-5.6-5 7.5-1z" ${rempli(C1)}/>`),

  morceaux: svgIllus(`
    <circle cx="68" cy="56" r="47" ${rempli(FOND)}/>
    <circle cx="68" cy="56" r="47" ${trace(C1, 2.6)}/>
    ${[38, 30, 22].map(r => `<circle cx="68" cy="56" r="${r}" ${trace(C3, 1.3)}/>`).join('')}
    <circle cx="68" cy="56" r="13" ${rempli(C1)}/><circle cx="68" cy="56" r="3" ${rempli(TXT)}/>
    ${croche(124, 70, C1)}`),

  exercices: svgIllus(`
    ${[0, 1, 2, 3, 4].map(i => `<line x1="10" x2="150" y1="${30 + i * 12}" y2="${30 + i * 12}" ${trace(TRAIT, 1.6)}/>`).join('')}
    ${[[26, 78], [48, 72], [70, 66], [92, 60], [114, 54], [136, 48]].map(([x, y], i) =>
      `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="5.6" transform="rotate(-20 ${x} ${y})" style="fill:${i % 2 ? C2 : C1}"/>`).join('')}
    <path d="M22 96h116" ${trace(C3, 2)}/>`),

  libre: svgIllus(`
    <rect x="64" y="14" width="32" height="54" rx="16" ${rempli(FOND)}/>
    <rect x="64" y="14" width="32" height="54" rx="16" ${trace(C1, 3)}/>
    <path d="M50 54a30 30 0 0 0 60 0M80 84v16M62 100h36" ${trace(C1, 3)}/>
    <path d="M28 40q-8 14 0 28M16 32q-14 22 0 44M132 40q8 14 0 28M144 32q14 22 0 44" ${trace(C2, 2.6)}/>`),

  progression: svgIllus(`
    ${[[22, 40], [50, 62], [78, 30], [106, 74], [134, 52]].map(([x, h], i) =>
      `<rect x="${x - 11}" y="${104 - h}" width="22" height="${h}" rx="6" style="fill:${i === 2 ? C1 : FOND};stroke:${C1};stroke-width:2px"/>`).join('')}
    <path d="M10 104h140" ${trace(C3, 2)}/>
    <path d="M20 40l30 12 28-28 30 26 30-16" ${trace(C2, 3)}/>`)
};

/* clavier qui se remplit peu à peu : niveaux 1 à 5 */
export function clavierNiveau(n){
  const lw = 132 / 7;
  const allumees = [0, 2, 4, 1, 3, 5, 6].slice(0, Math.min(7, n + 2));
  return svgIllus(clavier(14, 26, 132, 62, allumees) + (n >= 3 ? croche(40, 18, C2) : '') + (n >= 5 ? croche(124, 18, C2) : ''));
}

/* miniature d'un morceau : les notes de chaque main, dans le temps et en hauteur */
export function miniPiece(c){
  const [mn, mx] = c.plage;
  const haut = Math.max(12, mx - mn);
  let s = '';
  const fin = Math.max(1, c.total);
  for (const n of c.notes){
    const x = 8 + (n.t / fin) * 144;
    const y = 54 - ((n.midi - mn) / haut) * 44;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2.5, (n.d / fin) * 144 - 1).toFixed(1)}" height="5" rx="2.5" style="fill:${n.main === 'D' ? C1 : C2}"/>`;
  }
  return svgIllus(s, '0 0 160 64');
}
/* miniature d'un exercice : touches à jouer, en couleur */
export function miniTouches(c){
  const mids = new Set(c.notes.map(n => n.midi));
  const lo = Math.floor(c.plage[0] / 12) * 12, hi = Math.ceil((c.plage[1] + 1) / 12) * 12;
  const blanches = [];
  for (let m = lo; m <= hi; m++) if (!estNoire(m)) blanches.push(m);
  const w = 148 / blanches.length;
  let s = blanches.map((m, i) =>
    `<rect x="${(6 + i * w).toFixed(1)}" y="8" width="${(w - 1).toFixed(1)}" height="50" rx="2" style="fill:${mids.has(m) ? C1 : FOND};stroke:${TRAIT};stroke-width:1px"/>`).join('');
  for (let m = lo; m <= hi; m++){
    if (!estNoire(m)) continue;
    const i = blanches.indexOf(m - 1) + 1;
    s += `<rect x="${(6 + i * w - w * 0.3).toFixed(1)}" y="8" width="${(w * 0.6).toFixed(1)}" height="30" rx="2" style="fill:${mids.has(m) ? C2 : C3}"/>`;
  }
  return svgIllus(s, '0 0 160 64');
}
/* vinyle des morceaux */
export function miniVinyle(){
  return svgIllus(`
    <circle cx="66" cy="32" r="29" ${rempli(C1)}/>
    ${[23, 18, 13].map(r => `<circle cx="66" cy="32" r="${r}" ${trace(TRAIT, 1)}/>`).join('')}
    <circle cx="66" cy="32" r="8" ${rempli(C2)}/><circle cx="66" cy="32" r="2" ${rempli(TXT)}/>
    <path d="M104 6v34" ${trace(C1, 3)}/><circle cx="100" cy="42" r="6" ${rempli(C1)}/>`, '0 0 160 64');
}
