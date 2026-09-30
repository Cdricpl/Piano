/* Assemble l'application en un seul fichier HTML autonome.
 * Usage : node build.js                 ->  ma-piano.html (à double-cliquer)
 *         node build.js --artefact      ->  variante pour une page hébergée
 * (Le dépôt est aussi publiable tel quel : index.html charge les modules js/ directement.) */
const fs = require('fs');

const ORDRE = [
  'js/version.js', 'js/notes.js', 'js/glyphes.js', 'js/partition.js', 'js/clavier.js', 'js/son.js', 'js/ecoute.js', 'js/jeu.js',
  'js/airs.js', 'js/lecons.js', 'js/exercices.js', 'js/morceaux.js', 'js/midi.js', 'js/illustrations.js', 'js/progress.js', 'js/app.js'
];

/* app.js fait « import * as P from './progress.js' » : on reconstruit l'objet
 * à partir de tout ce que progress.js exporte (rien à tenir à jour à la main). */
const exportsP = [...fs.readFileSync('js/progress.js', 'utf8')
  .matchAll(/^export\s+(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
const SHIM_P = `
/* --- espace de noms de progress.js --- */
const P = { ${exportsP.join(', ')} };
`;

function module(chemin){
  let src = fs.readFileSync(chemin, 'utf8');
  src = src.replace(/^import[^\n]*;\s*$/gm, '');   // les imports disparaissent
  src = src.replace(/^export\s+/gm, '');           // tout vit dans la même portée
  return `\n/* ================= ${chemin} ================= */\n` + src.trim() + '\n';
}

/* Détecte les noms déclarés deux fois : invisible en modules séparés,
 * mais fatal une fois tout réuni dans la même portée. */
function declarations(src){
  const noms = new Set();
  const re = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) noms.add(m[1]);
  return noms;
}
const vus = new Map();
const morceaux = ORDRE.map(f => {
  const src = f === 'js/app.js' ? SHIM_P + module(f) : module(f);
  for (const n of declarations(src)){
    if (vus.has(n)){
      console.error(`ERREUR : « ${n} » est déclaré dans ${vus.get(n)} et dans ${f}.`);
      console.error('Renomme l\'un des deux : dans le fichier unique, tout partage la même portée.');
      process.exit(1);
    }
    vus.set(n, f);
  }
  return src;
});
let js = morceaux.join('\n');

/* sw.js (racine) : son cache porte toujours le numéro de version courant */
const numeroVersion = fs.readFileSync('js/version.js', 'utf8').match(/VERSION = '([^']+)'/)[1];
const swSource = fs.readFileSync('sw.js', 'utf8');
const swAJour = swSource.replace(/const VERSION = '[^']*';/, `const VERSION = 'ma-piano-${numeroVersion}';`);
if (swAJour !== swSource) fs.writeFileSync('sw.js', swAJour);
const css = fs.readFileSync('css/styles.css', 'utf8');

let html = fs.readFileSync('index.html', 'utf8');
/* remplacements par fonction : sinon les motifs $$ / $& du code seraient interprétés */
html = html.replace('<link rel="stylesheet" href="css/styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script type="module" src="js/app.js"></script>', () => `<script type="module">\n${js}\n</script>`);
html = html.replace('<title>', '<!-- Fichier autonome généré par build.js : ne pas modifier à la main -->\n<title>');

const args = process.argv.slice(2);
const options = new Set(args.filter(a => a.startsWith('--')));
const chemins = args.filter(a => !a.startsWith('--'));

/* Fichier seul : il n'y a ni manifest ni icônes à côté, on retire ces balises. */
html = html.replace(/^.*data-pwa.*\n/gm, '');

const sortie = chemins[0] || 'ma-piano.html';

/* Variante « artefact » : la page est publiée dans un squelette existant,
 * on ne garde donc que le titre, les polices, le style et le contenu du body. */
if (options.has('--artefact')){
  const titre = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const corps = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const polices = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];
  html = `${titre}\n${polices}\n${style}\n${corps.trim()}\n`;
}

fs.writeFileSync(sortie, html);
console.log(sortie, 'écrit —', (html.length / 1024).toFixed(0), 'Ko');
