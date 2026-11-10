// Idiomes de l'app: català (original) i castellà.
// Els textos s'escriuen en català dins del codi amb t('…'); aquí hi ha la traducció al castellà.
// Les variables van entre claus: t('Hola {nom}', { nom }).
// tests/i18n.test.js comprova que cap text t('…') del codi quedi sense traduir.

import { ES } from './i18n-es.js';

export const IDIOMES = { ca: 'Català', es: 'Castellano' };
const CLAU = 'pdc.idioma';

function inicial() {
  try {
    const desat = globalThis.localStorage?.getItem(CLAU);
    if (desat && IDIOMES[desat]) return desat;
  } catch { /* sense emmagatzematge */ }
  const nav = globalThis.navigator?.languages ?? [globalThis.navigator?.language ?? ''];
  for (const l of nav) {
    const c = String(l || '').slice(0, 2).toLowerCase();
    if (c === 'ca' || c === 'es') return c;
  }
  return 'ca';
}

let actual = inicial();

export const idioma = () => actual;

export function canviaIdioma(nou) {
  if (!IDIOMES[nou]) return;
  actual = nou;
  try { globalThis.localStorage?.setItem(CLAU, nou); } catch { /* res */ }
}

/** Tradueix un text català (amb {variables} opcionals). */
export function t(ca, vars) {
  let s = actual === 'es' ? (ES[ca] ?? ca) : ca;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

/** Locale per a dates. */
export const locale = () => (actual === 'es' ? 'es-ES' : 'ca-ES');
