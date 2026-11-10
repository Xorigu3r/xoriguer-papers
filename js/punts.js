// Punts taronja numerats sobre un document d'exemple (nòmina, factura de llum...):
// en tocar-ne un s'obre l'explicació, amb Anterior/Següent, teclat (fletxes, Esc) i full inferior al mòbil.
import { t } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Crea la llista de punts. `punt(clau, titol, detall)` retorna el botó i l'afegeix en ordre de lectura. */
export function creaPunts(textos) {
  const punts = [];
  const punt = (clau, titol, detall = '') => {
    punts.push({ clau, titol, text: textos[clau] ?? '', detall });
    return `<button type="button" class="np-punt" data-n="${punts.length - 1}" aria-label="${esc(t('Explicació: {titol}', { titol }))}">${punts.length}</button>`;
  };
  return { punts, punt };
}

/** Finestra de l'explicació (va dins de .np-marc, després del document). */
export const htmlPopover = () => `
    <div class="np-pop" role="dialog" aria-modal="false" aria-labelledby="np-pop-titol" tabindex="-1" hidden>
      <div class="np-pop-cap"><span class="np-pop-n"></span><h2 id="np-pop-titol"></h2>
        <button type="button" class="np-tanca" aria-label="${esc(t('Tanca'))}">×</button></div>
      <p class="np-pop-text"></p>
      <p class="np-pop-detall"></p>
      <div class="np-pop-nav">
        <button type="button" class="boto secundari" data-mou="-1">← ${t('Anterior')}</button>
        <button type="button" class="boto" data-mou="1">${t('Següent')} →</button>
      </div>
    </div>`;

/** Activa els punts: `el` és la vista i ha de tenir .np-marc, .np-pop i el botó #np-comenca. */
export function activaPunts(el, punts) {
  const marc = el.querySelector('.np-marc');
  const pop = marc.querySelector('.np-pop');
  const botons = [...marc.querySelectorAll('.np-punt')];
  let actiu = -1;

  const fila = (b) => b.closest('[data-fila]');
  const tanca = () => {
    if (actiu < 0) return undefined;
    const b = botons[actiu];
    fila(b).classList.remove('np-actiu');
    b.setAttribute('aria-expanded', 'false');
    pop.hidden = true;
    actiu = -1;
    return b;
  };
  const obre = (n) => {
    tanca();
    actiu = n;
    const p = punts[n];
    const b = botons[n];
    const f = fila(b);
    f.classList.add('np-actiu');
    b.setAttribute('aria-expanded', 'true');
    // Que el punt sigui visible dins la nòmina (al mòbil es llisca de costat)
    // (al mòbil l'explicació ocupa la part de baix: l'apartat es posa a dalt perquè es vegi)
    const mobil = matchMedia('(max-width: 639px)').matches;
    b.scrollIntoView({ block: mobil ? 'start' : 'nearest', inline: 'nearest' });
    if (mobil) scrollBy(0, -90);
    pop.querySelector('.np-pop-n').textContent = n + 1;
    pop.querySelector('h2').textContent = p.titol;
    pop.querySelector('.np-pop-text').textContent = p.text;
    const det = pop.querySelector('.np-pop-detall');
    det.textContent = p.detall;
    det.hidden = !p.detall;
    pop.querySelector('[data-mou="-1"]').disabled = n === 0;
    pop.querySelector('[data-mou="1"]').disabled = n === punts.length - 1;
    pop.hidden = false;
    // A l'ordinador, just a sota de l'apartat; al mòbil, el CSS el fixa a baix de la pantalla
    pop.style.top = `${f.getBoundingClientRect().bottom - marc.getBoundingClientRect().top + 6}px`;
    pop.focus({ preventScroll: true });
    if (getComputedStyle(pop).position === 'absolute') pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  botons.forEach((b, i) => {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', (ev) => { ev.stopPropagation(); if (actiu === i) tanca(); else obre(i); });
  });
  pop.addEventListener('click', (ev) => ev.stopPropagation());
  pop.querySelector('.np-tanca').addEventListener('click', () => tanca()?.focus());
  pop.querySelectorAll('[data-mou]').forEach((b) => b.addEventListener('click', () => obre(actiu + Number(b.dataset.mou))));
  pop.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') tanca()?.focus();
    else if (ev.key === 'ArrowRight' && actiu < punts.length - 1) obre(actiu + 1);
    else if (ev.key === 'ArrowLeft' && actiu > 0) obre(actiu - 1);
  });
  el.querySelector('#np-comenca').addEventListener('click', (ev) => { ev.stopPropagation(); obre(0); });
  // Tocar fora tanca l'explicació (l'escoltador es treu quan es canvia de pantalla)
  const fora = (ev) => { if (!el.contains(marc)) document.removeEventListener('click', fora); else if (!pop.contains(ev.target)) tanca(); };
  document.addEventListener('click', fora);
}
