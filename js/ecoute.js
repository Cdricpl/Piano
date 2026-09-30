/* Écoute du piano par le micro : quelles notes sonnent, et quand on vient d'en frapper une.
 *
 * Principe (sans IA, sans réseau) :
 *  1. le spectre du son (FFT de 8192 échantillons, ≈ 170 ms) ;
 *  2. pour chaque note du clavier, une « saillance » : l'énergie de son fondamental et de ses
 *     premiers harmoniques, comparée au bruit de fond de la pièce ;
 *  3. on retient la note la plus saillante, on efface ses harmoniques du spectre, et on recommence :
 *     les harmoniques ne sont ainsi pas prises pour des notes en plus ;
 *  4. une « attaque » = la saillance d'une note remonte d'un coup (la touche vient d'être frappée),
 *     ce qui permet de distinguer deux fois la même note, et de ne pas compter la résonance.
 *
 * Limites connues : on ne distingue pas un octave joué seul d'un octave « doublé » (on est
 * indulgent), et deux notes voisines dans le grave (< Sol3) se confondent. Tout ce qui est
 * attendu est jugé avec indulgence ; une « fausse note » n'est signalée que si elle est nette.
 */

const POIDS = [1, 0.9, 0.7, 0.55, 0.4, 0.3];
export const NMIN = 40, NMAX = 96;               // Mi2 … Do7

export class Analyseur {
  constructor(fs = 48000, fft = 8192){
    this.fs = fs; this.fft = fft;
    this.binHz = fs / fft;
    this.nBins = Math.floor(6500 / this.binHz);
    this.notes = [];
    for (let n = NMIN; n <= NMAX; n++){
      const f = 440 * Math.pow(2, (n - 69) / 12);
      const plages = [];
      for (let h = 1; h <= POIDS.length; h++){
        const fh = f * h * (1 + 0.0002 * h * h);            // léger étirement des cordes de piano
        if (fh > 6000) break;
        const lo = Math.max(1, Math.floor(fh * Math.pow(2, -0.4 / 12) / this.binHz));
        const hi = Math.min(this.nBins - 1, Math.ceil(fh * Math.pow(2, 0.4 / 12) / this.binHz));
        plages.push([lo, Math.max(lo, hi), Math.round(fh / this.binHz)]);
      }
      // zones à effacer une fois la note retenue : jusqu'au 12e harmonique
      const annul = [];
      for (let h = 1; h <= 12; h++){
        const c = Math.round(f * h * (1 + 0.0002 * h * h) / this.binHz);
        if (c + 3 >= this.nBins) break;
        annul.push(c);
      }
      this.notes.push({ n, f, plages, annul });
    }
    this.a = new Float32Array(this.nBins);
    this.res = new Float32Array(this.nBins);
    this.histo = this.notes.map(() => []);          // dernières saillances de chaque note
    this.attente = [];                               // attaques à confirmer
    this.refractaire = new Int16Array(this.notes.length);
    this.kBruitLo = Math.max(2, Math.floor(100 / this.binHz));
    this.kBruitHi = Math.floor(2500 / this.binHz);
    this.reglage = { seuil:1, minAbs:1.3e-4 };
  }

  /* saillance d'une note dans un spectre d'amplitudes */
  saillance(nt, a, bruit){
    let s = 0;
    const hv = [];
    for (let h = 0; h < nt.plages.length; h++){
      const [lo, hi] = nt.plages[h];
      let p = 0;
      for (let k = lo; k <= hi; k++) if (a[k] > p) p = a[k];
      const v = p > this.reglage.minAbs * 0.5 ? Math.max(0, Math.log2(p / bruit) - 2.4) : 0;
      hv.push(v);
      s += POIDS[h] * v;
    }
    // sans fondamental net, il faut au moins les harmoniques 2 et 3 (sinon : octave plus bas)
    const ok = hv[0] >= 1.2 || (hv[1] >= 2.2 && (hv[2] || 0) >= 1.6);
    return { s:ok ? s : 0, hv, brut:s };
  }

  /* db : spectre en dB (Float32Array, comme AnalyserNode.getFloatFrequencyData) */
  analyser(db){
    const { a, res, nBins } = this;
    for (let k = 0; k < nBins; k++) a[k] = Math.pow(10, db[k] / 20);
    // bruit de fond : médiane du spectre entre 100 et 2500 Hz
    const tranche = [];
    for (let k = this.kBruitLo; k < this.kBruitHi; k += 2) tranche.push(a[k]);
    tranche.sort((x, y) => x - y);
    const bruit = Math.max(tranche[tranche.length >> 1], 1e-6);
    const seuil = this.reglage.seuil;

    // saillance brute de chaque note (sert aux attaques et à l'indulgence)
    const s0 = this.notes.map(nt => this.saillance(nt, a, bruit).brut);

    // détection itérative avec effacement des harmoniques
    res.set(a);
    const trouvees = [];
    const SEUIL_LIBRE = 6.5 / seuil;
    for (let tour = 0; tour < 8; tour++){
      let meilleur = -1, sMax = 0, fondMax = 0;
      for (let i = 0; i < this.notes.length; i++){
        if (trouvees.some(t => t.i === i)) continue;
        const { s, hv } = this.saillance(this.notes[i], res, bruit);
        if (s > sMax){ sMax = s; meilleur = i; fondMax = hv[0]; }
      }
      if (meilleur < 0 || sMax < SEUIL_LIBRE) break;
      const nt = this.notes[meilleur];
      // fond : énergie réelle du fondamental (une « basse virtuelle » déduite des harmoniques n'en a pas)
      trouvees.push({ i:meilleur, n:nt.n, force:sMax, fond:fondMax });
      // effacer le fondamental et les harmoniques (largeur du lobe de la fenêtre : ± 3 cases)
      for (const c of nt.annul){
        const k0 = Math.max(1, c - 4), k1 = Math.min(nBins - 1, c + 4);
        for (let k = k0; k <= k1; k++) res[k] = Math.min(res[k], bruit * 1.2);
      }
    }

    // attaques : la saillance d'une note vient de bondir
    const attaques = [];
    for (let i = 0; i < this.notes.length; i++){
      const h = this.histo[i];
      const mini = h.length ? Math.min(...h) : 0;
      const maintenant = s0[i];
      if (this.refractaire[i] > 0) this.refractaire[i]--;
      else if (maintenant >= 4.5 / seuil && maintenant - mini >= 3.2 / Math.sqrt(seuil) && h.length >= 2){
        attaques.push({ i, n:this.notes[i].n, force:maintenant, saut:maintenant - mini });
        this.refractaire[i] = 8;          // une frappe s'étale sur plusieurs images : on ne la compte qu'une fois
      }
      h.push(maintenant);
      if (h.length > 6) h.shift();
    }
    // attaques « nettes » : une attaque que la détection avec effacement confirme dans les 3 images
    // suivantes (une harmonique ou une note voisine n'est pas confirmée)
    const nettes = [];
    const dansD = new Map(trouvees.map(t => [t.n, t]));
    this.attente = this.attente.filter(p => {
      const d = dansD.get(p.n);
      if (d){ nettes.push({ ...p, fond:d.fond, forceD:d.force }); return false; }
      return --p.ttl > 0;
    });
    for (const at of attaques) if (!nettes.some(x => x.n === at.n)){
      const d = dansD.get(at.n);
      if (d) nettes.push({ ...at, fond:d.fond, forceD:d.force }); else this.attente.push({ ...at, ttl:3 });
    }
    // niveau sonore (somme des amplitudes) pour détecter le silence
    let niveau = 0;
    for (let k = this.kBruitLo; k < this.kBruitHi; k++) niveau += a[k];
    return { notes:trouvees, attaques, nettes, s0, bruit, niveau:niveau / (this.kBruitHi - this.kBruitLo) / bruit };
  }

  /* harmonique d'une des notes données ? (tolérance : 0,3 demi-ton) */
  static estHarmonique(n, bases){
    for (const b of bases){
      if (b >= n) continue;
      const r = Math.pow(2, (n - b) / 12);
      for (let h = 2; h <= 8; h++) if (Math.abs(Math.log2(r / h) * 12) < 0.45) return true;
    }
    return false;
  }
}

/* ---------- le micro ---------- */
export class Ecoute {
  constructor(surFrame){
    this.surFrame = surFrame;
    this.actif = false;
    this.an = null;
    this.derniere = null;
    this.niveauMax = 0;
  }
  async demarrer(){
    if (this.actif) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('pas de micro sur cet appareil');
    this.flux = await navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1 } });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {});
    const src = this.ctx.createMediaStreamSource(this.flux);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 55;
    this.analyseur = this.ctx.createAnalyser();
    this.analyseur.fftSize = 8192;
    this.analyseur.smoothingTimeConstant = 0;
    this.analyseur.minDecibels = -120;
    src.connect(hp).connect(this.analyseur);
    this.an = new Analyseur(this.ctx.sampleRate, 8192);
    this.buf = new Float32Array(this.analyseur.frequencyBinCount);
    this.actif = true;
    this.boucle = setInterval(() => this.tick(), 33);
    return true;
  }
  reglerSeuil(v){ if (this.an) this.an.reglage.seuil = v; this.seuilVoulu = v; }
  tick(){
    if (!this.actif) return;
    this.analyseur.getFloatFrequencyData(this.buf);
    const r = this.an.analyser(this.buf);
    r.t = performance.now();
    this.derniere = r;
    this.surFrame(r);
  }
  arreter(){
    this.actif = false;
    clearInterval(this.boucle);
    if (this.flux) this.flux.getTracks().forEach(t => t.stop());
    if (this.ctx) this.ctx.close().catch(() => {});
    this.flux = this.ctx = this.analyseur = null;
  }
}
