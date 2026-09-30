/* Teste l'analyseur de notes sur des enregistrements synthétiques (outils/synthese_piano.py),
 * sans navigateur : FFT de 8192 points à fenêtre de Blackman, comme AnalyserNode.
 * Usage : node outils/test_ecoute.mjs dossier [nom] */
import fs from 'fs';
import { Analyseur, NMIN } from '../js/ecoute.js';

const dossier = process.argv[2];
const noms = process.argv[3] ? [process.argv[3]] : ['notes', 'notes-doux', 'accords'];
const FFT = 8192, PAS = 0.033;

function lireWav(chemin){
  const b = fs.readFileSync(chemin);
  const fs_ = b.readUInt32LE(24), data = 44;
  const n = (b.length - data) / 2, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(data + 2 * i) / 32768;
  return { fs:fs_, x };
}
function fft(re, im){
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++){ let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1){
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len){
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++){
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const fenetre = new Float32Array(FFT).map((_, i) => 0.42 - 0.5 * Math.cos(2 * Math.PI * i / FFT) + 0.08 * Math.cos(4 * Math.PI * i / FFT));

function spectre(x, fin){
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  for (let i = 0; i < FFT; i++){ const k = fin - FFT + i; re[i] = k >= 0 ? x[k] * fenetre[i] : 0; }
  fft(re, im);
  const db = new Float32Array(FFT / 2);
  for (let k = 0; k < FFT / 2; k++) db[k] = 20 * Math.log10(Math.max(1e-12, Math.hypot(re[k], im[k]) / FFT));
  return db;
}

let tout = { rappel:0, attendues:0, faux:0, presence:0, attPresence:0 };
for (const nom of noms){
  const { fs:sr, x } = lireWav(`${dossier}/${nom}.wav`);
  const verite = JSON.parse(fs.readFileSync(`${dossier}/${nom}.json`));
  const an = new Analyseur(sr, FFT);
  const frames = [];
  for (let t = FFT / sr; t < x.length / sr - 0.05; t += PAS){
    const r = an.analyser(spectre(x, Math.round(t * sr)));
    frames.push({ t, notes:new Set(r.notes.map(n => n.n)), attaques:r.attaques.map(a => a.n), nettes:r.nettes.map(a => a.n), niveau:r.niveau });
  }
  // rappel : chaque frappe a-t-elle une attaque de cette note dans [t-0.06, t+0.45] ?
  const manquees = [];
  for (const e of verite){
    const ok = frames.some(f => f.t >= e.t - 0.06 && f.t <= e.t + 0.45 && f.attaques.includes(e.midi));
    if (!ok) manquees.push(e);
  }
  // fausses attaques : attaque d'une note qui n'est ni jouée ni harmonique d'une note qui sonne
  const fausses = [];
  for (const f of frames) for (const n of f.nettes){
    const sonne = verite.filter(e => f.t >= e.t - 0.06 && f.t <= e.t + e.duree + 0.3).map(e => e.midi);
    const juste = verite.some(e => e.midi === n && f.t >= e.t - 0.12 && f.t <= e.t + 0.6);
    if (!juste && !Analyseur.estHarmonique(n, sonne) && !fausses.some(z => z.n === n && Math.abs(z.t - f.t) < 0.3)) fausses.push({ t:+f.t.toFixed(2), n });
  }
  // présence : pendant la tenue (t+0.25 … t+durée-0.1), la note est-elle détectée ?
  let pres = 0, tot = 0; const absentes = [];
  for (const e of verite){
    const fr = frames.filter(f => f.t >= e.t + 0.25 && f.t <= e.t + e.duree - 0.05);
    if (!fr.length) continue;
    const part = fr.filter(f => f.notes.has(e.midi)).length / fr.length;
    tot++; if (part >= 0.6) pres++; else absentes.push(`${e.midi}@${e.t}(${Math.round(part * 100)}%)`);
  }
  console.log(`\n== ${nom} : ${verite.length} frappes`);
  console.log(`   attaques trouvées : ${verite.length - manquees.length}/${verite.length}` + (manquees.length ? '  manquées : ' + manquees.map(e => `${e.midi}@${e.t}`).join(' ') : ''));
  console.log(`   fausses attaques : ${fausses.length}` + (fausses.length ? '  ' + fausses.slice(0, 12).map(z => `${z.n}@${z.t}`).join(' ') : ''));
  // rappel des attaques nettes
  const manqueesNettes = verite.filter(e => !frames.some(f => f.t >= e.t - 0.06 && f.t <= e.t + 0.5 && f.nettes.includes(e.midi)));
  console.log(`   attaques NETTES trouvées : ${verite.length - manqueesNettes.length}/${verite.length}` + (manqueesNettes.length ? '  manquées : ' + manqueesNettes.map(e => `${e.midi}@${e.t}`).join(' ') : ''));
  // notes fantômes dans la détection libre (hors harmoniques) pendant les tenues
  const fant = {};
  let nFr = 0;
  for (const f of frames){
    const sonne = verite.filter(e => f.t >= e.t + 0.1 && f.t <= e.t + e.duree + 0.2).map(e => e.midi);
    if (!sonne.length) continue;
    nFr++;
    for (const n of f.notes) if (!sonne.includes(n) && !Analyseur.estHarmonique(n, sonne)) fant[n] = (fant[n] || 0) + 1;
  }
  const liste = Object.entries(fant).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([n, c]) => `${n}:${c}`);
  console.log(`   fantômes (images avec note non jouée / ${nFr}) : ${Object.values(fant).reduce((a, b) => a + b, 0)}  ${liste.join(' ')}`);
  console.log(`   notes détectées pendant la tenue : ${pres}/${tot}` + (absentes.length ? '  absentes : ' + absentes.join(' ') : ''));
  tout.attendues += verite.length; tout.rappel += verite.length - manquees.length; tout.faux += fausses.length;
}
console.log(`\nTOTAL attaques ${tout.rappel}/${tout.attendues}, fausses ${tout.faux}`);
