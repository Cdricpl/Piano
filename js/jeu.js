/* Déroulé d'un exercice : trois manières de jouer.
 *   - « attente » : l'appli attend que tu joues la ou les notes affichées, puis passe à la suivante ;
 *   - « tempo »   : un métronome, la partition avance, chaque note doit tomber au bon moment ;
 *   - « demo »    : l'appli joue et montre les touches.
 * Les notes jouées arrivent de deux façons : le micro (attaques détectées par ecoute.js) ou les
 * touches de l'écran. Les deux se traitent pareil. */
import { Analyseur } from './ecoute.js';
import { jouerNote, clic, contexte, couperGroupe, horlogeLisse } from './son.js';

const pc = m => ((m % 12) + 12) % 12;

export class Jeu {
  constructor(morceau, r){
    this.m = morceau;
    this.r = r;                      // rappels : etape, juste, faux, fin, compte, etat
    this.mode = null;
    this.latence = 0.14;             // retard du micro (fenêtre d'analyse + buffers), en secondes
    this.tolerance = 1;              // 1 = normal ; >1 = plus large
  }

  /* ---------- démarrage ---------- */
  plageEtapes(debutBeat = 0, finBeat = this.m.total){
    const e = this.m.etapes;
    const a = e.findIndex(x => x.t >= debutBeat - 1e-6);
    let b = e.findIndex(x => x.t >= finBeat - 1e-6);
    if (b < 0) b = e.length;
    return [a < 0 ? e.length : a, b];
  }

  demarrerAttente(debutBeat, finBeat, { boucle = false } = {}){
    this.arreter();
    this.mode = 'attente';
    [this.debut, this.fin] = this.plageEtapes(debutBeat, finBeat);
    this.boucle = boucle;
    this.erreurs = 0; this.justes = 0; this.essais = 0;
    this.allerEtape(this.debut);
  }

  allerEtape(i){
    this.i = i;
    if (i >= this.fin){
      if (this.boucle && this.fin > this.debut){ this.r.boucle && this.r.boucle(); this.allerEtape(this.debut); return; }
      this.terminer();
      return;
    }
    const e = this.m.etapes[i];
    this.cible = e;
    this.recus = new Set();          // notes attendues déjà jouées
    this.tEtape = performance.now() / 1000;
    this.premiere = 0;
    this.r.etape && this.r.etape(i, e);
  }

  /* une note attendue vient d'être jouée */
  accepter(midi, t){
    const e = this.cible;
    if (!e || this.mode !== 'attente') return;
    (this.recentes = this.recentes || new Map()).set(pc(midi), t);
    if (!this.recus.size) this.premiere = t;
    this.recus.add(midi);
    this.r.note && this.r.note(midi, 'ok');
    if (e.midis.every(m => this.recus.has(m))){
      this.justes++;
      const i = this.i;
      this.r.juste && this.r.juste(i, e);
      this.allerEtape(i + 1);
    }
  }

  /* ---------- notes entrantes ---------- */
  /* évènement venant des touches de l'écran (ou d'un clavier MIDI) : sûr et sans retard */
  toucher(midi){
    if (this.mode === 'attente'){
      const e = this.cible;
      if (!e) return;
      const visee = e.midis.find(m => m === midi && !this.recus.has(m));
      if (visee != null) this.accepter(visee, performance.now() / 1000);
      else if (!e.midis.includes(midi)) this.fausse(midi);
    } else if (this.mode === 'tempo'){
      this.noteTempo(midi, this.temps(), 0);
    }
  }

  fausse(midi){
    const t = performance.now();
    if (this.derniereFausse && t - this.derniereFausse < 350) return;
    this.fautesPc = this.fautesPc || new Map();
    if (t - (this.fautesPc.get(pc(midi)) || -1e9) < 1400) return;        // la même note, qui résonne encore
    this.fautesPc.set(pc(midi), t);
    this.derniereFausse = t;
    this.erreurs++;
    this.r.faux && this.r.faux(midi, this.cible ? this.cible.midis : []);
  }

  /* images du micro : r = résultat de Analyseur.analyser() */
  frame(r){
    if (!this.mode || this.mode === 'demo') return;
    const t = performance.now() / 1000;
    for (const a of r.nettes) this.attaqueMicro(a, t);
  }

  attaqueMicro(a, t){
    const n = a.n;
    this.recentes = this.recentes || new Map();
    if (this.mode === 'attente'){
      const e = this.cible;
      if (!e) return;
      // attendue (à l'octave près : on est indulgent pour les octaves doublés)
      const visee = e.midis.find(m => !this.recus.has(m) && (m === n || pc(m) === pc(n) && Math.abs(m - n) % 12 === 0));
      if (visee != null){ this.accepter(visee, t); return; }
      if (this.estFausse(a, e, this.i)) this.fausse(n);
    } else if (this.mode === 'tempo'){
      this.noteTempo(n, this.temps() - this.latence, a);
    }
  }

  /* une attaque nette qui n'est pas attendue : à signaler seulement si elle est franche */
  estFausse(a, e, i){
    if (a.n > 88) return false;                                            // très aigu : clics, grincements
    const vu = this.recentes && this.recentes.get(pc(a.n));
    if (vu != null && performance.now() / 1000 - vu < 0.7) return false;   // la note qu'on vient de réussir, encore en train de sonner
    if (a.fond < 2.2 || (a.forceD || a.force) < 8.5) return false;       // pas un vrai fondamental, ou trop faible
    if (e.midis.some(m => pc(m) === pc(a.n))) return false;               // même note, autre octave
    const voisines = [];
    for (let k = Math.max(0, i - 2); k <= Math.min(this.m.etapes.length - 1, i + 1); k++) voisines.push(...this.m.etapes[k].midis);
    if (Analyseur.estHarmonique(a.n, voisines)) return false;              // harmonique d'une note qui sonne
    const precedente = i > 0 ? this.m.etapes[i - 1].midis : [];
    const recente = (performance.now() / 1000 - this.tEtape) < 2.5;
    if (recente && precedente.some(m => pc(m) === pc(a.n))) return false;                          // résonance / battement de la note d'avant
    return true;
  }

  /* ---------- mode tempo ---------- */
  demarrerTempo(debutBeat, finBeat, bpm, { compte = 4, boucle = false } = {}){
    this.arreter();
    this.mode = 'tempo';
    this.bpm = bpm;
    this.debutBeat = debutBeat; this.finBeat = finBeat;
    this.boucle = boucle;
    [this.debut, this.fin] = this.plageEtapes(debutBeat, finBeat);
    this.tour = 0;
    this.lancer(compte);
  }
  lancer(compte){
    const ctx = contexte();
    const spb = 60 / this.bpm;
    this.t0 = (ctx ? ctx.currentTime : performance.now() / 1000) + 0.2 + compte * spb;   // instant du premier temps
    this.horloge = ctx ? (() => ctx.currentTime) : (() => performance.now() / 1000);
    this.resultats = new Map();                  // étape → {vus:Set, ecart}
    this.erreurs = 0;
    this.prochainClic = 0;
    this.compte = compte;                 // tant qu'il reste le décompte
    this.compteInit = compte;
    this.clic0 = this.t0 - compte * spb;  // instant du tout premier clic
    this.nClics = 0;
    this.iMax = this.debut;
    this.enCours = true;
    this.tourClic = (this.tourClic || 0) + 1;
    this.tick();
  }
  temps(){ return this.mode === 'tempo' ? this.horloge() - this.t0 + this.debutBeat * (60 / this.bpm) : 0; }
  /* temps courant, en noires, dans le morceau */
  beat(){ return (this.horloge() - this.t0) * this.bpm / 60 + this.debutBeat; }
  /* même chose, sur l'horloge lissée : pour l'affichage */
  beatVu(){ return (horlogeLisse() - this.t0) * this.bpm / 60 + this.debutBeat; }

  tick(){
    if (!this.enCours) return;
    const spb = 60 / this.bpm;
    const maintenant = this.horloge();
    // métronome (planifié un peu à l'avance)
    const tousLesClics = Math.floor((maintenant + 0.15 - this.clic0) / spb);
    while (this.nClics <= tousLesClics){
      const tc = this.clic0 + this.nClics * spb;
      const k = this.nClics - this.compteInit;                  // < 0 pendant le décompte
      const dansCompte = k < 0;
      const accent = dansCompte ? this.nClics === 0 : k % Math.max(1, Math.round(this.m.beats)) === 0;
      if (this.clicOn || dansCompte) clic(accent, tc);
      if (dansCompte){
        const n = this.nClics, tour = this.tourClic;
        setTimeout(() => { if (this.enCours && tour === this.tourClic) this.r.compte && this.r.compte(this.compteInit - n); }, Math.max(0, (tc - maintenant) * 1000));
      }
      this.nClics++;
    }
    const b = this.beat();
    this.r.position && this.r.position(Math.max(this.debutBeat, this.beatVu()));   // pendant le décompte : on reste sur la 1re note
    if (b >= 0 && this.compte) { this.compte = 0; this.r.compte && this.r.compte(0); }
    // étapes dépassées sans être jouées
    const fen = this.fenetre();
    for (let i = this.iMax; i < this.fin; i++){
      const e = this.m.etapes[i];
      const tE = (e.t - this.debutBeat) * spb + this.t0;
      if (maintenant > tE + fen[1] + this.latence + 0.05){
        const res = this.resultats.get(i);
        if (!res || !e.midis.every(m => res.vus.has(m))) this.r.manque && this.r.manque(i, e);
        this.iMax = i + 1;
      } else break;
    }
    // cible courante : la prochaine étape non jugée
    const cibleI = Math.min(this.fin - 1, this.iMax);
    if (cibleI !== this.cibleTempo && cibleI < this.fin){ this.cibleTempo = cibleI; this.tEtape = performance.now() / 1000; this.r.etape && this.r.etape(cibleI, this.m.etapes[cibleI]); }
    if (maintenant > this.t0 + (this.finBeat - this.debutBeat) * spb + 0.25){
      if (this.boucle){
        this.tour++;
        this.r.boucle && this.r.boucle(this.bilanTempo());
        this.r.reinitialiser && this.r.reinitialiser();
        this.cibleTempo = -1;
        this.lancer(0);                  // relance sa propre minuterie
        return;
      }
      this.terminer(); return;
    }
    this.raf = requestAnimationFrame(() => this.tick());
  }
  /* fenêtre de tolérance autour d'une note, en secondes [avant, après] */
  fenetre(){
    const spb = 60 / this.bpm;
    const base = Math.max(0.16, Math.min(0.32, spb * 0.42)) * this.tolerance;
    return [-base, base * 1.5];
  }
  /* une note jouée à l'instant tJoue (en noires × durée…) pendant le mode tempo */
  noteTempo(midi, tJoue, a){
    const spb = 60 / this.bpm;
    const fen = this.fenetre();
    const bJoue = tJoue / spb;                      // en noires depuis le début du morceau
    let meilleure = null;
    for (let i = this.debut; i < this.fin; i++){
      const e = this.m.etapes[i];
      const ecart = (bJoue - e.t) * spb;           // >0 : en retard
      if (ecart < fen[0] - 0.05 || ecart > fen[1] + 0.05) continue;
      const visee = e.midis.find(m => m === midi || (a && Math.abs(m - midi) % 12 === 0 && pc(m) === pc(midi)));
      if (visee == null) continue;
      const res = this.resultats.get(i);
      if (res && res.vus.has(visee)) continue;
      if (!meilleure || Math.abs(ecart) < Math.abs(meilleure.ecart)) meilleure = { i, e, ecart, visee };
    }
    if (meilleure){
      const { i, e, ecart, visee } = meilleure;
      const res = this.resultats.get(i) || this.resultats.set(i, { vus:new Set(), ecart:0 }).get(i);
      res.vus.add(visee); res.ecart = ecart;
      (this.recentes = this.recentes || new Map()).set(pc(visee), performance.now() / 1000);
      this.r.note && this.r.note(visee, 'ok');
      if (e.midis.every(m => res.vus.has(m))) this.r.juste && this.r.juste(i, e, ecart);
    } else if (!a || this.estFausse(a, this.m.etapes[Math.max(this.debut, Math.min(this.fin - 1, this.iMax))], Math.max(this.debut, Math.min(this.fin - 1, this.iMax)))){
      this.fausse(midi);
    }
  }
  bilanTempo(){
    let justes = 0;
    const total = this.fin - this.debut;
    for (const [i, res] of this.resultats){
      const e = this.m.etapes[i];
      if (e.midis.every(m => res.vus.has(m))) justes++;
    }
    const pct = total ? Math.round(justes / total * 100) : 0;
    return { justes, total, pct, erreurs:this.erreurs, etoiles:pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0 };
  }

  /* ---------- démonstration ---------- */
  demarrerDemo(debutBeat, finBeat, bpm){
    this.arreter();
    this.mode = 'demo';
    const ctx = contexte();
    if (!ctx) return;
    const spb = 60 / bpm;
    const t0 = ctx.currentTime + 0.25;
    this.demoT0 = t0; this.demoBpm = bpm; this.demoDebut = debutBeat;
    const [a, b] = this.plageEtapes(debutBeat, finBeat);
    this.fin = b;
    this.enCours = true;
    // les notes sont confiées au son un peu à l'avance seulement (0,4 s) : un arrêt coupe tout de suite
    let aJouer = a, dernier = -1;
    const planifier = () => {
      const horizon = ctx.currentTime + 0.4;
      while (aJouer < b){
        const e = this.m.etapes[aJouer];
        const quand = t0 + (e.t - debutBeat) * spb;
        if (quand > horizon) break;
        for (const n of e.notes) jouerNote(n.midi, { duree:Math.max(0.2, n.d * spb * 0.95), force:n.main === 'G' ? 0.7 : 0.85, quand, groupe:'demo' });
        aJouer++;
      }
    };
    const boucle = () => {
      if (!this.enCours || this.mode !== 'demo') return;
      planifier();
      const b2 = (horlogeLisse() - t0) / spb + debutBeat;
      this.r.position && this.r.position(Math.max(debutBeat, b2));
      let i = a;
      while (i < b && this.m.etapes[i].t <= b2 + 1e-6) i++;
      i = Math.max(a, i - 1);
      if (b2 >= debutBeat && i !== dernier && i < b){ dernier = i; this.r.etape && this.r.etape(i, this.m.etapes[i]); }
      if (b2 > finBeat + 0.4){ this.terminer(); return; }
      this.raf = requestAnimationFrame(boucle);
    };
    // quand l'onglet est caché, requestAnimationFrame s'arrête : une minuterie continue de planifier
    this.minuterieDemo = setInterval(() => { if (this.enCours && this.mode === 'demo') planifier(); }, 200);
    boucle();
  }

  terminer(){
    const m = this.mode;
    clearInterval(this.minuterieDemo);
    const bilan = m === 'tempo' ? this.bilanTempo() : m === 'attente' ? { justes:this.justes, erreurs:this.erreurs } : {};
    this.enCours = false;
    cancelAnimationFrame(this.raf);
    this.mode = null;
    this.r.fin && this.r.fin(m, bilan);
  }
  arreter(){
    if (this.mode === 'demo') couperGroupe('demo');
    clearInterval(this.minuterieDemo);
    this.enCours = false;
    cancelAnimationFrame(this.raf);
    this.mode = null;
    this.cible = null;
  }
}
