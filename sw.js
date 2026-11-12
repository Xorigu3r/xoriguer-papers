// Service worker: l'app funciona sense connexió. Canvia VERSIO quan publiquis canvis.
const VERSIO = 'pdc-v15';
const FITXERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'marca/marca.css',
  'marca/Montserrat-ExtraBold.ttf',
  'js/app.js',
  'js/i18n.js',
  'js/i18n-es.js',
  'js/nomina/calc.js',
  'js/nomina/textos.js',
  'js/nomina/vistes.js',
  'js/nomina/model145.js',
  'js/nomina/exemple.js',
  'js/nomina/llegeix-pdf.js',
  'js/nomina/vista-pdf.js',
  'js/llum/calc.js',
  'js/llum/textos.js',
  'js/llum/vistes.js',
  'js/llum/exemple.js',
  'js/llum/llegeix-pdf.js',
  'js/llum/vista-pdf.js',
  'js/pdf-text.js',
  'js/pdf-ui.js',
  'js/punts.js',
  'js/historial.js',
  'js/informe.js',
  'js/ocr.js',
  'js/llum/bo-social.js',
  'js/llum/vista-bo-social.js',
  'data/index.json',
  'data/nomina-2026.json',
  'data/llum-2026.json',
  'icons/icon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/nomina.svg',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSIO).then((c) => c.addAll(FITXERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claus) => Promise.all(claus.filter((k) => k !== VERSIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Xarxa primer (per tenir sempre les dades actualitzades), memòria cau si no hi ha connexió.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(
    // cache: 'no-cache' → sempre pregunta al servidor si hi ha versió nova (dades de l'any, codi)
    fetch(ev.request, { cache: 'no-cache' })
      .then((resp) => {
        if (!resp.ok) return resp;
        const copia = resp.clone();
        caches.open(VERSIO).then((c) => c.put(ev.request, copia));
        return resp;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true })),
  );
});
