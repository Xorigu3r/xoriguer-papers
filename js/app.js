import { vistaInici, vistaNomina, vistaSimular, vistaGlossari } from './nomina/vistes.js';
import { t, idioma, canviaIdioma, locale } from './i18n.js';

const vista = document.getElementById('vista');
let dades = null;

// Fa servir les dades de l'any en curs; si encara no hi són, les de l'últim any disponible i ho avisa.
async function carregaDades() {
  const idx = await fetch('data/index.json').then((r) => (r.ok ? r.json() : { anys: [2026] })).catch(() => ({ anys: [2026] }));
  const anyActual = new Date().getFullYear();
  const disponibles = [...idx.anys].sort((a, b) => a - b);
  const any = disponibles.includes(anyActual) ? anyActual : disponibles.filter((a) => a <= anyActual).at(-1) ?? disponibles.at(-1);
  const resp = await fetch(`data/nomina-${any}.json`);
  if (!resp.ok) throw new Error(t("No s'han pogut carregar les dades"));
  dades = await resp.json();
  dades.anyActual = anyActual;
}

// Textos fixos de la pàgina (menú, peu) i dades de l'any, en l'idioma triat.
function pintaMarc() {
  document.documentElement.lang = idioma();
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-title]').forEach((el) => { el.title = t(el.dataset.tTitle); });
  document.querySelectorAll('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
  document.querySelectorAll('[data-idioma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma())));
  if (!dades) return;
  const revisat = new Date(dades.revisat).toLocaleDateString(locale());
  document.getElementById('any-dades').textContent = t('Dades de {any} (revisades el {data}).', { any: dades.any, data: revisat });
  const avis = document.getElementById('avis-dades');
  if (dades.any < dades.anyActual) {
    avis.textContent = t("Encara fem servir les xifres de {any}. Les de {actual} (cotització, SMI, IRPF) s'actualitzaran quan es publiquin al BOE; mentrestant, els càlculs poden variar una mica.", { any: dades.any, actual: dades.anyActual });
    avis.hidden = false;
  }
}

document.querySelectorAll('[data-idioma]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.idioma === idioma()) return;
  canviaIdioma(b.dataset.idioma);
  pintaMarc();
  if (dades) navega();
}));

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

pintaMarc();
try {
  await carregaDades();
  pintaMarc();
  window.addEventListener('hashchange', navega);
  navega();
} catch (err) {
  vista.innerHTML = `<div class="avis alerta">${err.message}. ${t("Obre l'app des d'un servidor (no amb file://).")}</div>`;
}
