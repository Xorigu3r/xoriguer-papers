import { vistaInici, vistaNomina, vistaSimular, vistaGlossari } from './nomina/vistes.js';

const vista = document.getElementById('vista');
let dades = null;

// Fa servir les dades de l'any en curs; si encara no hi són, les de l'últim any disponible i ho avisa.
async function carregaDades() {
  const idx = await fetch('data/index.json').then((r) => (r.ok ? r.json() : { anys: [2026] })).catch(() => ({ anys: [2026] }));
  const anyActual = new Date().getFullYear();
  const disponibles = [...idx.anys].sort((a, b) => a - b);
  const any = disponibles.includes(anyActual) ? anyActual : disponibles.filter((a) => a <= anyActual).at(-1) ?? disponibles.at(-1);
  const resp = await fetch(`data/nomina-${any}.json`);
  if (!resp.ok) throw new Error('No s\'han pogut carregar les dades');
  dades = await resp.json();
  const revisat = new Date(dades.revisat).toLocaleDateString('ca-ES');
  document.getElementById('any-dades').textContent = `Dades de ${dades.any} (revisades el ${revisat}).`;
  if (dades.any < anyActual) {
    const avis = document.getElementById('avis-dades');
    avis.textContent = `Encara fem servir les xifres de ${dades.any}. Les de ${anyActual} (cotització, SMI, IRPF) s'actualitzaran quan es publiquin al BOE; mentrestant, els càlculs poden variar una mica.`;
    avis.hidden = false;
  }
}

const rutes = {
  '/': vistaInici,
  '/nomina': vistaNomina,
  '/simular': vistaSimular,
  '/glossari': vistaGlossari,
};

function navega() {
  const ruta = location.hash.replace(/^#/, '') || '/';
  const fn = rutes[ruta] ?? vistaInici;
  document.querySelectorAll('.menu a').forEach((a) => a.setAttribute('aria-current', a.dataset.ruta === ruta ? 'page' : 'false'));
  vista.innerHTML = '';
  fn(vista, dades);
  vista.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// Instal·lació com a app (escriptori i mòbil)
let promptInstal = null;
const btnInstal = document.getElementById('btn-instalar');
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  promptInstal = ev;
  btnInstal.hidden = false;
});
btnInstal.addEventListener('click', async () => {
  if (!promptInstal) return;
  promptInstal.prompt();
  await promptInstal.userChoice;
  promptInstal = null;
  btnInstal.hidden = true;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

try {
  await carregaDades();
  window.addEventListener('hashchange', navega);
  navega();
} catch (err) {
  vista.innerHTML = `<div class="avis alerta">${err.message}. Obre l'app des d'un servidor (no amb file://).</div>`;
}
