/* Partition à défilement : une seule ligne, clés et armure fixes à gauche, les notes arrivent
 * vers un curseur. Portée de sol pour la main droite, portée de fa pour la main gauche
 * (une seule portée si une seule main joue). Dessinée en SVG ; chaque accord porte l'état
 * « à jouer », « juste » ou « faux » par une classe CSS. */
import { armureDe, LETTRES } from './notes.js';
import { GLYPHES } from './glyphes.js';

const NS = 'http://www.w3.org/2000/svg';
const S = 10;                        // une interligne
const K = S / 250;                   // échelle des glyphes (250 unités = 1 interligne)
const LARG_TETE = 11.6;
const FIN_TETE = 1.0;

function el(nom, attrs, parent){
  const e = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/* glyphe centré en (x, y) — ou posé avec son origine en (x, y) si centre = false */
function glyphe(nom, parent, x, y, { centre = true, k = K, classe = '', miroir = false } = {}){
  const g = GLYPHES[nom];
  const cx = centre ? (g.x0 + g.x1) / 2 : 0, cy = centre ? (g.y0 + g.y1) / 2 : 0;
  return el('path', { d:g.d, class:classe,
    transform:`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k} ${miroir ? -k : k}) translate(${-cx} ${-cy})` }, parent);
}

/* ---------- géométrie des portées ---------- */
const PORTEES = {
  sol:{ bas:30, milieu:34, haut:38, dieses:[38, 35, 39, 36, 33, 37, 34], bemols:[34, 37, 33, 36, 32, 35, 31] },
  fa: { bas:18, milieu:22, haut:26, dieses:[24, 21, 25, 22, 19, 23, 20], bemols:[20, 23, 19, 22, 18, 21, 17] }
};
const DUREES_SILENCE = [4, 2, 1, 0.5, 0.25];

function decouperSilence(longueur){
  const out = [];
  let reste = longueur;
  for (const d of DUREES_SILENCE) while (reste >= d - 1e-6){ out.push(d); reste -= d; }
  return out;
}

export function creerPartition(morceau, { noms = false } = {}){
  const { notes, beats, armure } = morceau;
  const arm = armureDe(armure);
  const aSol = morceau.mains.D || !morceau.mains.G;
  const aFa = morceau.mains.G;
  const dnDe = main => { const l = notes.filter(n => n.main === main).map(n => n.dn); return l.length ? [Math.min(...l), Math.max(...l)] : null; };
  const rgD = dnDe('D'), rgG = dnDe('G');
  const aDoigts = main => notes.some(n => n.main === main && n.doigt);
  const bande = 14;                                   // étiquette des doigts

  // ---- hauteurs ----
  let y = 18 + (aDoigts('D') ? bande : 6);
  const margeHaut = S * Math.max(1.6, rgD ? (rgD[1] - 38) / 2 + 1.2 : 1.6);
  const solHaut = y + margeHaut;
  const solBas = solHaut + 4 * S;
  let faHaut = 0, faBas = 0;
  if (aFa){
    const dessous = S * Math.max(1.4, rgD && aSol ? (30 - rgD[0]) / 2 + 0.9 : 1.4);
    const dessus = S * Math.max(1.4, rgG ? (rgG[1] - 26) / 2 + 0.9 : 1.4);
    faHaut = aSol ? solBas + Math.max(dessous + dessus, 3 * S) : y + S * Math.max(1.6, rgG ? (rgG[1] - 26) / 2 + 1.2 : 1.6);
    faBas = faHaut + 4 * S;
  }
  const pasDeSol = !aSol;
  const yHautGlobal = pasDeSol ? faHaut : solHaut;
  const yBasGlobal = aFa ? faBas : solBas;
  const basPortee = aFa ? faBas : solBas;
  const margeBas = aFa
    ? S * Math.max(1.4, rgG ? (18 - rgG[0]) / 2 + 1.2 : 1.4) + (aDoigts('G') ? bande : 4)
    : S * Math.max(1.4, rgD ? (30 - rgD[0]) / 2 + 1.2 : 1.4) + (aDoigts('D') ? 0 : 4);
  const hauteur = Math.ceil(basPortee + margeBas);
  const yDe = (dn, portee) => (portee === 'sol' ? solBas - (dn - 30) * S / 2 : faBas - (dn - 18) * S / 2);
  const porteeDe = main => (main === 'D' ? (aSol ? 'sol' : 'fa') : (aFa ? 'fa' : 'sol'));

  // ---- largeurs ----
  const dmin = Math.min(...notes.map(n => n.d), 1);
  const bw = dmin <= 0.25 ? 82 : dmin <= 0.5 ? 66 : 60;      // largeur d'un temps
  const PAD = 16;
  const mesureX = [];
  let x = 14;
  for (let m = 0; m < morceau.mesures; m++){ mesureX.push(x); x += PAD + beats * bw + 6; }
  const largeurPiste = x + 40;
  const xDeTemps = t => {
    const m = Math.min(morceau.mesures - 1, Math.max(0, Math.floor(t / beats + 1e-9)));
    return mesureX[m] + PAD + (t - m * beats) * bw;
  };
  const groupeTemps = /^(6|9|12|3)\/8$/.test(morceau.sig) ? 1.5 : 1;

  // ---- en-tête fixe ----
  const nb = Math.abs(arm.n);
  const xArmure = 34, xSig = xArmure + nb * 9 + 6, largeurEntete = xSig + 26;
  const entete = el('svg', { class:'p-svg p-entete-svg', viewBox:`0 0 ${largeurEntete} ${hauteur}`, 'aria-hidden':'true' });
  const piste = el('svg', { class:'p-svg p-piste-svg', viewBox:`0 0 ${largeurPiste} ${hauteur}`, 'aria-hidden':'true' });

  const lignesPortee = (svg, portee, bas, x0, x1) => {
    for (let i = 0; i < 5; i++) el('line', { x1:x0, x2:x1, y1:bas - i * S, y2:bas - i * S, class:'ligne' }, svg);
  };
  if (aSol){ lignesPortee(entete, 'sol', solBas, 6, largeurEntete); lignesPortee(piste, 'sol', solBas, 0, largeurPiste); }
  if (aFa){ lignesPortee(entete, 'fa', faBas, 6, largeurEntete); lignesPortee(piste, 'fa', faBas, 0, largeurPiste); }
  if (aSol && aFa) el('line', { x1:6, x2:6, y1:solHaut, y2:faBas, class:'barre' }, entete);
  if (aSol){
    glyphe('sol', entete, 10, solBas - S, { centre:false, classe:'cle' });
    // dans la police, l'origine de la clé de sol est sur la ligne du sol
  }
  if (aFa) glyphe('fa', entete, 10, faBas - 2 * S + 0, { centre:false, classe:'cle' });
  const armurePortee = (portee, bas) => {
    const p = PORTEES[portee];
    const liste = arm.n > 0 ? p.dieses : p.bemols;
    for (let i = 0; i < nb; i++){
      const yy = bas - (liste[i] - p.bas) * S / 2;
      glyphe(arm.n > 0 ? 'dieze' : 'bemol', entete, xArmure + i * 9 + 4, yy, { classe:'alt' });
    }
  };
  if (aSol) armurePortee('sol', solBas);
  if (aFa) armurePortee('fa', faBas);
  const [nsig, dsig] = morceau.sig.split('/');
  const signe = (haut, bas) => {
    for (const [txt, yy] of [[nsig, haut + 2 * S - 1], [dsig, haut + 4 * S - 1]])
      el('text', { x:xSig + 8, y:yy, 'text-anchor':'middle', class:'sig' }, entete).textContent = txt;
  };
  if (aSol) signe(solHaut);
  if (aFa) signe(faHaut);

  // ---- mesures : barres, numéros, sections ----
  const barre = (svg, xx, epais = false) => {
    if (aSol && aFa) el('line', { x1:xx, x2:xx, y1:solHaut, y2:faBas, class:'barre' + (epais ? ' fin' : '') }, svg);
    else el('line', { x1:xx, x2:xx, y1:aSol ? solHaut : faHaut, y2:aSol ? solBas : faBas, class:'barre' + (epais ? ' fin' : '') }, svg);
  };
  for (let m = 0; m < morceau.mesures; m++){
    const xf = m + 1 < morceau.mesures ? mesureX[m + 1] - 3 : largeurPiste - 34;
    if (m + 1 < morceau.mesures) barre(piste, xf);
    const num = el('text', { x:mesureX[m] + 4, y:(pasDeSol ? faHaut : solHaut) - 8, class:'num-mesure' }, piste);
    num.textContent = m + 1;
  }
  barre(piste, largeurPiste - 34); barre(piste, largeurPiste - 30, true);
  for (const s of morceau.sections){
    if (!s.nom) continue;
    const m0 = Math.round(s.debut / beats);
    const gr = el('g', { class:'section' }, piste);
    const t = el('text', { x:mesureX[m0] + 8, y:12, class:'sec-txt' }, gr);
    t.textContent = s.nom + (s.fois > 1 ? ` ×${s.fois}` : '');
    const w = t.getComputedTextLength ? 0 : 0;
    el('line', { x1:mesureX[m0] + 2, x2:mesureX[m0] + 2, y1:4, y2:(pasDeSol ? faHaut : solHaut) - 10, class:'sec-trait' }, gr);
  }

  // ---- accords : une main, un instant ----
  const accords = [];
  for (const e of morceau.etapes){
    for (const main of ['D', 'G']){
      const ns = e.notes.filter(n => n.main === main);
      if (ns.length) accords.push({ etape:e.i, main, t:e.t, d:ns[0].d, notes:[...ns].sort((a, b) => a.dn - b.dn || a.midi - b.midi) });
    }
  }
  const parMain = { D:accords.filter(a => a.main === 'D'), G:accords.filter(a => a.main === 'G') };

  // silences
  for (const main of ['D', 'G']){
    if ((main === 'D' && !aSol && !aFa) || (main === 'G' && !aFa)) continue;
    if (main === 'D' && !aSol) continue;
    const portee = porteeDe(main);
    const milieu = yDe(PORTEES[portee].milieu, portee);
    const liste = parMain[main];
    for (let m = 0; m < morceau.mesures; m++){
      const m0 = m * beats, m1 = m0 + beats;
      let curseur = m0;
      const dansMesure = liste.filter(a => a.t >= m0 - 1e-6 && a.t < m1 - 1e-6);
      const trous = [];
      for (const a of dansMesure){ if (a.t > curseur + 1e-6) trous.push([curseur, a.t]); curseur = Math.max(curseur, a.t + a.d); }
      if (curseur < m1 - 1e-6) trous.push([curseur, m1]);
      for (const [a, b] of trous){
        if (!dansMesure.length){ silenceBarre(piste, portee, mesureX[m] + PAD + beats * bw / 2 - 6, beats >= 4 ? 'ronde' : 'ronde'); continue; }
        let tt = a;
        for (const d of decouperSilence(b - a)){ dessinerSilence(piste, d, xDeTemps(tt) + 2, milieu, portee); tt += d; }
      }
    }
  }
  function silenceBarre(svg, portee, xx){
    const haut = yDe(PORTEES[portee].haut - 2, portee);      // sous la 4e ligne
    el('rect', { x:xx, y:haut, width:12, height:S * 0.5, class:'silence' }, svg);
  }
  function dessinerSilence(svg, d, xx, milieu, portee){
    if (d >= 4) el('rect', { x:xx - 1, y:yDe(PORTEES[portee].haut - 2, portee), width:12, height:S * 0.5, class:'silence' }, svg);
    else if (d >= 2) el('rect', { x:xx - 1, y:milieu - S * 0.5, width:12, height:S * 0.5, class:'silence' }, svg);
    else if (d >= 1) glyphe('soupir', svg, xx + 4, milieu, { classe:'silence' });
    else if (d >= 0.5) glyphe('demisoupir', svg, xx + 4, milieu - 2, { classe:'silence' });
    else glyphe('demisoupir', svg, xx + 4, milieu - 2, { classe:'silence' });
  }

  // ---- groupes de croches (liaisons) ----
  const groupes = new Map();       // accord → groupe
  for (const main of ['D', 'G']){
    const liste = parMain[main];
    let courant = [];
    const clore = () => { if (courant.length >= 2) courant.forEach(a => groupes.set(a, courant)); courant = []; };
    for (const a of liste){
      const rapide = a.d <= 0.5 + 1e-6;
      const prev = courant[courant.length - 1];
      const memeGroupe = prev && Math.abs(prev.t + prev.d - a.t) < 1e-6 &&
        Math.floor((prev.t + 1e-6) / groupeTemps) === Math.floor((a.t + 1e-6) / groupeTemps);
      if (rapide && (!prev || memeGroupe)) courant.push(a); else { clore(); if (rapide) courant.push(a); }
    }
    clore();
  }

  // ---- dessin des notes ----
  const pistes = [];
  const teteParNote = new Map();
  const accParEtape = new Map();
  for (const a of accords){
    const portee = porteeDe(a.main);
    const P = PORTEES[portee];
    const xc = xDeTemps(a.t) + LARG_TETE / 2;
    const gAcc = el('g', { class:`acc main-${a.main}`, 'data-etape':a.etape }, piste);
    (accParEtape.get(a.etape) || accParEtape.set(a.etape, []).get(a.etape)).push(gAcc);
    a.g = gAcc;
    const dns = a.notes.map(n => n.dn);
    const dist = (P.milieu - Math.min(...dns)) - (Math.max(...dns) - P.milieu);
    const gr = groupes.get(a);
    let haut;
    if (gr){
      const somme = gr.reduce((s, c) => s + c.notes.reduce((t, n) => t + (P.milieu - n.dn), 0) / c.notes.length, 0);
      haut = somme >= 0;
    } else haut = dist >= 0;
    a.haut = haut;
    a.xc = xc;
    const sansHampe = a.d >= 4;
    // têtes
    let precedent = null;
    const ordre = haut ? [...a.notes] : [...a.notes].reverse();
    a.tetes = [];
    for (const n of ordre){
      const dec = precedent && Math.abs(precedent.dn - n.dn) === 1 && !precedent.decale;
      n.decale = !!dec;
      precedent = n;
      const yy = yDe(n.dn, portee);
      const xx = xc + (dec ? (haut ? 1 : -1) * LARG_TETE * 0.98 : 0);
      const gn = el('g', { class:'nt', 'data-i':n.i, 'data-midi':n.midi }, gAcc);
      teteParNote.set(n.i, gn);
      const nomTete = a.d >= 4 ? 'ronde' : a.d >= 2 ? 'tetevide' : 'tete';
      glyphe(nomTete, gn, xx, yy, { classe:'tete' });
      n.x = xx; n.y = yy;
      a.tetes.push(n);
      // lignes supplémentaires
      const lignes = [];
      if (n.dn > P.haut) for (let d = P.haut + 2; d <= n.dn; d += 2) lignes.push(d);
      if (n.dn < P.bas) for (let d = P.bas - 2; d >= n.dn; d -= 2) lignes.push(d);
      for (const d of lignes) el('line', { x1:xx - LARG_TETE * 0.85, x2:xx + LARG_TETE * 0.85, y1:yDe(d, portee), y2:yDe(d, portee), class:'ligne sup' }, gAcc);
      // point
      if ([3, 1.5, 0.75].includes(a.d)){
        const ligne = n.dn % 2 === 0;
        el('circle', { cx:xx + LARG_TETE / 2 + 3.4, cy:yy - (ligne ? S / 2 : 0), r:1.3, class:'point-duree' }, gn);
      }
    }
    // altérations : a-t-on besoin d'un signe ?
    a.signes = [];
  }

  // altérations (signe à afficher selon l'armure et les altérations déjà posées dans la mesure)
  for (const main of ['D', 'G']){
    const etat = new Map();
    let mesureEnCours = -1;
    for (const a of parMain[main]){
      const m = Math.floor(a.t / beats + 1e-9);
      if (m !== mesureEnCours){ etat.clear(); mesureEnCours = m; }
      const aAfficher = [];
      for (const n of a.notes){
        const cle = n.lettre + n.oct;
        const courant = etat.has(cle) ? etat.get(cle) : (arm.alt[n.lettre] || 0);
        if (n.alt !== courant){ aAfficher.push(n); etat.set(cle, n.alt); }
      }
      aAfficher.sort((p, q) => q.dn - p.dn);
      let colonne = 0;
      for (const n of aAfficher){
        const nom = n.alt > 0 ? 'dieze' : n.alt < 0 ? 'bemol' : 'becarre';
        const dec = n.decale && !a.haut ? LARG_TETE : 0;
        glyphe(nom, teteParNote.get(n.i), n.x - LARG_TETE / 2 - 5.5 - colonne * 8 - dec, n.y, { classe:'alt' });
        colonne = (colonne + 1) % 3;
      }
    }
  }

  // hampes, crochets, liaisons
  const hampeX = a => a.haut ? a.xc + LARG_TETE / 2 - 0.6 : a.xc - LARG_TETE / 2 + 0.6;
  const extremes = a => ({ yHaut:Math.min(...a.tetes.map(n => n.y)), yBas:Math.max(...a.tetes.map(n => n.y)) });
  const dejaDessines = new Set();
  for (const a of accords){
    if (a.d >= 4) continue;
    const portee = porteeDe(a.main);
    const milieu = yDe(PORTEES[portee].milieu, portee);
    const gr = groupes.get(a);
    const { yHaut, yBas } = extremes(a);
    const xs = hampeX(a);
    if (gr){
      if (dejaDessines.has(gr)) continue;
      dejaDessines.add(gr);
      const haut = gr[0].haut;
      const longueur = 3.4 * S;
      const bout = haut ? Math.min(...gr.map(c => extremes(c).yHaut)) - longueur
                        : Math.max(...gr.map(c => extremes(c).yBas)) + longueur;
      const boutFinal = haut ? Math.min(bout, milieu) : Math.max(bout, milieu);
      for (const c of gr){
        const e = extremes(c);
        const x0 = hampeX(c);
        el('line', { x1:x0, x2:x0, y1:haut ? e.yBas : e.yHaut, y2:boutFinal, class:'hampe' }, c.g);
      }
      const gb = el('g', { class:'liaison' }, gr[0].g);
      const epais = 4.2, ecart = 6.4;
      const x1 = hampeX(gr[0]) - 0.6, x2 = hampeX(gr[gr.length - 1]) + 0.6;
      const rect = (xa, xb, niveau) => {
        const y0 = haut ? boutFinal + niveau * ecart : boutFinal - niveau * ecart - epais;
        el('rect', { x:xa, y:y0, width:Math.max(2, xb - xa), height:epais }, gb);
      };
      rect(x1, x2, 0);
      // deuxième barre pour les doubles croches
      let i = 0;
      while (i < gr.length){
        if (gr[i].d > 0.25 + 1e-6){ i++; continue; }
        let j = i;
        while (j + 1 < gr.length && gr[j + 1].d <= 0.25 + 1e-6) j++;
        if (j > i) rect(hampeX(gr[i]) - 0.6, hampeX(gr[j]) + 0.6, 1);
        else {
          const versGauche = i > 0;
          const xx = hampeX(gr[i]);
          rect(versGauche ? xx - 6 : xx, versGauche ? xx + 0.6 : xx + 6.6, 1);
        }
        i = j + 1;
      }
    } else {
      const longueur = 3.4 * S;
      const bout = a.haut ? Math.min(yHaut - longueur, milieu) : Math.max(yBas + longueur, milieu);
      el('line', { x1:xs, x2:xs, y1:a.haut ? yBas : yHaut, y2:bout, class:'hampe' }, a.g);
      if (a.d <= 0.5 + 1e-6){
        const nom = a.d <= 0.25 ? 'crochet2' : 'crochet';
        const g = GLYPHES[nom];
        const haut = a.haut;
        el('path', { d:g.d, class:'crochet',
          transform:`translate(${xs.toFixed(2)} ${bout.toFixed(2)}) scale(${K} ${haut ? K : -K}) translate(0 ${-g.y0})` }, a.g);
      }
    }
  }

  // doigts
  for (const a of accords){
    const portee = porteeDe(a.main);
    const doigts = a.notes.filter(n => n.doigt);
    if (!doigts.length) continue;
    const ordre = a.main === 'D' ? [...doigts].reverse() : doigts;
    const txt = ordre.map(n => n.doigt).join('·');
    const { yHaut, yBas } = extremes(a);
    const enHaut = a.main === 'D';
    const base = enHaut ? Math.min((portee === 'sol' ? solHaut : faHaut) - 10, yHaut - (a.haut ? 3.6 * S + 4 : 10)) : Math.max(basPortee + 12, yBas + (a.haut ? 14 : 3.6 * S + 12));
    const t = el('text', { x:a.xc, y:enHaut ? Math.max(9, base) : Math.min(hauteur - 3, base), 'text-anchor':'middle', class:'doigt' }, a.g);
    t.textContent = txt;
  }

  // ---- DOM ----
  const racine = document.createElement('div');
  racine.className = 'partition';
  const cadreEntete = document.createElement('div'); cadreEntete.className = 'p-entete';
  cadreEntete.appendChild(entete);
  const fenetre = document.createElement('div'); fenetre.className = 'p-fenetre';
  const glisse = document.createElement('div'); glisse.className = 'p-piste';
  glisse.appendChild(piste);
  const curseur = document.createElement('div'); curseur.className = 'p-curseur';
  fenetre.append(glisse, curseur);
  racine.append(cadreEntete, fenetre);

  let echelle = 1, xCurseur = 0, etapeCourante = -1;
  function dimensionner(){
    const h = racine.clientHeight || 160;
    echelle = Math.max(0.55, Math.min(1.5, h / hauteur));
    for (const [svg, w] of [[entete, largeurEntete], [piste, largeurPiste]]){
      svg.style.width = (w * echelle).toFixed(1) + 'px';
      svg.style.height = (hauteur * echelle).toFixed(1) + 'px';
    }
    cadreEntete.style.width = (largeurEntete * echelle).toFixed(1) + 'px';
    xCurseur = Math.max(40, fenetre.clientWidth * 0.26);
    curseur.style.left = xCurseur + 'px';
    glisse.style.height = (hauteur * echelle) + 'px';
    racine.style.setProperty('--echelle', echelle);
    if (etapeCourante >= 0) aller(etapeCourante, false);
  }

  function placerX(xUnites, animer){
    glisse.style.transition = animer ? 'transform .28s cubic-bezier(.3,.7,.3,1)' : 'none';
    glisse.style.transform = `translate3d(${(xCurseur - xUnites * echelle).toFixed(1)}px,0,0)`;
  }
  function aller(i, animer = true){
    etapeCourante = i;
    const e = morceau.etapes[Math.min(i, morceau.etapes.length - 1)];
    placerX(e ? xDeTemps(e.t) + LARG_TETE / 2 : 0, animer);
  }

  let cibles = [];
  function definirCible(i, defiler = true){
    for (const g of cibles) g.classList.remove('actif');
    cibles = accParEtape.get(i) || [];
    for (const g of cibles) g.classList.add('actif');
    if (i >= 0 && defiler) aller(i);
    else etapeCourante = i;
  }
  function noteEtat(idx, etat){
    const g = teteParNote.get(idx);
    if (!g) return;
    g.classList.remove('ok', 'faux');
    if (etat) g.classList.add(etat);
  }
  function etapeFaite(i){
    for (const g of accParEtape.get(i) || []) g.classList.add('faite');
    for (const n of morceau.etapes[i].notes) noteEtat(n.i, 'ok');
  }
  function reinitialiser(){
    for (const g of racine.querySelectorAll('.faite, .actif')) g.classList.remove('faite', 'actif');
    for (const g of racine.querySelectorAll('.ok, .faux')) g.classList.remove('ok', 'faux');
    cibles = [];
  }
  /* défilement continu pendant une lecture : position en temps (noires) */
  function placerAuTemps(t){ placerX(xDeTemps(t) + LARG_TETE / 2, false); }

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(dimensionner).observe(racine);
  return { racine, dimensionner, definirCible, noteEtat, etapeFaite, reinitialiser, aller, placerAuTemps, teteParNote,
    get echelle(){ return echelle; }, hauteurUnites:hauteur };
}
