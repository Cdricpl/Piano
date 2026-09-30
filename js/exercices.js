/* Exercices : gammes, accords, arpèges et technique. Même format que les leçons. */

export const FAMILLES_EX = [
  { id:'gammes',  nom:'Gammes',              desc:"Une octave, deux mains, le doigté de chaque gamme." },
  { id:'accords', nom:'Accords',             desc:"Majeurs, mineurs et suites d'accords qui servent partout." },
  { id:'technique', nom:'Arpèges & technique', desc:"Arpèges, rythmes et exercices de doigts." }
];

/* une gamme à deux mains, une octave : montée (2 mesures) puis descente (2 mesures) */
const DOIGTS_MONTEE = { D:[1, 2, 3, 1, 2, 3, 4, 5], G:[5, 4, 3, 2, 1, 3, 2, 1], DFa:[1, 2, 3, 4, 1, 2, 3, 4] };
function gamme({ id, nom, niveau, armure = 'C', droite, gauche, fa = false, desc, astuce, tempo = 66 }){
  const fd = fa ? DOIGTS_MONTEE.DFa : DOIGTS_MONTEE.D, fg = DOIGTS_MONTEE.G;
  const ligne = (notes, doigts) => notes.map((n, i) => `${n}${i === 0 ? ':1' : ''}@${doigts[i]}`);
  const mesures = (notes, doigts, dur = '1') => {
    const l = ligne(notes, doigts);
    return l.slice(0, 4).join(' ') + ' | ' + l.slice(4).join(' ');
  };
  const inv = a => [...a].reverse();
  return { id, nom, famille:'gammes', niveau, style:'Gamme', tempo, sig:'4/4', armure,
    d:mesures(droite, fd) + ' | ' + mesures(inv(droite), inv(fd)),
    g:mesures(gauche, fg) + ' | ' + mesures(inv(gauche), inv(fg)), desc, astuce };
}

export const EXERCICES = [
  gamme({ id:'ex-g-do', nom:'Gamme de Do majeur', niveau:2, droite:['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], gauche:['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'],
    desc:"La gamme de référence : aucune touche noire.", astuce:"Les deux pouces passent sous la main en même temps." }),
  gamme({ id:'ex-g-sol', nom:'Gamme de Sol majeur', niveau:3, armure:'G', droite:['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'], gauche:['G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F#3', 'G3'],
    desc:"Un dièse : le Fa♯.", astuce:"Le Fa♯ se joue avec l'annulaire." }),
  gamme({ id:'ex-g-fa', nom:'Gamme de Fa majeur', niveau:3, armure:'F', fa:true, droite:['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5'], gauche:['F2', 'G2', 'A2', 'Bb2', 'C3', 'D3', 'E3', 'F3'],
    desc:"Un bémol : le Si♭. Doigté différent à la main droite.", astuce:"Main droite : 1 2 3 4 · 1 2 3 4, sans passage du pouce." }),
  gamme({ id:'ex-g-re', nom:'Gamme de Ré majeur', niveau:4, armure:'D', droite:['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'], gauche:['D3', 'E3', 'F#3', 'G3', 'A3', 'B3', 'C#4', 'D4'],
    desc:"Deux dièses : Fa♯ et Do♯.", astuce:"Prépare le pouce sur Sol : c'est lui qui passe sous la main." }),
  gamme({ id:'ex-g-la', nom:'Gamme de La majeur', niveau:4, armure:'A', droite:['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'], gauche:['A2', 'B2', 'C#3', 'D3', 'E3', 'F#3', 'G#3', 'A3'],
    desc:"Trois dièses : Fa♯, Do♯ et Sol♯.", astuce:"Les touches noires donnent des repères : Do♯ au milieu, Sol♯ à la fin." }),
  gamme({ id:'ex-g-lam', nom:'Gamme de La mineur (naturelle)', niveau:3, armure:'Am', droite:['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'], gauche:['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'],
    desc:"Les mêmes notes que Do majeur, mais en partant du La : une couleur plus sombre.", astuce:"Écoute la différence avec la gamme de Do." }),
  gamme({ id:'ex-g-rem', nom:'Gamme de Ré mineur (naturelle)', niveau:4, armure:'Dm', droite:['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5'], gauche:['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C4', 'D4'],
    desc:"Un bémol : le Si♭.", astuce:"Joue-la plus lentement que la gamme de Do : le Si♭ demande de l'attention." }),

  /* ----- accords ----- */
  { id:'ex-a-do', nom:'Accord de Do majeur', famille:'accords', niveau:2, style:'Accord', tempo:60, sig:'4/4', armure:'C',
    d:'C4+E4+G4:4@1+3+5 | C4+E4+G4:4@1+3+5 | C4+E4+G4:4@1+3+5 | C4+E4+G4:4@1+3+5', g:'C3:4@5 | C3:4@5 | C3:4@5 | C3:4@5',
    desc:"Do – Mi – Sol : trois doigts en même temps (1-3-5).", astuce:"Pose les trois doigts ensemble, pas l'un après l'autre." },
  { id:'ex-a-renv', nom:'Do majeur et ses renversements', famille:'accords', niveau:3, style:'Accord', tempo:60, sig:'4/4', armure:'C',
    d:'C4+E4+G4:4@1+3+5 | E4+G4+C5:4@1+2+5 | G4+C5+E5:4@1+2+5 | C4+E4+G4:4@1+3+5', g:'C3:4@5 | C3:4@5 | C3:4@5 | C3:4@5',
    desc:"Les mêmes trois notes, dans un ordre différent : état fondamental, 1er et 2e renversements.", astuce:"La main « roule » vers le haut : le pouce et l'index se déplacent peu." },
  { id:'ex-a-cfg', nom:'Do – Fa – Sol – Do', famille:'accords', niveau:2, style:'Accord', tempo:66, sig:'4/4', armure:'C',
    d:'C4+E4+G4:4@1+3+5 | C4+F4+A4:4@1+2+5 | B3+D4+G4:4@1+2+5 | C4+E4+G4:4@1+3+5', g:'C3:4@5 | F3:4@5 | G3:4@5 | C3:4@5',
    desc:"La cadence la plus courante : tonique, sous-dominante, dominante, tonique.", astuce:"Le pouce descend d'un demi-ton ou d'un ton à chaque changement : c'est tout le secret." },
  { id:'ex-a-min', nom:'Accords mineurs : La, Ré, Mi', famille:'accords', niveau:3, style:'Accord', tempo:60, sig:'4/4', armure:'Am',
    d:'C4+E4+A4:4@1+2+5 | D4+F4+A4:4@1+3+5 | E4+G4+B4:4@1+3+5 | C4+E4+A4:4@1+2+5', g:'A2:4@5 | D3:4@5 | E3:4@5 | A2:4@5',
    desc:"Trois accords mineurs avec leur basse.", astuce:"Écoute : le mineur sonne plus triste que le majeur." },
  { id:'ex-a-pop', nom:'Do – Sol – La mineur – Fa', famille:'accords', niveau:3, style:'Accord', tempo:72, sig:'4/4', armure:'C',
    d:'C4+E4+G4:4 | B3+D4+G4:4 | C4+E4+A4:4 | C4+F4+A4:4', g:'C3:4 | G2:4 | A2:4 | F2:4',
    desc:"La suite d'accords de la pop, avec la basse.", astuce:"Rejoue-la en changeant le rythme : une fois en blanches, une fois en noires." },
  { id:'ex-a-sol', nom:'Sol – Do – Ré – Sol', famille:'accords', niveau:4, style:'Accord', tempo:66, sig:'4/4', armure:'G',
    d:'B3+D4+G4:4@1+2+5 | C4+E4+G4:4@1+3+5 | D4+F#4+A4:4@1+3+5 | B3+D4+G4:4@1+2+5', g:'G2:4@5 | C3:4@5 | D3:4@5 | G2:4@5',
    desc:"La même cadence en Sol majeur (un dièse).", astuce:"Le Fa♯ est dans l'accord de Ré : ta main garde la forme." },
  { id:'ex-a-rep', nom:'Accords répétés en croches', famille:'accords', niveau:4, style:'Accord', tempo:72, sig:'4/4', armure:'C',
    d:'C4+E4+G4:0.5 C4+E4+G4 C4+E4+G4 C4+E4+G4 C4+E4+G4 C4+E4+G4 C4+E4+G4 C4+E4+G4 | B3+D4+G4:0.5 B3+D4+G4 B3+D4+G4 B3+D4+G4 B3+D4+G4 B3+D4+G4 B3+D4+G4 B3+D4+G4 | C4+E4+A4:0.5 C4+E4+A4 C4+E4+A4 C4+E4+A4 C4+E4+A4 C4+E4+A4 C4+E4+A4 C4+E4+A4 | C4+F4+A4:0.5 C4+F4+A4 C4+F4+A4 C4+F4+A4 C4+F4+A4 C4+F4+A4 C4+F4+A4 C4+F4+A4',
    g:'C3:2 G3:2 | G2:2 D3:2 | A2:2 E3:2 | F2:2 C3:2',
    desc:"Des accords répétés en croches : le style de beaucoup d'accompagnements de pop.", astuce:"Garde le poignet souple : le son vient du poids du bras." },

  /* ----- arpèges et technique ----- */
  { id:'ex-t-arp-do', nom:'Arpège de Do majeur', famille:'technique', niveau:3, style:'Arpège', tempo:72, sig:'4/4', armure:'C',
    d:'C4:1@1 E4@2 G4@3 C5@5 | G4@3 E4@2 C4@1 r:1 | C4:1@1 E4@2 G4@3 C5@5 | G4@3 E4@2 C4:2@1', g:'C3:1@5 E3@3 G3@1 C4@1 | G3@1 E3@3 C3:1@5 r:1 | C3:1@5 E3@3 G3@1 C4@1 | G3@1 E3@3 C3:2@5',
    desc:"Les trois notes de l'accord l'une après l'autre, en montant puis en descendant.", astuce:"Le poignet tourne un peu : ne crispe pas la main." },
  { id:'ex-t-cinq', nom:'Cinq doigts : Do Mi Ré Fa Mi Sol', famille:'technique', niveau:2, style:'Doigts', tempo:66, sig:'4/4', armure:'C',
    d:'C4:0.5@1 E4@3 D4@2 F4@4 E4@3 G4@5 F4@4 E4@3 | D4@2 F4@4 E4@3 G4@5 F4@4 E4@3 D4@2 C4@1', g:'C3:0.5@5 E3@3 D3@4 F3@2 E3@3 G3@1 F3@2 E3@3 | D3@4 F3@2 E3@3 G3@1 F3@2 E3@3 D3@4 C3@5',
    desc:"Un motif de croches qui fait travailler chaque doigt.", astuce:"Toutes les croches au même volume." },
  { id:'ex-t-trille', nom:'Trille : Mi – Fa', famille:'technique', niveau:3, style:'Doigts', tempo:66, sig:'4/4', armure:'C',
    d:'E4:0.5@3 F4@4 E4@3 F4@4 E4@3 F4@4 E4@3 F4@4 | E4@3 F4@4 E4@3 F4@4 E4:2@3 | D4:0.5@2 E4@3 D4@2 E4@3 D4@2 E4@3 D4@2 E4@3 | D4@2 E4@3 D4@2 E4@3 C4:2@1',
    desc:"Alterner deux doigts voisins, vite et régulièrement.", astuce:"Les doigts restent près des touches : tout le mouvement vient des doigts, pas du bras." },
  { id:'ex-t-octaves', nom:'Sauts d\'octave', famille:'technique', niveau:4, style:'Doigts', tempo:66, sig:'4/4', armure:'C',
    d:'C4:1@1 C5@5 C4@1 C5@5 | D4@1 D5@5 D4@1 D5@5 | E4@1 E5@5 E4@1 E5@5 | C4:4@1', g:'C3:1@5 C4@1 C3@5 C4@1 | D3@5 D4@1 D3@5 D4@1 | E3@5 E4@1 E3@5 E4@1 | C3:4@5',
    desc:"Sauter une octave sans regarder : la main apprend la distance.", astuce:"Les yeux restent sur la partition : la main mesure l'écart toute seule." }
];
