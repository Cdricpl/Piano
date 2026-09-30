/* Morceaux à jouer. Deux sortes :
 *  - « air » : la mélodie d'un air traditionnel (domaine public), jouée note pour note ;
 *  - « accompagnement » : la suite d'accords et la basse d'un titre connu, simplifiées pour débuter
 *    (progression d'accords + arpèges ou accords). Ce n'est PAS une transcription de l'original :
 *    c'est ce qu'il faut pour jouer par-dessus l'enregistrement ou chanter par-dessus.
 * Les mélodies des chansons protégées ne sont pas reproduites. */
import { ODE_D, ODE_G, CLAIR_D, FRERE_D, JINGLE_D, ANNIV_D, DOUCE_D, DOUCE_G, CANON_D, CANON_G } from './airs.js';

/* arpège de huit croches sur un accord : bas – milieu – haut – milieu (deux fois) */
const arp = (a, b, c, f = [1, 3, 5]) =>
  `${a}:0.5@${f[0]} ${b}@${f[1]} ${c}@${f[2]} ${b}@${f[1]} ${a}@${f[0]} ${b}@${f[1]} ${c}@${f[2]} ${b}@${f[1]}`;
const barres = (...m) => m.join(' | ');
/* un accord répété : deux blanches, ou quatre noires */
const deux = x => `${x}:2 ${x}:2`;
const quatre = x => `${x}:1 ${x} ${x} ${x}`;

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

  /* ---------------- Adele ---------------- */
  { id:'m-someone', titre:'Someone Like You', artiste:'Adele', annee:2011, style:'Pop', niveau:3, tempo:67, sig:'4/4', armure:'A', type:'accompagnement',
    desc:"Les accords et l'arpège de l'intro : La – Mi/Sol♯ – Fa♯ mineur – Ré, en La majeur (trois dièses). Main droite en arpèges, basse à gauche.",
    astuce:"Garde les arpèges bien réguliers, comme une vague. Laisse sonner les notes.",
    sections:[
      { nom:'Refrain', fois:2,
        d:barres(arp('A4', 'C#5', 'E5'), arp('G#4', 'B4', 'E5', [1, 2, 5]), arp('F#4', 'A4', 'C#5'), arp('D4', 'F#4', 'A4')),
        g:'A2:4@5 | G#2:4@5 | F#2:4@5 | D3:4@5' },
      { nom:'Couplet', fois:2,
        d:barres(arp('A4', 'C#5', 'E5'), arp('C#4', 'E4', 'G#4'), arp('F#4', 'A4', 'C#5'), arp('D4', 'F#4', 'A4')),
        g:'A2:4@5 | C#3:4@5 | F#2:4@5 | D3:4@5' }
    ] },
  { id:'m-hello', titre:'Hello', artiste:'Adele', annee:2015, style:'Pop', niveau:4, tempo:79, sig:'4/4', armure:'Fm', type:'accompagnement',
    desc:"La suite d'accords du couplet (Fa mineur – La♭ – Mi♭ – Ré♭) et le passage qui relie les parties. Quatre bémols à la clé.",
    astuce:"Joue les accords bien posés, sans les arpéger : c'est une ballade, le silence compte autant que les notes.",
    sections:[
      { nom:'Couplet', fois:2,
        d:barres(deux('F4+Ab4+C5'), deux('Ab4+C5+Eb5'), deux('G4+Bb4+Eb5'), deux('F4+Ab4+Db5')),
        g:'F2:4 | Ab2:4 | Eb3:4 | Db3:4' },
      { nom:'Passage', fois:1,
        d:barres(deux('F4+Ab4+C5'), deux('G4+Bb4+Eb5'), deux('G4+C5+Eb5'), deux('F4+Ab4+Db5')),
        g:'F2:4 | Eb3:4 | C3:4 | Db3:4' }
    ] },
  { id:'m-rolling', titre:'Rolling in the Deep', artiste:'Adele', annee:2010, style:'Pop', niveau:3, tempo:105, sig:'4/4', armure:'Cm', type:'accompagnement',
    desc:"La suite d'accords du refrain : Do mineur – Si♭ – La♭ – Si♭, en accords frappés sur chaque temps.",
    astuce:"Frappe les accords fermement, comme un batteur : c'est un morceau qui avance.",
    sections:[
      { nom:'Refrain', fois:4,
        d:barres(quatre('G4+C5+Eb5'), quatre('F4+Bb4+D5'), quatre('Eb4+Ab4+C5'), quatre('D4+F4+Bb4')),
        g:'C3:2 C3:2 | Bb2:2 Bb2:2 | Ab2:2 Ab2:2 | Bb2:2 Bb2:2' }
    ] },

  /* ---------------- Coldplay ---------------- */
  { id:'m-clocks', titre:'Clocks', artiste:'Coldplay', annee:2002, style:'Pop', niveau:4, tempo:131, sig:'4/4', armure:'Eb', type:'accompagnement', aVerifier:true,
    desc:"Le célèbre riff de piano : trois notes brisées qui tournent (haut – milieu – bas), sur Mi♭, Si♭ mineur et Fa mineur.",
    astuce:"Joue très lentement d'abord : chaque mesure est un seul geste répété. À 131, c'est rapide : monte par paliers.",
    sections:[
      { nom:'Le riff', fois:4,
        d:barres('Eb5:0.5 Bb4 G4 Eb5 Bb4 G4 Eb5 Bb4', 'Db5:0.5 Bb4 F4 Db5 Bb4 F4 Db5 Bb4', 'Db5:0.5 Bb4 F4 Db5 Bb4 F4 Db5 Bb4', 'C5:0.5 Ab4 F4 C5 Ab4 F4 C5 Ab4'),
        g:'Eb3:4 | Bb2:4 | Bb2:4 | F3:4' }
    ] },
  { id:'m-viva', titre:'Viva la Vida', artiste:'Coldplay', annee:2008, style:'Pop', niveau:4, tempo:138, sig:'4/4', armure:'Ab', type:'accompagnement',
    desc:"La boucle d'accords du morceau : Ré♭ – Mi♭ – La♭ – Fa mineur, en accords frappés sur chaque temps. Quatre bémols.",
    astuce:"Accents sur le 1 de chaque mesure. Joue les accords secs, comme des cordes en staccato.",
    sections:[
      { nom:'La boucle', fois:4,
        d:barres(quatre('Db4+F4+Ab4'), quatre('Eb4+G4+Bb4'), quatre('Eb4+Ab4+C5'), quatre('F4+Ab4+C5')),
        g:'Db3:2 Db3:2 | Eb3:2 Eb3:2 | Ab2:2 Ab2:2 | F2:2 F2:2' }
    ] },
  { id:'m-scientist', titre:'The Scientist', artiste:'Coldplay', annee:2002, style:'Pop', niveau:3, tempo:73, sig:'4/4', armure:'F', type:'accompagnement',
    desc:"La suite d'accords du morceau : Ré mineur – Si♭ – Fa – Do, en fa majeur (un bémol).",
    astuce:"Joue doux et lentement : les accords doivent sonner comme une respiration.",
    sections:[
      { nom:'La suite', fois:4,
        d:barres(deux('D4+F4+A4'), deux('D4+F4+Bb4'), deux('C4+F4+A4'), deux('C4+E4+G4')),
        g:'D3:4 | Bb2:4 | F3:4 | C3:4' }
    ] },
  { id:'m-fixyou', titre:'Fix You', artiste:'Coldplay', annee:2005, style:'Pop', niveau:3, tempo:70, sig:'4/4', armure:'Eb', type:'accompagnement', aVerifier:true,
    desc:"La progression de la fin du morceau : Mi♭ – La♭ – Mi♭ – Si♭, en mi bémol majeur (trois bémols).",
    astuce:"Plus tu joues doucement, plus l'effet est fort. Laisse respirer chaque accord.",
    sections:[
      { nom:'Progression', fois:4,
        d:barres(deux('Eb4+G4+Bb4'), deux('Eb4+Ab4+C5'), deux('Eb4+G4+Bb4'), deux('D4+F4+Bb4')),
        g:'Eb3:4 | Ab2:4 | Eb3:4 | Bb2:4' }
    ] },

  /* ---------------- rock ---------------- */
  { id:'m-helena', titre:'Helena (So Long & Goodnight)', artiste:'My Chemical Romance', annee:2005, style:'Rock', niveau:4, tempo:100, sig:'4/4', armure:'E', type:'accompagnement', aVerifier:true,
    desc:"Les accords de l'intro : Do♯ mineur – Mi – Si – La, en mi majeur (quatre dièses).",
    astuce:"Frappe les accords sur chaque temps, avec de l'énergie : c'est du rock.",
    sections:[
      { nom:'Intro', fois:4,
        d:barres(quatre('C#4+E4+G#4'), quatre('B3+E4+G#4'), quatre('B3+D#4+F#4'), quatre('C#4+E4+A4')),
        g:'C#3:2 C#3:2 | E3:2 E3:2 | B2:2 B2:2 | A2:2 A2:2' }
    ] },

  /* ---------------- Disney ---------------- */
  { id:'m-libere', titre:'Libérée, délivrée (Let It Go)', artiste:'La Reine des neiges', annee:2013, style:'Films', niveau:3, tempo:137, sig:'4/4', armure:'C', type:'accompagnement', aVerifier:true,
    desc:"La suite d'accords du refrain, transposée en Do pour débuter : La mineur – Fa – Do – Sol.",
    astuce:"Chante le refrain en jouant : la suite est facile à reconnaître. Commence lentement, puis monte vers 137.",
    sections:[
      { nom:'Refrain en Do', fois:4,
        d:barres(deux('C4+E4+A4'), deux('C4+F4+A4'), deux('C4+E4+G4'), deux('B3+D4+G4')),
        g:'A2:4 | F2:4 | C3:4 | G2:4' }
    ] }
];
