/* Assemblage de l'interface : des écrans (accueil, listes, lecteur, « Mon micro »), navigation par l'adresse (#/…). */
import { compiler, nomNote } from './notes.js';
import { creerPartition } from './partition.js';
import { creerClavier, plageClavier } from './clavier.js';
import { initAudio, reprendreAudio, jouerNote, volume } from './son.js';
import { Ecoute } from './ecoute.js';
import { Jeu } from './jeu.js';
import { LECONS, NIVEAUX } from './lecons.js';
import { MORCEAUX, GENRES } from './morceaux.js';
import { EXERCICES, FAMILLES_EX } from './exercices.js';
import { CATEGORIES, clavierNiveau, miniPiece, miniTouches, miniVinyle } from './illustrations.js';
import * as P from './progress.js';
import { VERSION, DATE_VERSION } from './version.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ================= réglages mémorisés ================= */
const CLE_REGLAGES = 'ma-piano-reglages';
const CLE_DERNIERE = 'ma-piano-derniere';
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* mode privé */ } };
const reglages = { mode:'attente', noms:true, boucle:false, clic:true, tol:1, sens:1, vol:0.8, micro:true, ...lire(CLE_REGLAGES, {}) };
const sauverReglages = () => ecrire(CLE_REGLAGES, reglages);

$('#version').textContent = 'v' + VERSION;
$('#version-detail').textContent = `Version ${VERSION} du ${DATE_VERSION.split('-').reverse().join('/')}`;

/* ================= contenus ================= */
const NOMS_NIVEAUX = ['', 'Débutant', 'Débutant +', 'Intermédiaire', 'Confirmé', 'Avancé'];
const NIV_GRAD = [['#34d399', '#059669'], ['#38bdf8', '#2563eb'], ['#fbbf24', '#e8590c'], ['#fb923c', '#dc2626'], ['#a78bfa', '#6d28d9']];
const GRAD_EX = { gammes:['#38bdf8', '#1d4ed8'], accords:['#a78bfa', '#6d28d9'], technique:['#34d399', '#047857'] };
const gradStyle = g => `--c1:${g[0]};--c2:${g[1]}`;
const parNiveau = liste => [...liste].sort((a, b) => (a.niveau || 1) - (b.niveau || 1));
const CONSEIL = t => `<div class="tip"><span class="tip-lbl">Conseil</span><p>${t}</p></div>`;

const genreDe = m => GENRES.find(g => g.styles.includes(m.style)) || GENRES[0];
const morceauxDe = g => parNiveau(MORCEAUX.filter(m => genreDe(m) === g));
const exercicesDe = fam => parNiveau(EXERCICES.filter(e => e.famille === fam));

const LISTES = {
  lecon:    { nom:'Leçon',    items:() => LECONS,                              retour:it => '#/parcours/' + it.niveau },
  morceau:  { nom:'Morceau',  items:it => morceauxDe(genreDe(it)),             retour:it => '#/morceaux/' + genreDe(it).id },
  exercice: { nom:'Exercice', items:it => exercicesDe(it.famille),             retour:it => '#/exercices/' + it.famille }
};
const SOURCES = { lecon:LECONS, morceau:MORCEAUX, exercice:EXERCICES };
const lienJouer = (liste, it) => `#/jouer/${liste}/${encodeURIComponent(it.id)}`;
const prochaineLecon = () => LECONS.find(l => !P.estFaite(l.id)) || LECONS[LECONS.length - 1];
const titreDe = it => it.titre || it.nom;

/* un morceau compilé (mis en cache) */
const cache = new Map();
function compilerItem(it){
  if (!cache.has(it.id)){
    const c = compiler({ id:it.id, titre:titreDe(it), sig:it.sig, armure:it.armure, tempo:it.tempo,
      d:it.d, g:it.g, sections:it.sections });
    if (c.erreurs.length) console.warn('Partition invalide', c.erreurs);
    cache.set(it.id, c);
  }
  return cache.get(it.id);
}

/* ================= le micro, partagé par le lecteur et « Mon micro » ================= */
let cur = null;                  // élément en cours dans le lecteur
let clavierLibre = null;
let libreOuvert = false;
const micro = new Ecoute(frame => {
  if (libreOuvert) majLibre(frame);
  else if (cur){
    if (cur.jeu.mode !== 'demo') cur.jeu.frame(frame);
    const ens = new Set(cur.jeu.mode === 'demo' ? [] : frame.notes.filter(n => n.fond >= 1.2).map(n => n.n));
    cur.clavier.entendues(ens);
  }
});
micro.seuilVoulu = reglages.sens;

async function activerMicro(silencieux = false){
  if (micro.actif) return true;
  try {
    await micro.demarrer();
    micro.reglerSeuil(reglages.sens);
    majBoutonMicro();
    return true;
  } catch (e){
    majBoutonMicro(true);
    const texte = /denied|Permission|NotAllowed/i.test(String(e && (e.name + e.message)))
      ? "Micro refusé : autorise-le dans le navigateur, ou joue sur les touches de l'écran."
      : "Micro indisponible : joue sur les touches de l'écran.";
    if (cur) retour('info', texte, 4200);
    if (libreOuvert) $('#libre-sous').textContent = texte;
    return false;
  }
}
function couperMicro(){ micro.arreter(); majBoutonMicro(); }
function majBoutonMicro(erreur = false){
  const b = $('#btn-micro');
  b.classList.toggle('actif', micro.actif);
  b.classList.toggle('erreur', erreur && !micro.actif);
  b.setAttribute('aria-pressed', String(micro.actif));
  $('#micro-etat').textContent = micro.actif ? 'Micro activé' : erreur ? 'Micro refusé' : 'Micro';
  const l = $('#libre-micro');
  l.querySelector('span').textContent = micro.actif ? 'Couper le micro' : 'Activer le micro';
}

/* ================= navigation ================= */
function montrer(id){ for (const e of $$('.ecran')) e.hidden = e.id !== id; }

function route(){
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  fermerVolets(false);
  $('#toast').hidden = true;
  const auLecteur = parts[0] === 'jouer';
  if (!auLecteur) quitterLecteur();
  libreOuvert = parts[0] === 'libre';
  if (!libreOuvert && !auLecteur && micro.actif) couperMicro();
  switch (parts[0]){
    case 'parcours':    return parts[1] ? ecranNiveau(+parts[1]) : ecranParcours();
    case 'morceaux':    return parts[1] ? ecranGenre(parts[1]) : ecranMorceaux();
    case 'exercices':   return parts[1] ? ecranFamille(parts[1]) : ecranExercices();
    case 'progression': return ecranProgression();
    case 'libre':       return ecranLibre();
    case 'jouer':       if (ouvrir(parts[1], parts[2])) return; break;
  }
  ecranAccueil();
}
window.addEventListener('hashchange', route);

/* ================= accueil ================= */
function ecranAccueil(){
  montrer('ecran-accueil');
  const faites = P.nbFaites();
  const suivante = prochaineLecon();
  const idx = LECONS.indexOf(suivante) + 1;
  $('#parcours-resume').textContent = faites
    ? `${faites} leçon${faites > 1 ? 's' : ''} sur ${LECONS.length} terminée${faites > 1 ? 's' : ''}.`
    : `${LECONS.length} leçons pas à pas, du premier Do aux deux mains.`;
  $('#parcours-jauge').style.width = Math.round(faites / LECONS.length * 100) + '%';
  $('#cta-continuer').href = lienJouer('lecon', suivante);
  $('#cta-texte').innerHTML = `<span class="cta-verbe">${faites ? 'Continuer' : 'Commencer'} · </span>Leçon ${faites ? idx : 1}`;
  $('#compte-morceaux').textContent = `${MORCEAUX.length} titres : comptines, classiques, pop`;
  $('#compte-exercices').textContent = `${EXERCICES.length} exercices : gammes, accords, arpèges`;
  $('#compte-progression').textContent = `${faites}/${LECONS.length} leçons · ${P.minutesTotal()} min`;
  majStat();

  const nTravail = P.elementsDe('travail').filter(e => SOURCES[e.liste] && SOURCES[e.liste].some(x => x.id === e.id)).length;
  $('#pastille-travail').hidden = !nTravail;
  $('#travail-n').textContent = nTravail;
  $('#pastille-travail').title = `${nTravail} à travailler`;
  const derniere = lire(CLE_DERNIERE, null);
  const it = derniere && SOURCES[derniere.liste] && SOURCES[derniere.liste].find(x => x.id === derniere.id);
  const r = $('#reprendre');
  if (it && derniere.liste !== 'lecon'){
    r.hidden = false;
    r.href = lienJouer(derniere.liste, it);
    const nom = titreDe(it);
    r.title = 'Reprendre · ' + nom;
    const court = nom.replace(/\s*\(.*?\)/g, '').replace(/\s+—.*$/, '').trim();
    const t = $('#reprendre-texte');
    t.textContent = 'Reprendre';
    const n = document.createElement('span');
    n.className = 'reprendre-nom';
    n.textContent = ' · ' + court;
    t.appendChild(n);
    requestAnimationFrame(ajusterReprendre);
  } else r.hidden = true;
}
function ajusterReprendre(){
  const t = $('#reprendre-texte'), n = t.querySelector('.reprendre-nom');
  if (!n || !t.clientWidth) return;
  n.hidden = false;
  if (t.scrollWidth > t.clientWidth + 1) n.hidden = true;
}
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(ajusterReprendre).observe($('#reprendre').closest('.entete'));
function majStat(){
  const s = P.serie();
  $('#streak-text').textContent = `${P.minutesAujourdhui()} min` + (s > 1 ? ` · ${s} j` : '');
}
for (const [id, dessin] of Object.entries(CATEGORIES)){
  const box = $('#illus-' + id);
  if (box) box.innerHTML = dessin;
}

/* ================= écrans de liste ================= */
function ecranListe({ sur = '', titre, retour = '#/', html, sauts = [] }){
  montrer('ecran-liste');
  $('#liste-sur').textContent = sur;
  $('#liste-titre').textContent = titre;
  $('#liste-retour').href = retour;
  const corps = $('#liste-corps');
  corps.innerHTML = `<div class="bande">${html}</div>`;
  corps.scrollLeft = 0;
  const bar = $('#liste-sauts');
  bar.innerHTML = sauts.map(([id, texte, couleur]) =>
    `<button type="button" class="chip saut" data-cible="${id}" style="--c:${couleur}">${texte}</button>`).join('');
  bar.querySelectorAll('[data-cible]').forEach(b => b.addEventListener('click', () => {
    const cible = document.getElementById(b.dataset.cible);
    if (!cible) return;
    const depart = corps.scrollLeft;
    const aller = () => corps.scrollTo({ left:cible.offsetLeft - corps.offsetLeft - 4,
      behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
    aller();
    setTimeout(() => { if (corps.scrollLeft === depart) aller(); }, 350);
  }));
  document.title = titre + ' — Ma Piano';
}
$('#liste-corps').addEventListener('wheel', e => {
  const corps = e.currentTarget;
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
  const bloc = e.target.closest('.bloc-defile');
  if (bloc && bloc.scrollHeight > bloc.clientHeight) return;
  corps.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive:false });

const points = n => `<span class="niveau-points" aria-label="Niveau ${n}">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function tuile({ href, illus = '', titre, texte = '', coin = '', jauge = null, grad }){
  return `<a class="tuile" href="${href}" style="${gradStyle(grad)}">
    ${coin ? `<span class="t-coin">${coin}</span>` : ''}
    <div class="t-illus">${illus}</div>
    <h2>${titre}</h2>
    <p>${texte}</p>
    ${jauge != null ? `<div class="jauge fine"><i style="width:${jauge}%"></i></div>` : ''}
  </a>`;
}

/* pastille de statut : acquis (coche verte), à travailler (drapeau orange), à faire (cercle vide, leçons) */
function marqueStatut(st, aFaire = false){
  if (st === 'acquis') return '<span class="etat acquis" title="Acquis" aria-label="acquis"><svg class="ico"><use href="#i-coche"/></svg></span>';
  if (st === 'travail') return '<span class="etat travail" title="À travailler" aria-label="à travailler"><svg class="ico"><use href="#i-drapeau"/></svg></span>';
  return aFaire ? '<span class="etat" aria-label="à faire"></span>' : '';
}

function itemCarte({ href, num = '', nom, meta = '', niveau = 0, bpm = '', aFaire = false, classe = '', badge = '', illus = '', grad }){
  const [, , liste, id] = href.split('/');
  const st = P.statut(liste, decodeURIComponent(id || ''));
  const marque = marqueStatut(st, aFaire);
  const coin = marque.replace('class="etat', 'class="etat etat-vis');
  const visuel = illus ? `<div class="i-vis">${illus}${coin}</div>`
    : num !== '' ? `<div class="i-vis i-vis-num"><span class="i-num">${num}</span>${coin}</div>` : '';
  if (st === 'travail') classe += ' a-travailler';
  const bas = niveau || bpm || marque
    ? `<span class="i-bas">${niveau ? points(niveau) : ''}${bpm ? `<span class="bpm-pastille">${bpm}</span>` : ''}${marque.replace('class="etat', 'class="etat etat-bas')}</span>` : '';
  return `<a class="item-carte ${classe}" href="${href}" style="${gradStyle(grad)}">
    <div class="i-corps">
      ${visuel}
      <div class="i-texte">
        ${badge}
        <span class="i-nom">${nom.replace(/« /g, '« ').replace(/ »/g, ' »')}</span>
        ${meta ? `<span class="i-meta">${meta}</span>` : ''}
      </div>
      ${bas}
    </div>
  </a>`;
}

const groupe = (id, n, lot, carte, unite = 'titre') => `<section class="groupe" id="${id}">
    <div class="groupe-tete" style="${gradStyle(NIV_GRAD[n - 1])}"><span class="g-num">${n}</span><b>${NOMS_NIVEAUX[n]}</b><span>${lot.length} ${unite}${lot.length > 1 ? 's' : ''}</span></div>
    <div class="rangee">${lot.map(carte).join('')}</div>
  </section>`;
const sautsNiveaux = (liste, prefixe) => [1, 2, 3, 4, 5]
  .filter(n => liste.some(x => (x.niveau || 1) === n))
  .map(n => [prefixe + n, 'N' + n, NIV_GRAD[n - 1][1]]);

/* --- parcours --- */
function ecranParcours(){
  const suivante = prochaineLecon();
  ecranListe({
    sur:`${P.nbFaites()} / ${LECONS.length} leçons terminées`, titre:'Parcours',
    html:`<div class="rangee tuiles">${NIVEAUX.map(niv => {
      const lot = LECONS.filter(l => l.niveau === niv.n);
      const ok = lot.filter(l => P.estFaite(l.id)).length;
      const [, sous] = niv.nom.split(' — ');
      return tuile({
        href:'#/parcours/' + niv.n, illus:clavierNiveau(niv.n),
        titre:NOMS_NIVEAUX[niv.n], texte:sous || niv.nom,
        coin:`${ok}/${lot.length}${lot.includes(suivante) && ok < lot.length ? ' · en cours' : ''}`,
        jauge:Math.round(ok / lot.length * 100), grad:NIV_GRAD[niv.n - 1]
      });
    }).join('')}</div>`
  });
}
function ecranNiveau(n){
  const niv = NIVEAUX.find(x => x.n === n);
  if (!niv) return ecranParcours();
  const suivante = prochaineLecon();
  ecranListe({
    sur:`Niveau ${n} · ${niv.nom.split(' — ')[1] || ''}`, titre:NOMS_NIVEAUX[n], retour:'#/parcours',
    html:`<div class="rangee">${LECONS.filter(l => l.niveau === n).map(l => {
      const fait = P.estFaite(l.id);
      const record = P.meilleurTempo(l.id);
      return itemCarte({
        href:lienJouer('lecon', l), num:LECONS.indexOf(l) + 1, nom:l.titre,
        meta:`${l.duree}${record ? ` · record ${record} BPM` : ''}`,
        aFaire:true, classe:(fait ? 'faite' : '') + (l === suivante && !fait ? ' prochaine' : ''), grad:NIV_GRAD[n - 1],
        badge:l === suivante && !fait ? '<span class="i-tag">À toi !</span>' : ''
      });
    }).join('')}</div>`
  });
}

/* --- morceaux --- */
function ecranMorceaux(){
  ecranListe({
    sur:`${MORCEAUX.length} titres · choisis un style`, titre:'Morceaux', retour:'#/',
    html:`<div class="rangee tuiles">${GENRES.map(g => {
      const lot = morceauxDe(g);
      return tuile({ href:'#/morceaux/' + g.id, illus:miniVinyle(), titre:g.nom,
        texte:[...new Set(lot.map(m => m.artiste))].slice(0, 3).join(', '), coin:`${lot.length} titre${lot.length > 1 ? 's' : ''}`, grad:g.grad });
    }).join('')}</div>`
  });
}
function carteMorceau(m, grad){
  const c = compilerItem(m);
  return itemCarte({ href:lienJouer('morceau', m), nom:m.titre, meta:`${m.artiste} · ${m.annee}`, niveau:m.niveau,
    bpm:`${m.tempo} BPM`, illus:miniPiece(c), grad,
    badge:`<span class="cle">${m.type === 'air' ? 'mélodie' : 'accords'}</span>` });
}
function ecranGenre(id){
  const g = GENRES.find(x => x.id === id);
  if (!g) return ecranMorceaux();
  const lot = morceauxDe(g);
  let html = '';
  for (const n of [1, 2, 3, 4, 5]){
    const niv = lot.filter(m => m.niveau === n);
    if (niv.length) html += groupe('m-niv' + n, n, niv, m => carteMorceau(m, NIV_GRAD[n - 1]));
  }
  ecranListe({ sur:`Morceaux · ${lot.length} titre${lot.length > 1 ? 's' : ''}, par niveau`, titre:g.nom, retour:'#/morceaux', html, sauts:sautsNiveaux(lot, 'm-niv') });
}

/* --- exercices --- */
function ecranExercices(){
  ecranListe({
    sur:`${EXERCICES.length} exercices`, titre:'Exercices', retour:'#/',
    html:`<div class="rangee tuiles">${FAMILLES_EX.map(f => {
      const lot = exercicesDe(f.id);
      return tuile({ href:'#/exercices/' + f.id, illus:miniTouches(compilerItem(lot[0])), titre:f.nom, texte:f.desc,
        coin:`${lot.length} exercices`, grad:GRAD_EX[f.id] });
    }).join('')}</div>`
  });
}
function ecranFamille(id){
  const f = FAMILLES_EX.find(x => x.id === id);
  if (!f) return ecranExercices();
  const lot = exercicesDe(id);
  ecranListe({
    sur:'Exercices', titre:f.nom, retour:'#/exercices',
    html:`<div class="rangee">${lot.map(e => itemCarte({
      href:lienJouer('exercice', e), nom:e.nom, meta:e.style, niveau:e.niveau, bpm:`${e.tempo} BPM`,
      illus:miniTouches(compilerItem(e)), grad:GRAD_EX[id] })).join('')}</div>`
  });
}

/* --- progression --- */
function ecranProgression(){
  const hist = P.historique(21);
  const maxi = Math.max(10, ...hist.map(h => h.minutes));
  const faites = P.nbFaites();
  const jours = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const niveaux = NIVEAUX.map(niv => {
    const lot = LECONS.filter(l => l.niveau === niv.n);
    const ok = lot.filter(l => P.estFaite(l.id)).length;
    return `<div class="niv-bloc">
      <div class="niv-head"><i style="background:${NIV_GRAD[niv.n - 1][1]}"></i><b>${NOMS_NIVEAUX[niv.n]}</b><span class="muted">${ok}/${lot.length}</span></div>
      <div class="niv-lecons">${lot.map(l => {
        const bpm = P.meilleurTempo(l.id);
        return `<a class="pastille${P.estFaite(l.id) ? ' faite' : ''}" href="${lienJouer('lecon', l)}"
          title="${l.titre}${bpm ? ' — meilleur tempo : ' + bpm + ' BPM' : ''}">
          <span>${LECONS.indexOf(l) + 1}</span>${bpm ? `<em>${bpm}</em>` : ''}</a>`;
      }).join('')}</div></div>`;
  }).join('');
  const blocStatut = (s, titre, ico, vide) => {
    const l = P.elementsDe(s).map(e => ({ ...e, it:SOURCES[e.liste] && SOURCES[e.liste].find(x => x.id === e.id) })).filter(e => e.it);
    return `<div class="bloc bloc-statut bloc-defile ${s}">
      <h3><svg class="ico" aria-hidden="true"><use href="${ico}"/></svg>${titre} · ${l.length}</h3>
      ${l.length ? `<ul class="liste-statut">${l.map(e => `<li><a href="${lienJouer(e.liste, e.it)}">
          <span class="ls-cat">${LISTES[e.liste].nom}</span><span class="ls-nom">${titreDe(e.it)}</span></a></li>`).join('')}</ul>`
        : `<p class="muted small">${vide}</p>`}
    </div>`;
  };
  ecranListe({
    sur:'Enregistré sur cet appareil', titre:'Progression',
    html:`
        ${blocStatut('travail', 'À travailler', '#i-drapeau', "Rien pour l'instant. Dans le lecteur, touche le drapeau en haut pour garder un morceau ou un exercice sous la main.")}
        ${blocStatut('acquis', 'Acquis', '#i-coche', "Rien pour l'instant. Dans le lecteur, touche la coche quand tu maîtrises un morceau ou un exercice.")}
        <div class="bloc bloc-stats">
          <h3>En chiffres</h3>
          <div class="stats">
            <div class="stat"><span class="stat-n">${faites}/${LECONS.length}</span><span>leçons terminées</span></div>
            <div class="stat"><span class="stat-n">${P.minutesAujourdhui()} min</span><span>aujourd'hui</span></div>
            <div class="stat"><span class="stat-n">${P.serie()} j</span><span>jours d'affilée</span></div>
            <div class="stat"><span class="stat-n">${P.minutesTotal()} min</span><span>au total</span></div>
          </div>
        </div>
        <div class="bloc bloc-histo">
          <h3>3 dernières semaines</h3>
          <div class="barres">${hist.map(h => {
            const d = new Date(h.jour + 'T12:00:00');
            return `<span class="barre" title="${h.jour} — ${h.minutes} min"><span class="fut">
              <i style="height:${h.minutes ? Math.max(4, Math.round(h.minutes / maxi * 100)) : 0}%"></i></span><u>${jours[d.getDay()]}</u></span>`;
          }).join('')}</div>
        </div>
      <div class="bloc bloc-parcours bloc-defile">
        <h3>Parcours</h3>
        <div class="niveaux">${niveaux}</div>
        <p class="muted small">Le petit nombre est ton meilleur tempo réussi sur la leçon.</p>
        <button class="btn-plat" id="btn-reset" type="button">Effacer ma progression</button>
      </div>`
  });
  $('#btn-reset').addEventListener('click', () => {
    if (confirm('Effacer toute la progression enregistrée ?')){ P.toutEffacer(); ecranProgression(); }
  });
}

/* ================= Mon micro ================= */
function ecranLibre(){
  montrer('ecran-libre');
  document.title = 'Mon micro — Ma Piano';
  clavierLibre = creerClavier(plageClavier([48, 83]), { noms:true, surNote:async m => { await reprendreAudio(); jouerNote(m); } });
  $('#libre-clavier').innerHTML = '';
  $('#libre-clavier').appendChild(clavierLibre.racine);
  $('#libre-sens').value = reglages.sens;
  majSensLibelle();
  majBoutonMicro();
  $('#libre-note').textContent = '—';
  $('#libre-sous').textContent = micro.actif ? 'Joue une note : je te dis laquelle.' : 'Pose le téléphone près du piano, active le micro, puis joue une note.';
}
const libelleSens = v => v < 0.85 ? 'faible' : v > 1.2 ? 'élevée' : 'normale';
function majSensLibelle(){ $('#libre-sens-val').textContent = libelleSens(+$('#libre-sens').value); }
function majLibre(frame){
  const notes = frame.notes.filter(n => n.fond >= 1.2).sort((a, b) => a.n - b.n);
  $('#libre-note').textContent = notes.length ? notes.slice(0, 4).map(n => nomNote(n.n, null, true)).join(' · ') : '—';
  $('#libre-sous').textContent = notes.length ? `${notes.length} note${notes.length > 1 ? 's' : ''} entendue${notes.length > 1 ? 's' : ''}` : 'Je n\'entends pas de note pour l\'instant.';
  const niv = Math.max(0, Math.min(1, Math.log10(Math.max(1, frame.niveau)) / 2));
  $('#libre-niveau').style.width = Math.round(niv * 100) + '%';
  clavierLibre && clavierLibre.entendues(new Set(notes.map(n => n.n)));
}
$('#libre-micro').addEventListener('click', async () => {
  if (micro.actif){ couperMicro(); $('#libre-niveau').style.width = '0'; clavierLibre && clavierLibre.entendues(new Set()); }
  else { await reprendreAudio(); await activerMicro(); }
});
$('#libre-sens').addEventListener('input', e => {
  reglages.sens = +e.target.value; micro.reglerSeuil(reglages.sens); sauverReglages(); majSensLibelle();
});

/* ================= lecteur ================= */
const rappels = {
  etape(i, e){
    if (!cur) return;
    cur.partition.definirCible(i, cur.jeu.mode === 'attente');
    cur.clavier.effacerEtats();
    cur.clavier.cibler(e.notes.map(n => ({ midi:n.midi, main:n.main, doigt:n.doigt })));
  },
  note(midi){
    if (!cur) return;
    cur.clavier.etat(midi, 'ok');
    const e = cur.c.etapes[cur.jeu.mode === 'attente' ? cur.jeu.i : Math.max(0, cur.jeu.cibleTempo ?? 0)];
    const n = e && e.notes.find(x => x.midi === midi);
    if (n) cur.partition.noteEtat(n.i, 'ok');
  },
  juste(i){ if (cur) cur.partition.etapeFaite(i); },
  manque(i, e){ if (cur) for (const n of e.notes) cur.partition.noteEtat(n.i, 'faux'); },
  faux(midi, attendues){
    if (!cur) return;
    cur.clavier.etat(midi, 'faux');
    const att = attendues.map(m => nomNote(m, cur.c.notes.find(n => n.midi === m), false));
    retour('faux', `Tu as joué ${nomNote(midi, null, false)} — il faut ${[...new Set(att)].join(' + ')}`, 2200);
  },
  position(b){ if (cur) cur.partition.placerAuTemps(b); },
  compte(n){ n > 0 ? afficherCompte(n) : masquerCompte(); },
  reinitialiser(){ if (cur){ cur.partition.reinitialiser(); cur.clavier.effacerEtats(); } },
  fin(mode, bilan){
    majBoutonPlay(false);
    stopChrono();
    masquerCompte();
    if (!cur) return;
    if (mode === 'demo'){ cur.partition.reinitialiser(); debutCible(); return; }
    afficherBilan(mode, bilan);
  }
};

let minuterieRetour = null;
function retour(type, texte, ms = 2000){
  const r = $('#retour-jeu');
  r.className = 'retour-jeu ' + type;
  r.textContent = texte;
  r.hidden = false;
  clearTimeout(minuterieRetour);
  minuterieRetour = setTimeout(() => { r.hidden = true; }, ms);
}

function ouvrir(liste, id){
  const def = LISTES[liste];
  const item = def && SOURCES[liste].find(x => x.id === id);
  if (!item) return false;
  const lot = def.items(item);
  const i = lot.indexOf(item);
  const nav = (el, cible) => {
    el.href = cible ? lienJouer(liste, cible) : '#/';
    el.setAttribute('aria-disabled', cible ? 'false' : 'true');
    el.tabIndex = cible ? 0 : -1;
  };
  nav($('#j-prec'), lot[i - 1]);
  nav($('#j-suiv'), lot[i + 1]);
  $('#j-retour').href = def.retour(item);
  ecrire(CLE_DERNIERE, { liste, id });
  montrer('ecran-jouer');
  stopperJeu();
  cur = { liste, item, c:compilerItem(item), suivant:lot[i + 1], index:i, total:lot.length };
  const pos = `${def.nom} ${i + 1}/${lot.length}`;
  let sur = pos, ouvrirAide = false;
  if (liste === 'lecon'){
    P.setDerniereLecon(item.id);
    sur = `${pos} · ${NOMS_NIVEAUX[item.niveau]}`;
    ouvrirAide = !P.estFaite(item.id);
  } else if (liste === 'morceau') sur = `${item.artiste} · ${item.annee}`;
  else sur = `${pos} · ${item.style}`;
  $('#j-sur').textContent = sur;
  $('#j-titre').textContent = titreDe(item);
  $('#aide-corps').innerHTML = corpsAide(liste, item, cur.c);
  document.title = titreDe(item) + ' — Ma Piano';
  monterPiece();
  majStatutBoutons();
  if (ouvrirAide) ouvrirVolet('volet-aide', false);
  return true;
}

function corpsAide(liste, it, c){
  const badges = (...l) => `<p>${l.filter(Boolean).map(b => `<span class="badge">${b}</span>`).join('')}</p>`;
  const armure = it.armure ? ` · ${it.armure}` : '';
  if (liste === 'lecon'){
    const idx = LECONS.indexOf(it);
    return `${badges(`Leçon ${idx + 1}/${LECONS.length}`, NOMS_NIVEAUX[it.niveau], it.duree, `${it.sig} · ${it.tempo} BPM`)}
      <h2>${it.titre}</h2>
      <p class="objectif"><b>Objectif :</b> ${it.objectif}</p>
      ${it.contenu}
      ${(it.conseils || []).map(CONSEIL).join('')}
      <div class="lecon-fin">
        <label class="inter"><span>Leçon terminée</span><input type="checkbox" id="chk-faite" role="switch" ${P.estFaite(it.id) ? 'checked' : ''}><i></i></label>
        ${LECONS[idx + 1] ? `<a class="btn-plat accent" href="${lienJouer('lecon', LECONS[idx + 1])}">Leçon suivante</a>` : ''}
      </div>`;
  }
  if (liste === 'morceau'){
    const air = it.type === 'air';
    const structure = c.sections.filter(s => s.nom).map(s => `<li><b>${s.nom}</b> · ${Math.round((s.fin - s.debut) / c.beats)} mesures${s.fois > 1 ? ` (joué ${s.fois} fois)` : ''}</li>`).join('');
    return `<h2>${it.titre}</h2><p class="muted">${it.artiste}, ${it.annee}</p>
      ${badges(`Niveau ${it.niveau}`, `${it.sig} · ${it.tempo} BPM`, it.armure ? `Tonalité ${it.armure}` : 'Do majeur', air ? 'Mélodie' : 'Accords et basse')}
      <p>${it.desc}</p>${CONSEIL(it.astuce)}
      ${air ? '' : `<p class="muted small">Ce n'est pas la mélodie du morceau : ce sont ses <b>accords et sa basse</b>, simplifiés, pour accompagner ou chanter par-dessus l'enregistrement.${it.aVerifier ? ' <b>À vérifier à l\'oreille</b> : dis-moi si une note sonne faux.' : ''}</p>`}
      ${structure ? `<h3>Structure</h3><ol>${structure}</ol>` : ''}
      <p class="muted small">Choisis une partie au-dessus de la partition pour la travailler seule.</p>`;
  }
  return `<h2>${it.nom}</h2>${badges(it.style, `Niveau ${it.niveau}`, `${it.sig} · ${it.tempo} BPM`)}
    <p>${it.desc}</p>${CONSEIL(it.astuce)}
    <h3>Méthode</h3><ol><li>Mains séparées, très lentement.</li><li>Puis les deux mains, sans erreur.</li><li>Augmente le tempo de 4 BPM seulement quand c'est propre.</li></ol>`;
}

/* ---------- mise en place de la partition et du clavier ---------- */
function monterPiece(){
  const { c } = cur;
  $('#score-zone').innerHTML = '';
  cur.partition = creerPartition(c);
  $('#score-zone').appendChild(cur.partition.racine);
  cur.clavier = creerClavier(plageClavier(c.plage), { noms:reglages.noms, surNote:toucherClavier });
  $('#zone-clavier').innerHTML = '';
  $('#zone-clavier').appendChild(cur.clavier.racine);
  cur.jeu = new Jeu(c, rappels);
  cur.jeu.tolerance = reglages.tol;
  cur.jeu.clicOn = reglages.clic;
  cur.section = -1;
  $('#bilan').hidden = true;
  $('#retour-jeu').hidden = true;
  masquerCompte();
  // tempo
  const t = c.tempo;
  $('#bpm').min = 30; $('#bpm').max = Math.max(200, Math.round(t * 1.6));
  cur.bpm = t;
  $('#bpm').value = t; $('#bpm-val').textContent = t;
  // parties
  const nomees = c.sections.filter(s => s.nom);
  const bar = $('#sections-bar');
  if (nomees.length >= 1 && c.sections.length > 1){
    bar.hidden = false;
    bar.innerHTML = `<button class="chip actif" data-s="-1" type="button">Tout</button>` +
      c.sections.map((s, i) => `<button class="chip" data-s="${i}" type="button">${s.nom}${s.fois > 1 ? `<em>×${s.fois}</em>` : ''}</button>`).join('');
    bar.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => choisirSection(+b.dataset.s)));
  } else { bar.hidden = true; bar.innerHTML = ''; }
  majModes();
  majBoutonMicro();
  majBoutonPlay(false);
  requestAnimationFrame(() => { cur.partition.dimensionner(); debutCible(); });
}
function plageBeats(){
  const c = cur.c;
  if (cur.section < 0) return [0, c.total];
  const s = c.sections[cur.section];
  return [s.debut, s.debut + s.longueur];      // une seule répétition de la partie
}
function choisirSection(i){
  if (!cur) return;
  stopperJeu();
  cur.section = i;
  $$('#sections-bar .chip').forEach(b => b.classList.toggle('actif', +b.dataset.s === i));
  $('#bilan').hidden = true;
  debutCible();
}
/* montre la première note à jouer, sans rien lancer */
function debutCible(){
  if (!cur) return;
  const [a] = plageBeats();
  const k = Math.max(0, cur.c.etapes.findIndex(e => e.t >= a - 1e-6));
  cur.partition.reinitialiser();
  cur.clavier.effacerEtats();
  const e = cur.c.etapes[k];
  if (!e) return;
  cur.partition.definirCible(k);
  cur.clavier.cibler(e.notes.map(n => ({ midi:n.midi, main:n.main, doigt:n.doigt })));
}

async function toucherClavier(midi){
  await reprendreAudio();
  jouerNote(midi, { duree:0.9, force:0.8 });
  if (cur && cur.jeu && cur.jeu.mode && cur.jeu.mode !== 'demo') cur.jeu.toucher(midi);
}

/* ---------- lancer, arrêter ---------- */
async function lancer(){
  if (!cur) return;
  $('#bilan').hidden = true;
  $('#retour-jeu').hidden = true;
  cur.partition.reinitialiser();
  cur.clavier.effacerEtats();
  await reprendreAudio();
  const [a, b] = plageBeats();
  const jeu = cur.jeu;
  jeu.tolerance = reglages.tol; jeu.clicOn = reglages.clic;
  jeu.latence = micro.actif ? 0.14 : 0;
  if (reglages.mode === 'demo'){
    jeu.demarrerDemo(a, b, cur.bpm);
  } else {
    if (reglages.micro && !micro.actif) await activerMicro(true);
    jeu.latence = micro.actif ? 0.14 : 0;
    if (reglages.mode === 'attente') jeu.demarrerAttente(a, b, { boucle:reglages.boucle });
    else jeu.demarrerTempo(a, b, cur.bpm, { compte:4, boucle:reglages.boucle });
  }
  majBoutonPlay(true);
  demarrerChrono();
}
function stopperJeu(){
  if (cur && cur.jeu) cur.jeu.arreter();
  majBoutonPlay(false);
  stopChrono();
  masquerCompte();
}
function quitterLecteur(){
  if (cur){ stopperJeu(); cur = null; }
  document.title = 'Ma Piano';
}
function basculerLecture(){
  if (!cur) return;
  if (cur.jeu.mode){ stopperJeu(); cur.partition.reinitialiser(); debutCible(); }
  else lancer();
}
$('#btn-play').addEventListener('click', basculerLecture);
function majBoutonPlay(enCours){
  const b = $('#btn-play');
  b.classList.toggle('actif', enCours);
  $('#play-ico').setAttribute('href', enCours ? '#i-stop' : '#i-play');
  b.setAttribute('aria-label', enCours ? 'Arrêter' : (reglages.mode === 'demo' ? 'Écouter' : 'Commencer'));
}

/* ---------- les trois façons de jouer ---------- */
function majModes(){
  $$('#modes .seg-btn').forEach(b => {
    const on = b.dataset.mode === reglages.mode;
    b.classList.toggle('actif', on); b.setAttribute('aria-pressed', on);
  });
  $('#t-tempo').classList.toggle('cache', reglages.mode === 'attente');
  $('#btn-micro').hidden = reglages.mode === 'demo';
  majBoutonPlay(!!(cur && cur.jeu && cur.jeu.mode));
}
$$('#modes .seg-btn').forEach(b => b.addEventListener('click', () => {
  if (reglages.mode === b.dataset.mode) return;
  reglages.mode = b.dataset.mode; sauverReglages();
  if (cur){ stopperJeu(); $('#bilan').hidden = true; cur.partition.reinitialiser(); debutCible(); }
  majModes();
}));
$('#btn-micro').addEventListener('click', async () => {
  if (micro.actif){ reglages.micro = false; couperMicro(); }
  else { reglages.micro = true; await reprendreAudio(); await activerMicro(); }
  sauverReglages();
});

/* ---------- tempo ---------- */
const borne = v => Math.max(+$('#bpm').min, Math.min(+$('#bpm').max, Math.round(v)));
function poserTempo(v){
  if (!cur) return;
  cur.bpm = borne(v);
  $('#bpm').value = cur.bpm; $('#bpm-val').textContent = cur.bpm;
  if (cur.jeu.mode === 'tempo' || cur.jeu.mode === 'demo'){ stopperJeu(); cur.partition.reinitialiser(); debutCible(); }
}
$('#bpm').addEventListener('input', e => poserTempo(+e.target.value));
$('#tempo-moins').addEventListener('click', () => poserTempo(cur.bpm - 5));
$('#tempo-plus').addEventListener('click', () => poserTempo(cur.bpm + 5));
$('#tempo-reset').addEventListener('click', () => cur && poserTempo(cur.c.tempo));
$('#btn-half').addEventListener('click', () => cur && poserTempo(cur.bpm * 0.5));
$('#btn-double').addEventListener('click', () => cur && poserTempo(cur.bpm * 2));

/* ---------- décompte, bilan ---------- */
function afficherCompte(n){
  const o = $('#count-overlay');
  o.hidden = false;
  const s = o.querySelector('span');
  s.textContent = n;
  s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
}
function masquerCompte(){ $('#count-overlay').hidden = true; }

function afficherBilan(mode, b){
  const box = $('#bilan');
  const { c, item, liste } = cur;
  let titre, texte, etoiles = 0;
  if (mode === 'tempo'){
    etoiles = b.etoiles;
    titre = b.pct >= 90 ? 'Magnifique !' : b.pct >= 70 ? 'Bravo !' : b.pct >= 40 ? 'Pas mal !' : 'On recommence ?';
    texte = `${b.justes} notes justes sur ${b.total} (${b.pct} %) à ${cur.bpm} BPM` + (b.erreurs ? ` · ${b.erreurs} fausse${b.erreurs > 1 ? 's' : ''} note${b.erreurs > 1 ? 's' : ''}` : '');
    if (b.pct >= 80) P.noterTempo(item.id, cur.bpm);
    if (b.pct >= 85 && P.statut(liste, item.id) !== 'acquis') texte += ' — tu peux le marquer « Acquis » !';
  } else {
    etoiles = b.erreurs === 0 ? 3 : b.erreurs <= 2 ? 2 : 1;
    titre = b.erreurs === 0 ? 'Sans faute !' : 'Bravo !';
    texte = b.erreurs ? `${b.erreurs} fausse${b.erreurs > 1 ? 's' : ''} note${b.erreurs > 1 ? 's' : ''} sur le chemin. Essaie de nouveau, ou passe au mode « À tempo ».` : 'Toutes les notes étaient justes. Passe au mode « À tempo » pour jouer avec le métronome.';
  }
  $('#bilan-etoiles').innerHTML = [1, 2, 3].map(i => `<i class="${i <= etoiles ? 'on' : ''}">★</i>`).join('');
  $('#bilan-titre').textContent = titre;
  $('#bilan-texte').textContent = texte;
  const suite = $('#bilan-suite');
  if (cur.suivant){ suite.href = lienJouer(liste, cur.suivant); suite.textContent = 'Suivant'; }
  else { suite.href = LISTES[liste].retour(item); suite.textContent = 'Terminer'; }
  box.hidden = false;
}
$('#bilan-encore').addEventListener('click', () => { $('#bilan').hidden = true; if (cur){ cur.partition.reinitialiser(); lancer(); } });

/* ---------- temps de pratique ---------- */
let chrono = null;
function demarrerChrono(){ if (!chrono) chrono = setInterval(() => P.ajouterSecondes(1), 1000); }
function stopChrono(){ clearInterval(chrono); chrono = null; majStat(); }

/* ================= statut : à travailler / acquis ================= */
function majStatutBoutons(){
  if (!cur) return;
  const st = P.statut(cur.liste, cur.item.id);
  for (const [b, v] of [[$('#st-travail'), 'travail'], [$('#st-acquis'), 'acquis']]){
    b.classList.toggle('actif', st === v);
    b.setAttribute('aria-pressed', String(st === v));
  }
  const chk = $('#chk-faite');
  if (chk) chk.checked = st === 'acquis';
}
function basculerStatut(v){
  if (!cur) return;
  const { liste, item } = cur;
  const nouveau = P.statut(liste, item.id) === v ? null : v;
  P.setStatut(liste, item.id, nouveau);
  majStatutBoutons();
  annoncer(nouveau === 'acquis' ? 'Acquis ✓ Bravo !' : nouveau === 'travail' ? 'Ajouté à « À travailler »' : 'Statut retiré');
}
$('#st-travail').addEventListener('click', () => basculerStatut('travail'));
$('#st-acquis').addEventListener('click', () => basculerStatut('acquis'));
let minuterieToast = null;
function annoncer(texte){
  const t = $('#toast');
  t.hidden = true; void t.offsetWidth;
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { t.hidden = true; }, 1800);
}
$('#aide-corps').addEventListener('change', e => {
  if (e.target.id === 'chk-faite' && cur){ P.marquer(cur.item.id, e.target.checked); majStatutBoutons(); }
});

/* ================= volets ================= */
let voletOuvert = null;
function ouvrirVolet(id, focus = true){
  fermerVolets(false);
  voletOuvert = $('#' + id);
  voletOuvert.hidden = false;
  $('#voile').hidden = false;
  voletOuvert.querySelector('.volet-corps').scrollTop = 0;
  if (focus) voletOuvert.querySelector('[data-fermer]').focus();
}
function fermerVolets(rendreFocus = true){
  if (!voletOuvert) return;
  const id = voletOuvert.id;
  voletOuvert.hidden = true;
  $('#voile').hidden = true;
  voletOuvert = null;
  if (rendreFocus) (id === 'volet-aide' ? $('#j-aide') : $('#j-reglages')).focus();
}
$('#j-aide').addEventListener('click', () => ouvrirVolet('volet-aide'));
$('#j-reglages').addEventListener('click', () => ouvrirVolet('volet-reglages'));
$('#voile').addEventListener('click', () => fermerVolets());
$$('[data-fermer]').forEach(b => b.addEventListener('click', () => fermerVolets()));

/* ---------- réglages ---------- */
$('#opt-sens').value = String(reglages.sens);
$('#opt-sens').addEventListener('change', e => { reglages.sens = +e.target.value; micro.reglerSeuil(reglages.sens); sauverReglages(); });
$('#opt-loop').checked = reglages.boucle;
$('#opt-loop').addEventListener('change', e => { reglages.boucle = e.target.checked; sauverReglages(); });
$('#opt-click').checked = reglages.clic;
$('#opt-click').addEventListener('change', e => { reglages.clic = e.target.checked; if (cur) cur.jeu.clicOn = reglages.clic; sauverReglages(); });
$('#opt-tol').value = String(reglages.tol);
$('#opt-tol').addEventListener('change', e => { reglages.tol = +e.target.value; if (cur) cur.jeu.tolerance = reglages.tol; sauverReglages(); });
$('#opt-noms').checked = reglages.noms;
$('#opt-noms').addEventListener('change', e => { reglages.noms = e.target.checked; sauverReglages(); if (cur){ stopperJeu(); monterPiece(); } });
$('#opt-vol').value = reglages.vol;
$('#opt-vol').addEventListener('input', e => { reglages.vol = +e.target.value; volume(reglages.vol); sauverReglages(); });

/* ================= clavier de l'ordinateur ================= */
const enLecteur = () => !$('#ecran-jouer').hidden;
const INTERACTIF = 'button, a, summary, select, [role="button"], [role="tab"], [tabindex]';
window.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    if (!$('#install-modal').hidden){ fermerInstallation(); return; }
    if (voletOuvert){ fermerVolets(); return; }
  }
  if (!enLecteur() || voletOuvert || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.matches('input, textarea, select')) return;
  if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest(INTERACTIF)){ e.preventDefault(); basculerLecture(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
    const lien = $(e.key === 'ArrowLeft' ? '#j-prec' : '#j-suiv');
    if (lien.getAttribute('aria-disabled') !== 'true') location.hash = lien.getAttribute('href');
  }
});

/* ================= taille de l'écran ================= */
function titreAjuste(el, cadre, min, deuxLignes = false){
  const ajuster = () => {
    el.style.fontSize = '';
    el.classList.remove('deux-lignes');
    if (!el.clientWidth) return;
    let t = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && t > min){ t -= 1; el.style.fontSize = t + 'px'; }
    if (deuxLignes && el.scrollWidth > el.clientWidth + 1) el.classList.add('deux-lignes');
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(ajuster).observe(cadre);
  new MutationObserver(ajuster).observe(el, { childList:true, characterData:true, subtree:true });
}
titreAjuste($('#j-titre'), $('#j-titre').closest('.barre-jeu'), 15, true);
titreAjuste($('#liste-titre'), $('#liste-titre').closest('.entete'), 18);
titreAjuste($('#liste-sur'), $('#liste-sur').closest('.entete'), 11);
for (const h of document.querySelectorAll('.carte-cat h2')) titreAjuste(h, h.closest('.carte-cat'), 18);

/* ================= plein écran horizontal (téléphone) ================= */
const enApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const tactile = matchMedia('(pointer:coarse)').matches;
async function pleinEcranPaysage(){
  try {
    if (!enApp && !document.fullscreenElement && document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen({ navigationUI:'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch { /* refusé ou non pris en charge : l'appli pivote d'elle-même (CSS) */ }
}
if (tactile){
  if (enApp && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  const auPremierToucher = e => {
    if (e.target.closest('#install-modal')) return;
    document.removeEventListener('pointerup', auPremierToucher);
    pleinEcranPaysage();
  };
  document.addEventListener('pointerup', auPremierToucher);
}
document.addEventListener('pointerdown', () => { initAudio(); volume(reglages.vol); }, { once:true });

/* ================= appli pivotée (téléphone tenu droit) ================= */
const pivotee = matchMedia('(orientation: portrait) and (pointer: coarse)');
function zoneDefilante(el, horizontal){
  for (let n = el; n && n.id !== 'appli'; n = n.parentElement){
    const st = getComputedStyle(n);
    const ok = horizontal
      ? /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1
      : /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1;
    if (ok) return n;
  }
  return null;
}
let glisse = null, elan = null, ignorerClic = 0;
document.addEventListener('touchstart', e => {
  cancelAnimationFrame(elan);
  glisse = null;
  if (!pivotee.matches || e.touches.length !== 1 || e.target.closest('input[type=range], select, .clavier')) return;
  const t = e.touches[0];
  glisse = { x:t.clientX, y:t.clientY, temps:performance.now(), cible:e.target, zone:null, v:0 };
}, { passive:true });
document.addEventListener('touchmove', e => {
  if (!glisse) return;
  const t = e.touches[0];
  const dx = t.clientY - glisse.y, dy = -(t.clientX - glisse.x);
  if (!glisse.zone){
    if (Math.hypot(dx, dy) < 8) return;
    glisse.horizontal = Math.abs(dx) >= Math.abs(dy);
    glisse.zone = zoneDefilante(glisse.cible, glisse.horizontal);
    if (!glisse.zone){ glisse = null; return; }
  }
  e.preventDefault();
  const d = glisse.horizontal ? dx : dy;
  if (glisse.horizontal) glisse.zone.scrollLeft -= d; else glisse.zone.scrollTop -= d;
  const maintenant = performance.now();
  glisse.v = glisse.v * 0.6 + (d / Math.max(1, maintenant - glisse.temps)) * 0.4;
  glisse.x = t.clientX; glisse.y = t.clientY; glisse.temps = maintenant;
}, { passive:false });
document.addEventListener('touchend', () => {
  if (!glisse || !glisse.zone) { glisse = null; return; }
  ignorerClic = performance.now();
  const { zone, horizontal } = glisse;
  let v = glisse.v * 16;
  glisse = null;
  const pas = () => {
    if (Math.abs(v) < 0.4) return;
    if (horizontal) zone.scrollLeft -= v; else zone.scrollTop -= v;
    v *= 0.94;
    elan = requestAnimationFrame(pas);
  };
  elan = requestAnimationFrame(pas);
});
document.addEventListener('click', e => {
  if (performance.now() - ignorerClic < 350){ e.preventDefault(); e.stopPropagation(); }
}, true);

/* ================= installation sur le téléphone ================= */
const surIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installable = !!document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol);

if (installable && 'serviceWorker' in navigator){
  const avaitDejaUneVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache:'none' })
    .then(reg => {
      reg.update();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });
    })
    .catch(() => { /* hors ligne ou non pris en charge */ });
  let recharge = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitDejaUneVersion || recharge || (cur && cur.jeu && cur.jeu.mode)) return;   // jamais en pleine lecture
    recharge = true;
    location.reload();
  });
}

const CLE_INSTALLATION = 'ma-piano-installation-proposee';
let demandeInstallation = null;
function majInstallation(){
  $('#install-oui').hidden = !demandeInstallation;
  $('#install-ios').hidden = !!demandeInstallation || !surIOS;
  $('#install-autre').hidden = !!demandeInstallation || surIOS;
  $('#install-non').textContent = demandeInstallation ? 'Plus tard' : 'Compris';
}
function proposerInstallation(){
  if (enApp || !installable) return;
  majInstallation();
  $('#install-modal').hidden = false;
  if (!tactile) ($('#install-oui').hidden ? $('#install-non') : $('#install-oui')).focus();
}
function fermerInstallation(){ $('#install-modal').hidden = true; }
function premiereProposition(){
  if (enApp || !installable || lire(CLE_INSTALLATION, false)) return;
  ecrire(CLE_INSTALLATION, true);
  proposerInstallation();
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  demandeInstallation = e;
  if (enApp) return;
  $('#btn-installer').hidden = false;
  if (!$('#install-modal').hidden) majInstallation();
  else premiereProposition();
});
window.addEventListener('appinstalled', () => { $('#btn-installer').hidden = true; fermerInstallation(); });
if (installable && !enApp){
  if (surIOS) $('#btn-installer').hidden = false;
  setTimeout(premiereProposition, surIOS ? 1200 : 3000);
}
$('#btn-installer').addEventListener('click', proposerInstallation);
$('#install-oui').addEventListener('click', async () => {
  if (!demandeInstallation) return;
  demandeInstallation.prompt();
  const choix = await demandeInstallation.userChoice;
  demandeInstallation = null;
  fermerInstallation();
  if (choix && choix.outcome === 'accepted') $('#btn-installer').hidden = true;
});
$('#install-non').addEventListener('click', fermerInstallation);
$('#install-modal').addEventListener('click', e => { if (e.target.id === 'install-modal') fermerInstallation(); });

/* ================= démarrage ================= */
window.addEventListener('resize', () => { if (cur && cur.partition) cur.partition.dimensionner(); });
route();

/* pour les tests automatiques : accès à l'état interne */
window.__piano = { get cur(){ return cur; }, micro, reglages, compilerItem, EXERCICES, SOURCES };
