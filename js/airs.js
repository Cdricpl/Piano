/* Airs traditionnels (domaine public), écrits avec le format de notes.js.
 * Partagés par les leçons et par les morceaux. Do central = C4. */

export const ODE_D = [
  'E4:1@3 E4@3 F4@4 G4@5 | G4@5 F4@4 E4@3 D4@2 | C4@1 C4@1 D4@2 E4@3 | E4:1.5@3 D4:0.5@2 D4:2@2',
  'E4:1@3 E4@3 F4@4 G4@5 | G4@5 F4@4 E4@3 D4@2 | C4@1 C4@1 D4@2 E4@3 | D4:1.5@2 C4:0.5@1 C4:2@1'
].join(' | ');
export const ODE_G = 'C3:4 | C3:2 G3:2 | C3:2 C3:2 | G3:4 | C3:4 | C3:2 G3:2 | C3:2 G3:2 | C3:4';

export const CLAIR_D = 'C4:1@1 C4@1 C4@1 D4@2 | E4:2@3 D4:2@2 | C4:1@1 E4@3 D4@2 D4@2 | C4:4@1';

export const FRERE_D = [
  'C4:1@1 D4@2 E4@3 C4@1 | C4@1 D4@2 E4@3 C4@1 | E4:1@3 F4@4 G4:2@5 | E4:1@3 F4@4 G4:2@5',
  'G4:0.5 A4 G4 F4 E4:1 C4:1 | G4:0.5 A4 G4 F4 E4:1 C4:1 | C4:1 G3:1 C4:2 | C4:1 G3:1 C4:2'
].join(' | ');

export const JINGLE_D = [
  'E4:1@3 E4@3 E4:2@3 | E4:1 E4 E4:2 | E4:1 G4@5 C4:1.5@1 D4:0.5@2 | E4:4@3',
  'F4:1 F4 F4:1.5 F4:0.5 | F4:1 E4 E4 E4:0.5 E4:0.5 | E4:1 D4 D4 E4 | D4:2 G4:2',
  'E4:1 E4 E4:2 | E4:1 E4 E4:2 | E4:1 G4 C4:1.5 D4:0.5 | E4:4',
  'F4:1 F4 F4:1.5 F4:0.5 | F4:1 E4 E4 E4:0.5 E4:0.5 | G4:1 G4 F4 D4 | C4:4'
].join(' | ');

/* Joyeux anniversaire, en 3/4 : les deux croches de départ tombent sur le 3e temps */
export const ANNIV_D = [
  'r:2 G4:0.75 G4:0.25 | A4:1 G4:1 C5:1 | B4:2 G4:0.75 G4:0.25 | A4:1 G4:1 D5:1',
  'C5:2 G4:0.75 G4:0.25 | G5:1 E5:1 C5:1 | B4:1 A4:1 F5:0.75 F5:0.25 | E5:1 C5:1 D5:1 | C5:3'
].join(' | ');

/* Douce nuit, en 3/4 */
export const DOUCE_D = [
  'G4:1.5 A4:0.5 G4:1 | E4:3 | G4:1.5 A4:0.5 G4:1 | E4:3',
  'D5:2 D5:1 | B4:3 | C5:2 C5:1 | G4:3',
  'A4:2 A4:1 | C5:1.5 B4:0.5 A4:1 | G4:1.5 A4:0.5 G4:1 | E4:3',
  'A4:2 A4:1 | C5:1.5 B4:0.5 A4:1 | G4:1.5 A4:0.5 G4:1 | E4:3',
  'D5:2 D5:1 | F5:1.5 D5:0.5 B4:1 | C5:3 | E5:3 | C5:1 G4:1 E4:1 | G4:1.5 F4:0.5 D4:1 | C4:3'
].join(' | ');
export const DOUCE_G = ['C3','C3','C3','C3','G2','G2','C3','C3','F2','G2','C3','C3','F2','G2','C3','C3','G2','G2','C3','C3','C3','G2','C3'].map(n => n + ':3').join(' | ');

/* Canon de Pachelbel : la basse et les accords (en ré majeur) */
export const CANON_G = 'D3:2 A2:2 | B2:2 F#2:2 | G2:2 D3:2 | G2:2 A2:2';
export const CANON_D = [
  'F#4+A4+D5:2 E4+A4+C#5:2',      // D, A
  'D4+F#4+B4:2 C#4+F#4+A4:2',     // Bm, F#m
  'D4+G4+B4:2 D4+F#4+A4:2',       // G, D
  'D4+G4+B4:2 E4+A4+C#5:2'        // G, A
].join(' | ');

/* Hanon n°1 (début) : huit groupes de huit doubles-croches */
const HANON = (gauche) => {
  const degres = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const ordre = 'CDEFGAB';
  const note = (deg, octave) => {
    const i = deg % 7, o = octave + Math.floor(deg / 7);
    return ordre[i] + o;
  };
  const doigtsD = [1, 2, 3, 4, 5, 4, 3, 2], doigtsG = [5, 4, 3, 2, 1, 2, 3, 4];
  const groupes = [];
  for (let k = 0; k < 8; k++){
    const motif = [0, 2, 3, 4, 5, 4, 3, 2].map(d => k + d);
    const base = gauche ? 3 : 4;
    groupes.push(motif.map((d, j) => `${note(d, base)}${j === 0 && k === 0 ? ':0.25' : ''}@${(gauche ? doigtsG : doigtsD)[j]}`).join(' '));
  }
  return [groupes.slice(0, 2), groupes.slice(2, 4), groupes.slice(4, 6), groupes.slice(6, 8)].map(g => g.join(' ')).join(' | ');
};
export const HANON_D = HANON(false);
export const HANON_G = HANON(true);
