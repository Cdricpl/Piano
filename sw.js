/* Service worker : garde l'application sur le téléphone pour qu'elle marche
 * sans connexion, tout en prenant TOUJOURS la dernière version quand il y a du réseau.
 * VERSION est réécrit par build.js à partir de js/version.js : une nouvelle version
 * = un nouveau cache, l'ancien est supprimé. */
const VERSION = 'ma-piano-0.2.1';
const COQUILLE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icone-192.png', './icons/icone-512.png',
  './icons/icone-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' = on ignore le cache HTTP du navigateur pour remplir le nôtre
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(COQUILLE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())      // la nouvelle version prend la main tout de suite
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* réseau d'abord, sans cache HTTP ; la copie locale ne sert que hors connexion */
async function reseauDabord(req, cle){
  const cache = await caches.open(VERSION);
  try {
    const r = await fetch(req, { cache: 'no-store' });
    if (r.ok) cache.put(cle || req, r.clone());
    return r;
  } catch {
    return (await cache.match(cle || req)) || (await cache.match('./index.html'));
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // polices Google : elles ne changent pas, la copie locale suffit (rafraîchie en fond)
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open(VERSION).then(async c => {
      const enCache = await c.match(req);
      const reseau = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })
                               .catch(() => enCache);
      return enCache || reseau;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') e.respondWith(reseauDabord(req, './index.html'));
  else e.respondWith(reseauDabord(req));
});
