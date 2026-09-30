/* Audit de lisibilité : chaque écran, sur une série de tailles réelles (téléphones tenus
 * droit ou couchés, tablettes, ordinateurs). Signale le texte coupé (ellipse, lignes
 * rognées), le texte qui dépasse de sa carte, et le texte trop petit (< 10,5 px à l'écran).
 *
 * Usage : node build.js && node outils/audit_lisibilite.mjs [--captures] [--taille=nom,nom]
 * (nécessite playwright-core et un Chromium ; captures et bilan.json dans outils/audit/) */
import { chromium } from 'playwright-core';
import fs from 'fs';
const racine = new URL('..', import.meta.url).pathname;
const dir = racine + 'outils/audit';
fs.mkdirSync(dir, { recursive:true });
const CAPT = process.argv.includes('--captures');
const SEUL = process.argv.find(a => a.startsWith('--taille='))?.slice(9);
const TAILLES = [
  // téléphones tenus droit (l'appli pivote)
  { nom:'iphone-se-droit',   w:375, h:667, tactile:true },
  { nom:'petit-android-droit', w:360, h:640, tactile:true },
  { nom:'samsung-a-droit',   w:360, h:740, tactile:true },
  { nom:'pixel-droit',       w:412, h:839, tactile:true },
  { nom:'iphone-pro-droit',  w:393, h:852, tactile:true },
  { nom:'iphone-max-droit',  w:430, h:932, tactile:true },
  { nom:'mini-droit',        w:320, h:568, tactile:true },
  // téléphones couchés
  { nom:'iphone-se-couche',  w:667, h:375, tactile:true },
  { nom:'petit-android-couche', w:640, h:360, tactile:true },
  { nom:'samsung-couche',    w:780, h:360, tactile:true },
  { nom:'android-barre',     w:732, h:320, tactile:true },   // barre d'adresse visible
  { nom:'pixel-couche',      w:915, h:412, tactile:true },
  { nom:'iphone-max-couche', w:932, h:430, tactile:true },
  { nom:'mini-couche',       w:568, h:320, tactile:true },
  // tablettes
  { nom:'ipad-droit',        w:768, h:1024, tactile:true },
  { nom:'ipad-couche',       w:1024, h:768, tactile:true },
  { nom:'tab-android-couche',w:1280, h:800, tactile:true },
  { nom:'ipad-pro-couche',   w:1366, h:1024, tactile:true },
  // ordinateurs
  { nom:'portable',          w:1280, h:720 },
  { nom:'portable-2',        w:1366, h:768 },
  { nom:'bureau',            w:1920, h:1080 },
  { nom:'fenetre-etroite',   w:800, h:600 },
  { nom:'fenetre-basse',     w:1200, h:500 }
].filter(t => !SEUL || SEUL.split(',').includes(t.nom));

const b = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const bilan = {};
for (const t of TAILLES){
  const ctx = await b.newContext({ viewport:{ width:t.w, height:t.h }, hasTouch:!!t.tactile, isMobile:!!t.tactile, deviceScaleFactor:1 });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('ma-piano-installation-proposee', '1');
    // quelques statuts, pour voir pastilles, drapeaux et listes de progression
    if (!localStorage.getItem('ma-piano-progres-v1')) localStorage.setItem('ma-piano-progres-v1', JSON.stringify({
      leconsFaites:{ l01:'2026-01-01' }, statuts:{ 'morceau:m-someone':{ s:'travail', j:'2026-01-02' }, 'lecon:l03':{ s:'travail', j:'2026-01-03' },
        'exercice:ex-g-do':{ s:'acquis', j:'2026-01-02' }, 'morceau:m-clair':{ s:'acquis', j:'2026-01-04' } }, reglages:1 }));
    localStorage.setItem('ma-piano-reglages', JSON.stringify({ micro:false }));
  } catch {} });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  await p.goto('file://' + racine + 'ma-piano.html#/'); await p.waitForTimeout(1200);
  const routes = ['#/', '#/parcours', '#/parcours/1', '#/parcours/3', '#/morceaux', '#/morceaux/pop', '#/exercices', '#/exercices/gammes', '#/progression', '#/libre', '#/jouer/lecon/l03', '#/jouer/lecon/l14', '#/jouer/lecon/l32', '#/jouer/morceau/m-someone', '#/jouer/morceau/m-clocks', '#/jouer/morceau/m-douce', '#/jouer/exercice/ex-g-sol'];
  // sous-écrans : première et dernière tuile de chaque catégorie
  for (const r of ['#/parcours', '#/morceaux', '#/exercices']){
    await p.evaluate(h => location.hash = h, r); await p.waitForTimeout(250);
    const hs = await p.$$eval('a.tuile', as => as.map(a => a.getAttribute('href')));
    routes.push(...new Set([hs[0], hs[hs.length - 1]]));
  }
  const res = [];
  const auditer = async (quoi) => {
    const pb = await p.evaluate(() => {
      const out = [];
      const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement){ const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
      const nomDe = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''));
      const txt = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const racines = [...document.querySelectorAll('.ecran, .volet:not([hidden]), .modal:not([hidden])')];
      const tous = racines.flatMap(r => [r, ...r.querySelectorAll('*')]);
      for (const el of tous){
        if (el.closest('svg') && el.tagName !== 'text') continue;
        const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!direct) continue;
        if (!vis(el)) continue;
        const s = getComputedStyle(el);
        // taille réelle à l'écran
        let fs = parseFloat(s.fontSize);
        if (el.tagName === 'text'){ const m = el.getScreenCTM(); if (m) fs *= Math.hypot(m.a, m.b); }
        if (fs < 10.5) out.push({ type:'petit', el:nomDe(el), txt:txt(el), fs:+fs.toFixed(1) });
        // coupé par ellipse ou par limitation de lignes
        if (el.tagName !== 'text' && /hidden|clip/.test(s.overflowX + s.overflowY)){
          if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)
            out.push({ type:'coupe', el:nomDe(el), txt:txt(el), d:`${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}` });
        }
        // dépasse d'un parent qui rogne (hors axe de défilement)
        const pivot = getComputedStyle(document.getElementById('appli')).transform !== 'none';
        const rep = q => pivot ? { l:q.top, r:q.bottom, t:-q.right, b:-q.left } : { l:q.left, r:q.right, t:q.top, b:q.bottom };
        // étendue du texte lui-même (il peut dépasser de sa propre boîte)
        let bt = el.getBoundingClientRect();
        if (el.tagName !== 'text'){ const rg = document.createRange(); rg.selectNodeContents(el); const rr = rg.getBoundingClientRect(); if (rr.width) bt = rr; }
        const r = rep(bt);
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement){
          const sa = getComputedStyle(a);
          const hx = /hidden|clip/.test(sa.overflowX), hy = /hidden|clip/.test(sa.overflowY);
          const dx = /auto|scroll/.test(sa.overflowX), dy = /auto|scroll/.test(sa.overflowY);
          if (!hx && !hy && !dx && !dy) continue;
          const ra = rep(a.getBoundingClientRect());
          const dep = Math.max(hx ? Math.max(ra.l - r.l, r.r - ra.r) : 0, hy ? Math.max(ra.t - r.t, r.b - ra.b) : 0);
          if (dep > 3){ out.push({ type:'deborde', el:nomDe(el), txt:txt(el), dans:nomDe(a), px:Math.round(dep) }); }
          break;
        }
      }
      return out;
    });
    for (const x of pb) res.push({ ecran:quoi, ...x });
  };
  for (const r of routes){
    await p.evaluate(h => location.hash = h, r); await p.waitForTimeout(r.startsWith('#/jouer') ? 700 : 350);
    if (await p.isVisible('#volet-aide')){ await auditer(r + ' [aide]'); await p.click('#volet-aide [data-fermer]', { force:true }).catch(()=>{}); await p.waitForTimeout(200); }
    await auditer(r);
    if (CAPT) await p.screenshot({ path:`${dir}/${t.nom}-${r.replace(/[#/]+/g, '_')}.png` });
  }
  // lecteur : les titres les plus longs de chaque liste
  const longs = [];
  for (const r of ['#/parcours/1', '#/parcours/3', '#/parcours/5', '#/morceaux/pop', '#/morceaux/classique', '#/exercices/accords', '#/exercices/gammes']){
    await p.evaluate(h => location.hash = h, r); await p.waitForTimeout(200);
    longs.push(...await p.$$eval('a.item-carte', as => as.map(a => [a.getAttribute('href'), a.querySelector('.i-nom').textContent.length])));
  }
  longs.sort((a, b) => b[1] - a[1]);
  for (const [h] of longs.slice(0, 4)){
    await p.evaluate(x => location.hash = x, h); await p.waitForTimeout(600);
    if (await p.isVisible('#volet-aide')){ await auditer(h + ' [aide]'); await p.click('#volet-aide [data-fermer]', { force:true }).catch(()=>{}); await p.waitForTimeout(200); }
    await auditer(h);
    if (CAPT) await p.screenshot({ path:`${dir}/${t.nom}-long-${h.replace(/[#/]+/g, '_')}.png` });
  }
  // lecteur : les trois façons de jouer, les parties, les réglages
  for (const mode of ['tempo', 'demo', 'attente']){
    await p.evaluate(h => location.hash = h, '#/jouer/morceau/m-someone'); await p.waitForTimeout(500);
    if (await p.isVisible('#volet-aide')) await p.click('#volet-aide [data-fermer]', { force:true }).catch(()=>{});
    await p.click(`#modes [data-mode="${mode}"]`, { force:true }).catch(()=>{}); await p.waitForTimeout(250);
    await auditer('#/jouer/morceau/m-someone mode ' + mode);
    if (CAPT) await p.screenshot({ path:`${dir}/${t.nom}-mode-${mode}.png` });
  }
  await p.click('#j-reglages', { force:true }).catch(()=>{}); await p.waitForTimeout(250);
  await auditer('#/jouer réglages');
  if (CAPT) await p.screenshot({ path:`${dir}/${t.nom}-reglages.png` });
  bilan[t.nom] = { erreurs:err, pb:res };
  const n = k => res.filter(x => x.type === k).length;
  console.log(`${t.nom.padEnd(22)} ${t.w}x${t.h}  coupés:${n('coupe')}  débordent:${n('deborde')}  petits:${n('petit')}  js:${err.length}`);
  await ctx.close();
}
fs.writeFileSync(dir + '/bilan.json', JSON.stringify(bilan, null, 1));
await b.close();
