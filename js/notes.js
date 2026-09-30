/* Notes, tonalités et format compact des morceaux.
 *
 * Un morceau s'écrit avec deux chaînes, une par main (d = droite, g = gauche) :
 *     d:'C4:1@1 D4 E4 F4 | G4:2 G4:2 | …'
 *   - note : lettre A-G, # ou b, octave (C4 = Do central) ; accord : C4+E4+G4 ; silence : r
 *   - :durée en temps (noire = 1) — sans durée, on garde la précédente
 *   - @doigt : numéro de doigt (1 = pouce), @1+3+5 pour un accord
 *   - | sépare les mesures (vérifié à la compilation)
 *   - (C4 E4 G4 E4)*2 répète un groupe
 */

export const LETTRES = 'CDEFGAB';
const SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
export const NOM_LETTRE = { C:'Do', D:'Ré', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const NOMS_DIESES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

export function parseNote(s){
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) throw new Error('note invalide : ' + s);
  const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const oct = +m[3];
  return { lettre:m[1], alt, oct, midi:(oct + 1) * 12 + SEMI[m[1]] + alt, dn:oct * 7 + LETTRES.indexOf(m[1]) };
}
export const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);
export const estNoire = midi => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
/* « Do4 », « Fa♯3 » : l'orthographe du morceau si on la connaît, sinon en dièses */
export function nomNote(midi, n, octave = true){
  const oct = Math.floor(midi / 12) - 1;
  if (n) return NOM_LETTRE[n.lettre] + (n.alt > 0 ? '♯' : n.alt < 0 ? '♭' : '') + (octave ? n.oct : '');
  return NOMS_DIESES[((midi % 12) + 12) % 12] + (octave ? oct : '');
}
export const nomCourt = midi => NOMS_DIESES[((midi % 12) + 12) % 12];

/* ---------- armures ---------- */
const DIESES = 'FCGDAEB', BEMOLS = 'BEADGCF';
const ARMURES = { C:0, G:1, D:2, A:3, E:4, B:5, F:-1, Bb:-2, Eb:-3, Ab:-4, Db:-5,
  Am:0, Em:1, Bm:2, 'F#m':3, 'C#m':4, Dm:-1, Gm:-2, Cm:-3, Fm:-4 };
export function armureDe(nom){
  const n = ARMURES[nom || 'C'] ?? 0;
  return { n, alt:Object.fromEntries((n > 0 ? DIESES.slice(0, n) : BEMOLS.slice(0, -n)).split('').map(l => [l, n > 0 ? 1 : -1])) };
}

/* ---------- lecture d'une main ---------- */
const DUREES = new Set([4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25]);
const JETON = /^(r|[A-G][#b]?\d(?:\+[A-G][#b]?\d)*)(?::(\d*\.?\d+))?(?:@(\d(?:\+\d)*))?$/;

function developper(texte){
  let t = texte, garde = 0;
  while (/\(([^()]*)\)\*(\d+)/.test(t) && garde++ < 20)
    t = t.replace(/\(([^()]*)\)\*(\d+)/g, (_, c, n) => Array(+n).fill(c.trim()).join(' '));
  return t;
}

function lireMain(texte, main, erreurs, nom){
  const notes = [];
  const mesures = [];            // durée de chaque mesure écrite avec « | »
  let t = 0, duree = 1, courante = 0, aBarres = false;
  for (const jeton of developper(texte).split(/\s+/).filter(Boolean)){
    if (jeton === '|'){ aBarres = true; mesures.push(courante); courante = 0; continue; }
    const m = JETON.exec(jeton);
    if (!m){ erreurs.push(`${nom} : jeton illisible « ${jeton} »`); continue; }
    if (m[2]) duree = parseFloat(m[2]);
    if (!DUREES.has(duree)) erreurs.push(`${nom} : durée ${duree} non prise en charge (« ${jeton} »)`);
    if (m[1] !== 'r'){
      const doigts = m[3] ? m[3].split('+').map(Number) : [];
      m[1].split('+').forEach((s, i) => {
        const n = parseNote(s);
        notes.push({ ...n, t, d:duree, main, doigt:doigts[i] ?? (doigts.length === 1 ? doigts[0] : 0), nom:s });
      });
    }
    t += duree; courante += duree;
  }
  if (courante > 0) mesures.push(courante);
  return { notes, total:t, mesures, aBarres };
}

/* sig : « 3/4 » → 3 temps de noire ; « 6/8 » → 3 ; « 3/8 » → 1,5 */
export function tempsParMesure(sig){
  const [a, b] = (sig || '4/4').split('/').map(Number);
  return a * 4 / b;
}

/* ---------- compilation d'un morceau ---------- */
export function compiler(p){
  const erreurs = [];
  const beats = tempsParMesure(p.sig);
  const sections = p.sections || [{ nom:'', d:p.d || '', g:p.g || '', fois:1 }];
  const notes = [], reperes = [];
  let debut = 0;
  for (const s of sections){
    const d = lireMain(s.d || '', 'D', erreurs, `${p.id} ${s.nom || ''} main droite`);
    const g = lireMain(s.g || '', 'G', erreurs, `${p.id} ${s.nom || ''} main gauche`);
    for (const [main, r] of [['droite', d], ['gauche', g]]){
      if (r.aBarres) r.mesures.forEach((m, i) => { if (Math.abs(m - beats) > 1e-6)
        erreurs.push(`${p.id} ${s.nom || ''} main ${main}, mesure ${i + 1} : ${m} temps au lieu de ${beats}`); });
      else if (r.total && Math.abs(r.total / beats - Math.round(r.total / beats)) > 1e-6)
        erreurs.push(`${p.id} ${s.nom || ''} main ${main} : ${r.total} temps, pas un nombre entier de mesures`);
    }
    if (d.total && g.total && Math.abs(d.total - g.total) > 1e-6)
      erreurs.push(`${p.id} ${s.nom || ''} : main droite ${d.total} temps, main gauche ${g.total}`);
    const longueur = Math.max(d.total, g.total);
    const fois = s.fois || 1;
    for (let f = 0; f < fois; f++){
      for (const n of [...d.notes, ...g.notes]) notes.push({ ...n, t:n.t + debut + f * longueur });
    }
    reperes.push({ nom:s.nom, fois, debut, fin:debut + longueur * fois, longueur });
    debut += longueur * fois;
  }
  notes.sort((a, b) => a.t - b.t || a.midi - b.midi);

  // étapes : toutes les notes qui démarrent ensemble
  const etapes = [];
  for (const n of notes){
    const e = etapes[etapes.length - 1];
    if (e && Math.abs(e.t - n.t) < 1e-6) e.notes.push(n);
    else etapes.push({ t:n.t, notes:[n] });
  }
  etapes.forEach((e, i) => {
    e.i = i;
    e.midis = [...new Set(e.notes.map(n => n.midi))];
    e.notes.forEach(n => { n.etape = i; });
  });
  notes.forEach((n, i) => { n.i = i; n.mesure = Math.floor(n.t / beats + 1e-9); });
  const total = debut;
  const mesures = Math.round(total / beats);
  const plage = notes.length ? [Math.min(...notes.map(n => n.midi)), Math.max(...notes.map(n => n.midi))] : [60, 72];
  return { id:p.id, titre:p.titre, tempo:p.tempo || 80, sig:p.sig || '4/4', beats, armure:p.armure || 'C',
    notes, etapes, total, mesures, sections:reperes, plage, mains:{ D:notes.some(n => n.main === 'D'), G:notes.some(n => n.main === 'G') },
    erreurs, source:p };
}
