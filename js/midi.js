/* Importer une partition depuis un fichier MIDI (.mid) : celles qu'on télécharge ou qu'on exporte
 * de MuseScore, par exemple. Le fichier est lu dans le navigateur et converti au format compact
 * des morceaux (notes.js) : il ne quitte pas l'appareil.
 *
 * Ce que fait la conversion :
 *   - les débuts de notes sont arrondis à la double croche (1/4 de temps) ;
 *   - deux pistes ou plus : la plus aiguë en moyenne va à la main droite, la plus grave à la gauche ;
 *     une seule piste : partage autour du Do central ;
 *   - une note qui dépasse la barre de mesure est raccourcie jusqu'à la barre (pas de liaisons) ;
 *   - la batterie (canal 10) est ignorée. */

const VALEURS_MIDI = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
const NOMS_D = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOMS_B = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ARMURES_MAJ = { '-5':'Db', '-4':'Ab', '-3':'Eb', '-2':'Bb', '-1':'F', 0:'C', 1:'G', 2:'D', 3:'A', 4:'E', 5:'B' };
const ARMURES_MIN = { '-4':'Fm', '-3':'Cm', '-2':'Gm', '-1':'Dm', 0:'Am', 1:'Em', 2:'Bm', 3:'F#m', 4:'C#m' };

/* ---------- lecture du fichier ---------- */
export function lireMidi(buffer){
  const o = new Uint8Array(buffer);
  let p = 0;
  const u32 = () => (o[p++] << 24 | o[p++] << 16 | o[p++] << 8 | o[p++]) >>> 0;
  const u16 = () => o[p++] << 8 | o[p++];
  const vlq = () => { let v = 0, b; do { b = o[p++]; v = v * 128 + (b & 0x7f); } while (b & 0x80 && p < o.length); return v; };
  const texte = (a, n) => String.fromCharCode(...o.subarray(a, a + n));

  if (texte(0, 4) !== 'MThd') throw new Error("Ce n'est pas un fichier MIDI.");
  p = 4;
  const lg = u32(), format = u16(), nPistes = u16(), division = u16();
  if (division & 0x8000) throw new Error('Fichier MIDI en temps SMPTE : non pris en charge.');
  p = 8 + lg;
  const pistes = [], tempos = [], mesures = [], armures = [];
  for (let k = 0; k < nPistes && p < o.length; k++){
    if (texte(p, 4) !== 'MTrk'){ p += 8 + ((o[p + 4] << 24 | o[p + 5] << 16 | o[p + 6] << 8 | o[p + 7]) >>> 0); k--; continue; }
    p += 4;
    const fin = p + 4 + u32();
    const piste = { nom:'', notes:[] };
    const ouvertes = new Map();          // (canal, note) → note en cours
    let t = 0, statut = 0;
    while (p < fin){
      t += vlq();
      let s = o[p];
      if (s & 0x80){ p++; if (s < 0xf0) statut = s; } else s = statut;   // statut courant
      if (s === 0xff){
        const type = o[p++], n = vlq(), a = p;
        if (type === 0x51 && n === 3) tempos.push({ t, uspq:o[a] << 16 | o[a + 1] << 8 | o[a + 2] });
        else if (type === 0x58 && n >= 2) mesures.push({ t, num:o[a], den:2 ** o[a + 1] });
        else if (type === 0x59 && n >= 2) armures.push({ t, sf:(o[a] << 24) >> 24, mineur:o[a + 1] === 1 });
        else if (type === 0x03 && !piste.nom) piste.nom = texte(a, n).trim();
        p = a + n;
      } else if (s === 0xf0 || s === 0xf7){
        p += vlq();
      } else {
        const type = s & 0xf0, canal = s & 0x0f;
        const d1 = o[p++], d2 = (type === 0xc0 || type === 0xd0) ? 0 : o[p++];
        if (canal === 9) continue;                                           // batterie
        const cle = canal * 128 + d1;
        if (type === 0x90 && d2 > 0){
          if (ouvertes.has(cle)) ouvertes.get(cle).fin = t;
          const n = { midi:d1, debut:t, fin:null };
          piste.notes.push(n); ouvertes.set(cle, n);
        } else if (type === 0x80 || type === 0x90){
          const n = ouvertes.get(cle);
          if (n){ n.fin = t; ouvertes.delete(cle); }
        }
      }
    }
    for (const n of ouvertes.values()) n.fin = t;
    p = fin;
    pistes.push(piste);
  }
  return { format, division, pistes, tempos, mesures, armures };
}

/* ---------- conversion en morceau ---------- */
const decouper = d => {                         // une durée → valeurs permises (plus grande d'abord)
  const r = [];
  let reste = Math.round(d * 4) / 4;
  while (reste > 1e-6){
    const v = VALEURS_MIDI.find(x => x <= reste + 1e-6);
    r.push(v); reste -= v;
  }
  return r;
};

export function versMorceau(m, nomFichier = 'Partition'){
  const div = m.division || 480;
  const q = tick => Math.round(tick / div * 4) / 4;           // en noires, à la double croche près
  const sig0 = m.mesures.sort((a, b) => a.t - b.t)[0];
  const num = sig0 ? sig0.num : 4, den = sig0 ? sig0.den : 4;
  const beats = num * 4 / den;
  const tempo0 = m.tempos.sort((a, b) => a.t - b.t)[0];
  const bpm = Math.max(30, Math.min(240, Math.round(tempo0 ? 60e6 / tempo0.uspq : 120)));
  const arm = m.armures.sort((a, b) => a.t - b.t)[0];
  const armure = arm ? (arm.mineur ? ARMURES_MIN[arm.sf] : ARMURES_MAJ[arm.sf]) || 'C' : 'C';
  const noms = arm && arm.sf < 0 ? NOMS_B : NOMS_D;
  const nom = midi => noms[midi % 12] + (Math.floor(midi / 12) - 1);

  // répartition des mains
  const avecNotes = m.pistes.filter(p => p.notes.length);
  if (!avecNotes.length) throw new Error('Aucune note de piano dans ce fichier.');
  const moyenne = p => p.notes.reduce((s, n) => s + n.midi, 0) / p.notes.length;
  const notes = [];
  if (avecNotes.length === 1){
    for (const n of avecNotes[0].notes) notes.push({ ...n, main:n.midi >= 60 ? 'D' : 'G' });
  } else {
    const triees = [...avecNotes].sort((a, b) => moyenne(b) - moyenne(a));
    const seuil = (moyenne(triees[0]) + moyenne(triees[triees.length - 1])) / 2;
    triees.forEach((p, i) => {
      const main = i === 0 ? 'D' : i === triees.length - 1 ? 'G' : (moyenne(p) >= seuil ? 'D' : 'G');
      for (const n of p.notes) notes.push({ ...n, main });
    });
  }
  const plage = n => n.midi >= 21 && n.midi <= 108;
  const t0 = Math.floor(Math.min(...notes.map(n => q(n.debut))) / beats) * beats;   // saute les mesures vides du début
  const evts = { D:new Map(), G:new Map() };
  let finMax = 0;
  for (const n of notes.filter(plage)){
    const t = q(n.debut) - t0;
    const f = Math.max(t + 0.25, q(n.fin ?? n.debut) - t0);
    const m2 = evts[n.main];
    if (!m2.has(t)) m2.set(t, { t, midis:new Set(), fin:0 });
    const e = m2.get(t);
    e.midis.add(n.midi); e.fin = Math.max(e.fin, f);
    finMax = Math.max(finMax, t + 0.25);
  }
  const nbMesures = Math.max(1, Math.ceil(finMax / beats - 1e-9));

  const ecrireMain = main => {
    const liste = [...evts[main].values()].sort((a, b) => a.t - b.t);
    const silences = d => decouper(d).map(v => `r:${v}`);
    const mesures = [];
    let k = 0;
    for (let mes = 0; mes < nbMesures; mes++){
      const a = mes * beats, b = a + beats, jetons = [];
      let c = a;
      while (k < liste.length && liste[k].t < b - 1e-9){
        const e = liste[k], suivant = liste[k + 1];
        if (e.t > c) jetons.push(...silences(e.t - c));
        const fin = Math.min(e.fin, suivant ? suivant.t : Infinity, b);
        const morceaux = decouper(fin - e.t);
        const accord = [...e.midis].sort((x, y) => x - y).map(nom).join('+');
        jetons.push(`${accord}:${morceaux[0]}`, ...morceaux.slice(1).map(v => `r:${v}`));
        c = e.t + morceaux.reduce((s, v) => s + v, 0);
        k++;
      }
      if (c < b - 1e-9) jetons.push(...silences(b - c));
      mesures.push(jetons.join(' '));
    }
    return mesures;
  };
  const d = ecrireMain('D'), g = ecrireMain('G');
  const sections = [];
  const PAR = 8;
  for (let i = 0; i < nbMesures; i += PAR){
    const j = Math.min(nbMesures, i + PAR);
    sections.push({ nom:nbMesures > PAR ? `Mes. ${i + 1}–${j}` : '', d:d.slice(i, j).join(' | '), g:g.slice(i, j).join(' | ') });
  }
  const titre = nomFichier.replace(/\.(mid|midi|kar)$/i, '').replace(/[_]+/g, ' ').trim() || 'Partition';
  return {
    id:'imp-' + Date.now().toString(36), titre, artiste:'Fichier MIDI',
    annee:new Date().toLocaleDateString('fr-FR'), style:'Import', type:'import', niveau:3,
    tempo:bpm, sig:`${num}/${den}`, armure, sections,
    desc:`Importé depuis « ${nomFichier} » : ${nbMesures} mesures, ${notes.filter(plage).length} notes.`,
    astuce:"Choisis une partie de 8 mesures au-dessus de la partition et travaille-la seule, lentement."
  };
}
