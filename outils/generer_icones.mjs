/* Fabrique toutes les icônes à partir d'un seul dessin : icons/icone.svg.
 *  - icons/icone-512.png, icone-192.png   : icône de l'appli (coins arrondis)
 *  - icons/icone-maskable-512.png         : pleine page, dessin dans la zone sûre (Android)
 *  - icons/apple-touch-icon.png (180)     : pleine page (iPhone arrondit lui-même)
 *  - icons/favicon-32.png                 : onglet du navigateur
 *  - index.html : le logo de l'en-tête et le favicon reprennent exactement le même dessin
 *
 * Usage : node outils/generer_icones.mjs   (nécessite playwright-core et un Chromium)
 */
import fs from 'fs';
import { chromium } from 'playwright-core';

const racine = new URL('..', import.meta.url).pathname;
const source = fs.readFileSync(racine + 'icons/icone.svg', 'utf8').trim();

/* Variante pleine page : fond carré, dessin réduit vers le centre */
function pleinePage(svg, echelle){
  return svg
    .replaceAll('rx="116"', 'rx="0"')
    .replace('<!-- ombre portée -->', `<g transform="translate(256 256) scale(${echelle}) translate(-256 -256)">\n  <!-- ombre portée -->`)
    .replace('</svg>', '</g>\n</svg>');
}

const variantes = [
  { fichier:'icone-512.png',          taille:512, svg:source },
  { fichier:'icone-192.png',          taille:192, svg:source },
  { fichier:'icone-maskable-512.png', taille:512, svg:pleinePage(source, 0.78) },
  { fichier:'apple-touch-icon.png',   taille:180, svg:pleinePage(source, 0.9) },
  { fichier:'favicon-32.png',         taille:32,  svg:source }
];

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox']
});
const page = await navigateur.newPage();
for (const v of variantes){
  await page.setViewportSize({ width:v.taille, height:v.taille });
  await page.setContent(`<html><body style="margin:0;background:transparent">
    ${v.svg.replace('<svg ', `<svg width="${v.taille}" height="${v.taille}" `)}</body></html>`);
  await page.screenshot({ path: racine + 'icons/' + v.fichier, omitBackground:true });
  console.log('icons/' + v.fichier, v.taille + ' px');
}
await navigateur.close();

/* Même dessin dans l'appli : logo de l'en-tête et favicon */
let html = fs.readFileSync(racine + 'index.html', 'utf8');
const logo = source.replace(/\n\s*<!--[^>]*-->/g, '').replace(/\n\s*/g, '');
html = html.replace(/<!-- logo -->[\s\S]*?<!-- \/logo -->/, () => `<!-- logo -->${logo}<!-- /logo -->`);
html = html.replace(/<link rel="icon" href="[^"]*">/,
  () => `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(logo)}">`);
fs.writeFileSync(racine + 'index.html', html);
console.log('index.html : logo et favicon mis à jour');
