/* Morceaux à jouer. Deux sortes :
 *  - « air » : la mélodie d'un air traditionnel (domaine public), jouée note pour note ;
 *  - « accompagnement » : la suite d'accords et la basse d'un titre connu, simplifiées pour débuter
 *    (progression d'accords + arpèges ou accords). Ce n'est PAS une transcription de l'original :
 *    c'est ce qu'il faut pour jouer par-dessus l'enregistrement ou chanter par-dessus.
 * Les mélodies des chansons protégées ne sont pas reproduites. */
import { ODE_D, ODE_G, CLAIR_D, FRERE_D, JINGLE_D, ANNIV_D, DOUCE_D, DOUCE_G, CANON_D, CANON_G } from './airs.js';

/* ---------- accompagnements : des accords, et des manières de les jouer ----------
 * Chaque accord : trois notes pour la main droite (du grave à l'aigu) et une basse pour la gauche. */
const ACC = {
  // La majeur (Someone Like You)
  'A':['A4', 'C#5', 'E5', 'A2'], 'C#m/G#':['G#4', 'C#5', 'E5', 'G#2'], 'F#m':['F#4', 'A4', 'C#5', 'F#2'],
  'D':['D4', 'F#4', 'A4', 'D3'], 'E':['E4', 'G#4', 'B4', 'E2'],
  // fa mineur / la bémol majeur (Hello, Viva la Vida, Libérée délivrée)
  'Fm':['F4', 'Ab4', 'C5', 'F2'], 'Ab':['Eb4', 'Ab4', 'C5', 'Ab2'], 'Eb':['Eb4', 'G4', 'Bb4', 'Eb2'],
  'Db':['Db4', 'F4', 'Ab4', 'Db3'], 'Cm':['Eb4', 'G4', 'C5', 'C3'],
  // do mineur (Rolling in the Deep)
  'Cm*':['G4', 'C5', 'Eb5', 'C3'], 'Bb*':['F4', 'Bb4', 'D5', 'Bb2'], 'Ab*':['Eb4', 'Ab4', 'C5', 'Ab2'],
  'Gm':['D4', 'G4', 'Bb4', 'G2'], 'G':['D4', 'G4', 'B4', 'G2'],
  // fa majeur (The Scientist)
  'Dm7':['F4', 'A4', 'C5', 'D3'], 'Bb':['D4', 'F4', 'Bb4', 'Bb2'], 'F':['C4', 'F4', 'A4', 'F2'],
  'Fsus2':['C4', 'F4', 'G4', 'F2'], 'Bbsus2':['C4', 'F4', 'Bb4', 'Bb2'],
  // mi bémol majeur (Fix You, Clocks)
  'Eb/G':['Eb4', 'G4', 'Bb4', 'G2'], 'Bbm':['Db4', 'F4', 'Bb4', 'Bb1'], 'Bb+':['D4', 'F4', 'Bb4', 'Bb1'],
  'Gb':['Db4', 'Gb4', 'Bb4', 'Gb2'],
  // mi majeur (Helena)
  'C#m':['C#4', 'E4', 'G#4', 'C#3'], 'E*':['B3', 'E4', 'G#4', 'E3'], 'B':['B3', 'D#4', 'F#4', 'B2'], 'A*':['C#4', 'E4', 'A4', 'A2']
};
const acc = nom => { const a = ACC[nom]; if (!a) throw new Error('accord inconnu : ' + nom); return a; };
const tri = a => `${a[0]}+${a[1]}+${a[2]}`;

/* une mesure de 4 temps sur un accord, selon un motif. Rend [main droite, main gauche]. */
const MOTIFS = {
  // arpège de huit croches : bas – milieu – haut – milieu (deux fois), basse tenue
  arpege:  a => [`${a[0]}:0.5@1 ${a[1]}@2 ${a[2]}@5 ${a[1]}@2 ${a[0]}@1 ${a[1]}@2 ${a[2]}@5 ${a[1]}@2`, `${a[3]}:4@5`],
  // deux accords tenus (ballade), basse tenue
  blanches:a => [`${tri(a)}:2@1+3+5 ${tri(a)}:2@1+3+5`, `${a[3]}:4@5`],
  // accord sur chaque temps, basse sur 1 et 3
  noires:  a => [`${tri(a)}:1@1+3+5 ${tri(a)} ${tri(a)} ${tri(a)}`, `${a[3]}:2@5 ${a[3]}:2@5`],
  // pulsation rock : accord sur chaque temps, basse sur chaque temps
  rock:    a => [`${tri(a)}:1@1+3+5 ${tri(a)} ${tri(a)} ${tri(a)}`, `${a[3]}:1@5 ${a[3]} ${a[3]} ${a[3]}`],
  // croches brisées haut – milieu – bas en 3 + 3 + 2 (le motif de Clocks)
  brise:   a => [`${a[2]}:0.5@5 ${a[1]}@3 ${a[0]}@1 ${a[2]}@5 ${a[1]}@3 ${a[0]}@1 ${a[2]}@5 ${a[1]}@3`, `${a[3]}:4@5`],
  // accord final tenu
  ronde:   a => [`${tri(a)}:4@1+3+5`, `${a[3]}:4@5`]
};
/* une partie : liste d'accords (un par mesure), un motif, un nombre de passages */
function partie(nom, accords, motif, fois = 1){
  const m = accords.map(n => MOTIFS[motif](acc(n)));
  return { nom, fois, d:m.map(x => x[0]).join(' | '), g:m.map(x => x[1]).join(' | ') };
}

export const GENRES = [
  { id:'pop',       nom:'Pop & variété',     styles:['Pop'],             grad:['#fb7185', '#be123c'] },
  { id:'rock',      nom:'Rock',              styles:['Rock'],            grad:['#94a3b8', '#1e293b'] },
  { id:'films',     nom:'Disney & films',    styles:['Films'],           grad:['#38bdf8', '#1d4ed8'] },
  { id:'classique', nom:'Classiques',        styles:['Classique'],       grad:['#a78bfa', '#6d28d9'] },
  { id:'comptines', nom:'Comptines & chants', styles:['Comptine', 'Chant'], grad:['#34d399', '#0f766e'] }
];

export const MORCEAUX = [
  /* ---------------- comptines et chants (domaine public) ---------------- */
  { id:'m-clair', titre:'Au clair de la lune', artiste:'Air traditionnel', annee:'XVIIIᵉ', style:'Comptine', niveau:1, tempo:72, sig:'4/4', type:'air',
    desc:"La comptine que tout le monde connaît, en position de Do.", astuce:"Chante les paroles dans ta tête en jouant.",
    sections:[{ nom:'', d:CLAIR_D + ' | ' + CLAIR_D }] },
  { id:'m-frere', titre:'Frère Jacques', artiste:'Air traditionnel', annee:'XVIIIᵉ', style:'Comptine', niveau:2, tempo:90, sig:'4/4', type:'air',
    desc:"Un canon célèbre. Déplace la main pour atteindre le La.", astuce:"Les phrases se répètent deux fois : apprends une phrase, tu en sais la moitié.",
    sections:[{ nom:'', d:FRERE_D }] },
  { id:'m-jingle', titre:'Jingle Bells', artiste:'James Lord Pierpont', annee:1857, style:'Chant', niveau:1, tempo:100, sig:'4/4', type:'air',
    desc:"Le refrain de Noël, entièrement dans la position de Do.", astuce:"Le rythme du refrain revient trois fois : compte-le avant de jouer.",
    sections:[{ nom:'', d:JINGLE_D }] },
  { id:'m-anniv', titre:'Joyeux anniversaire', artiste:'Air traditionnel', annee:1893, style:'Chant', niveau:3, tempo:84, sig:'3/4', type:'air',
    desc:"Pour tous les anniversaires. Commence sur le 3ᵉ temps, avec un saut d'octave sur « cher·e ».", astuce:"Prépare le saut : regarde la note d'arrivée avant de bouger la main.",
    sections:[{ nom:'', d:ANNIV_D }] },
  { id:'m-douce', titre:'Douce nuit', artiste:'Franz Gruber', annee:1818, style:'Chant', niveau:3, tempo:66, sig:'3/4', type:'air',
    desc:"Le grand chant de Noël, en trois temps, avec une basse simple.", astuce:"Travaille quatre mesures à la fois.",
    sections:[{ nom:'', d:DOUCE_D, g:DOUCE_G }] },

  /* ---------------- classiques ---------------- */
  { id:'m-ode', titre:'Ode à la joie', artiste:'Ludwig van Beethoven', annee:1824, style:'Classique', niveau:2, tempo:84, sig:'4/4', type:'air',
    desc:"Le thème de la 9ᵉ symphonie, aux deux mains : la mélodie à droite, une basse simple à gauche.", astuce:"Joue d'abord la main gauche seule, deux fois.",
    sections:[{ nom:'Thème', d:ODE_D, g:ODE_G }] },
  { id:'m-canon', titre:'Canon en ré', artiste:'Johann Pachelbel', annee:1680, style:'Classique', niveau:4, tempo:60, sig:'4/4', armure:'D', type:'air',
    desc:"Les huit accords et la basse qui descend, en ré majeur : la base de centaines de chansons.", astuce:"Joue la basse seule pour l'entendre : c'est elle qui conduit.",
    sections:[{ nom:'Les 8 accords', d:CANON_D, g:CANON_G, fois:4 }] },

  /* ---------------- Adele ----------------
   * Accompagnements sur toute la chanson : l'ordre des parties et leurs accords. Le nombre de
   * passages de chaque partie est donné de mémoire et d'après des grilles publiques : à vérifier
   * en écoutant l'enregistrement. */
  { id:'m-someone', titre:'Someone Like You', artiste:'Adele', annee:2011, style:'Pop', niveau:3, tempo:67, sig:'4/4', armure:'A', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en La majeur (trois dièses) : l'arpège de l'intro et des couplets (La – Do♯m/Sol♯ – Fa♯m – Ré), le pré-refrain (Mi – Fa♯m – Ré), le refrain (La – Mi – Fa♯m – Ré) et le pont.",
    astuce:"Garde les arpèges bien réguliers, comme une vague. Au refrain, les accords tenus donnent plus d'ampleur : appuie un peu plus.",
    sections:[
      partie('Intro', ['A', 'C#m/G#', 'F#m', 'D'], 'arpege', 2),
      partie('Couplet 1', ['A', 'C#m/G#', 'F#m', 'D'], 'arpege', 4),
      partie('Pré-refrain', ['E', 'F#m', 'D', 'D', 'E', 'F#m', 'D', 'E'], 'blanches'),
      partie('Refrain', ['A', 'E', 'F#m', 'D'], 'blanches', 2),
      partie('Couplet 2', ['A', 'C#m/G#', 'F#m', 'D'], 'arpege', 2),
      partie('Pré-refrain 2', ['E', 'F#m', 'D', 'D', 'E', 'F#m', 'D', 'E'], 'blanches'),
      partie('Refrain 2', ['A', 'E', 'F#m', 'D'], 'blanches', 2),
      partie('Pont', ['E', 'F#m', 'D', 'D'], 'blanches', 2),
      partie('Dernier refrain', ['A', 'E', 'F#m', 'D'], 'arpege', 2),
      partie('Fin', ['A'], 'ronde')
    ] },
  { id:'m-hello', titre:'Hello', artiste:'Adele', annee:2015, style:'Pop', niveau:4, tempo:79, sig:'4/4', armure:'Fm', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en fa mineur (quatre bémols) : couplet Fa m – La♭ – Mi♭ – Ré♭, pré-refrain Fa m – Mi♭ – Do m – Ré♭, refrain Fa m – Ré♭ – La♭ – Mi♭.",
    astuce:"Couplets doux en accords tenus ; au refrain, un accord sur chaque temps pour faire monter l'intensité.",
    sections:[
      partie('Intro', ['Fm', 'Ab', 'Eb', 'Db'], 'blanches'),
      partie('Couplet 1', ['Fm', 'Ab', 'Eb', 'Db'], 'blanches', 4),
      partie('Pré-refrain', ['Fm', 'Eb', 'Cm', 'Db'], 'blanches', 2),
      partie('Refrain', ['Fm', 'Db', 'Ab', 'Eb'], 'noires', 4),
      partie('Couplet 2', ['Fm', 'Ab', 'Eb', 'Db'], 'blanches', 2),
      partie('Pré-refrain 2', ['Fm', 'Eb', 'Cm', 'Db'], 'blanches', 2),
      partie('Refrain 2', ['Fm', 'Db', 'Ab', 'Eb'], 'noires', 4),
      partie('Pont', ['Fm', 'Db', 'Ab', 'Eb'], 'blanches', 2),
      partie('Dernier refrain', ['Fm', 'Db', 'Ab', 'Eb'], 'noires', 4),
      partie('Fin', ['Fm'], 'ronde')
    ] },
  { id:'m-rolling', titre:'Rolling in the Deep', artiste:'Adele', annee:2010, style:'Pop', niveau:3, tempo:105, sig:'4/4', armure:'Cm', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en do mineur (trois bémols) : couplet Do m – Sol m – Si♭, pré-refrain La♭ – Si♭ – Sol m, refrain Do m – Si♭ – La♭ – Si♭.",
    astuce:"Frappe les accords fermement, comme un batteur : c'est un morceau qui avance. Au pont, tout redescend : accords tenus.",
    sections:[
      partie('Couplet 1', ['Cm*', 'Cm*', 'Gm', 'Bb*'], 'rock', 4),
      partie('Pré-refrain', ['Ab*', 'Bb*', 'Gm', 'Gm', 'Ab*', 'Bb*', 'G', 'G'], 'rock'),
      partie('Refrain', ['Cm*', 'Bb*', 'Ab*', 'Bb*'], 'rock', 4),
      partie('Couplet 2', ['Cm*', 'Cm*', 'Gm', 'Bb*'], 'rock', 4),
      partie('Pré-refrain 2', ['Ab*', 'Bb*', 'Gm', 'Gm', 'Ab*', 'Bb*', 'G', 'G'], 'rock'),
      partie('Refrain 2', ['Cm*', 'Bb*', 'Ab*', 'Bb*'], 'rock', 4),
      partie('Pont', ['Cm*', 'Bb*', 'Ab*', 'Bb*'], 'blanches', 2),
      partie('Dernier refrain', ['Cm*', 'Bb*', 'Ab*', 'Bb*'], 'rock', 4),
      partie('Fin', ['Cm*'], 'ronde')
    ] },

  /* ---------------- Coldplay ---------------- */
  { id:'m-clocks', titre:'Clocks', artiste:'Coldplay', annee:2002, style:'Pop', niveau:4, tempo:131, sig:'4/4', armure:'Eb', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson : les accords Mi♭ – Si♭ m – Si♭ m – Fa m joués en notes brisées (haut – milieu – bas, groupées 3 + 3 + 2), et le pont sur Ré♭ – La♭ – Sol♭.",
    astuce:"Joue très lentement d'abord : chaque mesure est un seul geste répété. À 131, c'est rapide : monte par paliers.",
    sections:[
      partie('Intro', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Couplet 1', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Refrain', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Interlude', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Couplet 2', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Refrain 2', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Interlude 2', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 4),
      partie('Pont', ['Db', 'Db', 'Ab', 'Gb'], 'blanches', 4),
      partie('Fin', ['Eb', 'Bbm', 'Bbm', 'Fm'], 'brise', 8)
    ] },
  { id:'m-viva', titre:'Viva la Vida', artiste:'Coldplay', annee:2008, style:'Pop', niveau:4, tempo:138, sig:'4/4', armure:'Ab', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson tourne sur la même boucle : Ré♭ – Mi♭ – La♭ – Fa m, en la bémol majeur (quatre bémols). Accords sur chaque temps, plus doux au pont.",
    astuce:"Accents sur le 1 de chaque mesure. Joue les accords secs, comme des cordes en staccato.",
    sections:[
      partie('Intro', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 2),
      partie('Couplet 1', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 4),
      partie('Refrain', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 4),
      partie('Interlude', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 2),
      partie('Couplet 2', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 4),
      partie('Refrain 2', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 4),
      partie('Pont', ['Db', 'Eb', 'Ab', 'Fm'], 'blanches', 6),
      partie('Dernier refrain', ['Db', 'Eb', 'Ab', 'Fm'], 'noires', 6),
      partie('Fin', ['Ab'], 'ronde')
    ] },
  { id:'m-scientist', titre:'The Scientist', artiste:'Coldplay', annee:2002, style:'Pop', niveau:3, tempo:73, sig:'4/4', armure:'F', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en fa majeur (un bémol) : intro et couplets Ré m7 – Si♭ – Fa – Fa sus2, refrain Si♭ – Si♭ – Fa – Fa sus2, pont Fa – Si♭ sus2 – Fa – Fa sus2.",
    astuce:"Un accord sur chaque temps, régulier et doux, comme au début de l'enregistrement. Laisse la basse sonner toute la mesure.",
    sections:[
      partie('Intro', ['Dm7', 'Bb', 'F', 'Fsus2'], 'noires', 2),
      partie('Couplet 1', ['Dm7', 'Bb', 'F', 'Fsus2'], 'noires', 4),
      partie('Refrain', ['Bb', 'Bb', 'F', 'Fsus2'], 'noires', 2),
      partie('Couplet 2', ['Dm7', 'Bb', 'F', 'Fsus2'], 'noires', 4),
      partie('Refrain 2', ['Bb', 'Bb', 'F', 'Fsus2'], 'noires', 2),
      partie('Pont', ['F', 'Bbsus2', 'F', 'Fsus2'], 'blanches', 4),
      partie('Dernier couplet', ['Dm7', 'Bb', 'F', 'Fsus2'], 'noires', 4),
      partie('Fin', ['Dm7', 'Bb', 'F', 'F'], 'blanches')
    ] },
  { id:'m-fixyou', titre:'Fix You', artiste:'Coldplay', annee:2005, style:'Pop', niveau:3, tempo:70, sig:'4/4', armure:'Eb', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en mi bémol majeur (trois bémols) : couplet Mi♭ – Mi♭/Sol – Do m – Si♭, refrain La♭ – Mi♭ – Si♭, et la montée de la fin Mi♭ – La♭ – Mi♭ – Si♭.",
    astuce:"Plus tu joues doucement au début, plus la fin est forte. Laisse respirer chaque accord.",
    sections:[
      partie('Couplet 1', ['Eb', 'Eb/G', 'Cm', 'Bb+'], 'blanches', 4),
      partie('Refrain', ['Ab', 'Eb', 'Bb+', 'Bb+'], 'blanches', 2),
      partie('Couplet 2', ['Eb', 'Eb/G', 'Cm', 'Bb+'], 'blanches', 4),
      partie('Refrain 2', ['Ab', 'Eb', 'Bb+', 'Bb+'], 'blanches', 2),
      partie('Montée', ['Eb', 'Ab', 'Eb', 'Bb+'], 'noires', 6),
      partie('Dernier refrain', ['Ab', 'Eb', 'Bb+', 'Bb+'], 'blanches', 2),
      partie('Fin', ['Eb'], 'ronde')
    ] },

  /* ---------------- rock ---------------- */
  { id:'m-helena', titre:'Helena (So Long & Goodnight)', artiste:'My Chemical Romance', annee:2005, style:'Rock', niveau:4, tempo:125, sig:'4/4', armure:'E', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson, en mi majeur (quatre dièses) : intro et couplets Do♯ m – Mi – Si – La, refrain Mi – Si – Do♯ m.",
    astuce:"Frappe les accords sur chaque temps, avec de l'énergie : c'est du rock. Commence vers 80 et monte.",
    sections:[
      partie('Intro', ['C#m', 'E*', 'B', 'A*'], 'blanches', 2),
      partie('Couplet 1', ['C#m', 'E*', 'B', 'A*'], 'rock', 4),
      partie('Refrain', ['E*', 'B', 'C#m', 'C#m'], 'rock', 4),
      partie('Couplet 2', ['C#m', 'E*', 'B', 'A*'], 'rock', 4),
      partie('Refrain 2', ['E*', 'B', 'C#m', 'C#m'], 'rock', 4),
      partie('Pont', ['C#m', 'E*', 'B', 'A*'], 'blanches', 4),
      partie('Dernier refrain', ['E*', 'B', 'C#m', 'C#m'], 'rock', 4),
      partie('Fin', ['C#m'], 'ronde')
    ] },

  /* ---------------- Disney ---------------- */
  { id:'m-libere', titre:'Libérée, délivrée (Let It Go)', artiste:'La Reine des neiges', annee:2013, style:'Films', niveau:3, tempo:69, sig:'4/4', armure:'Ab', type:'accompagnement', aVerifier:true,
    desc:"Toute la chanson dans la tonalité du film (quatre bémols) : couplets en fa mineur (Fa m – Ré♭ – Mi♭ – Do m), pré-refrain Ré♭ – Mi♭, refrain en la bémol majeur (La♭ – Mi♭ – Fa m – Ré♭).",
    astuce:"Couplets doux en accords tenus, refrain avec un accord sur chaque temps. Tu peux chanter par-dessus : c'est la tonalité du film.",
    sections:[
      partie('Intro', ['Fm', 'Db', 'Eb', 'Cm'], 'arpege'),
      partie('Couplet 1', ['Fm', 'Db', 'Eb', 'Cm'], 'blanches', 2),
      partie('Pré-refrain', ['Db', 'Eb', 'Db', 'Eb'], 'blanches'),
      partie('Refrain', ['Ab', 'Eb', 'Fm', 'Db'], 'noires', 2),
      partie('Couplet 2', ['Fm', 'Db', 'Eb', 'Cm'], 'blanches', 2),
      partie('Pré-refrain 2', ['Db', 'Eb', 'Db', 'Eb'], 'blanches'),
      partie('Refrain 2', ['Ab', 'Eb', 'Fm', 'Db'], 'noires', 2),
      partie('Dernier refrain', ['Ab', 'Eb', 'Fm', 'Db'], 'noires', 3),
      partie('Fin', ['Ab'], 'ronde')
    ] }
];
