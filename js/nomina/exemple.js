// Nòmina explicada: una nòmina d'exemple (model oficial, Orden ESS/2098/2014) amb punts clicables.
// Les xifres es calculen amb el motor i les dades de l'any, així sempre quadren amb la normativa vigent.
import { calculaNomina, fmt, pc } from './calc.js';
import { explicacions as expl } from './textos.js';
import { t } from '../i18n.js';

const EXEMPLE = {
  salariBase: '1500', complementsSalarials: '180', noSalarials: '60', horesExtres: '',
  pagues: '14', prorratejades: false, contracte: 'indefinit', jornada: '100', grup: '5',
  situacioFamiliar: '3', anyNaixement: '1990', discapacitat: 'cap', descendents: [], ascendents: [],
};
const ANTIGUITAT = 60; // part dels complements salarials (la resta és plus de conveni)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function vistaNominaExemple(el, dades) {
  const r = calculaNomina(EXEMPLE, dades);
  const e = r.entrada;
  const lin = Object.fromEntries(r.linies.map((l) => [l.clau, l]));
  const any = dades.any;
  const textos = expl();

  // Cada punt: on va, títol i explicació (més el càlcul concret de l'exemple quan n'hi ha)
  const punts = [];
  const punt = (clau, titol, detall = '') => {
    punts.push({ clau, titol, text: textos[clau] ?? '', detall });
    return `<button type="button" class="np-punt" data-n="${punts.length - 1}" aria-label="${esc(t('Explicació: {titol}', { titol }))}">${punts.length}</button>`;
  };
  const sense = '<span class="np-punt-buit" aria-hidden="true"></span>';
  const fila = (clau, concepte, imp, { classe = '', detall = '', sub = '' } = {}) => `
    <div class="np-fila ${classe}" data-fila>
      ${clau ? punt(clau, concepte, detall) : sense}
      <span class="np-concepte">${concepte}${sub ? `<small>${sub}</small>` : ''}</span>
      <span class="np-import">${imp ?? ''}</span>
    </div>`;
  const quota = (l) => `${fmt(l.base)} × ${pc(l.tipus)}`;
  const calc = (l) => t('En aquest exemple: {base} × {tipus} = {import}.', { base: fmt(l.base), tipus: pc(l.tipus), import: fmt(l.import) });

  const html = `
    <h1>${t('Nòmina explicada')}</h1>
    <p class="intro">${t("Una nòmina d'exemple amb el format oficial. Toca els punts taronja per saber què és cada cosa. Les dades són inventades; els percentatges són els oficials de {any}.", { any })}</p>
    <p><button type="button" class="boto" id="np-comenca">${t('Explica-la pas a pas')}</button></p>

    <section class="nomina-paper" aria-label="${esc(t("Nòmina d'exemple"))}">
      <div class="np-cap">
        <div class="np-caixa" data-fila>
          ${punt('empresa', t('Empresa'))}
          <div><b>${t('EMPRESA')}</b><br>Empresa Exemple, SL<br>CIF: B00000000<br>${t('Domicili')}: C. Major, 1 · 08000<br>CCC: 08 0000000000</div>
        </div>
        <div class="np-caixa" data-fila>
          ${punt('treballador', t('Treballador/a'))}
          <div><b>${t('TREBALLADOR/A')}</b><br>Persona Exemple<br>NIF: 00000000T · NAF: 08 00000000 00<br>${t('Categoria')}: ${t('Oficial administratiu/iva')}<br>${t('Grup de cotització')}: 5 · ${t('Antiguitat')}: 01/03/2019</div>
        </div>
      </div>
      <div class="np-fila np-periode" data-fila>
        ${punt('periode', t('Període de liquidació'))}
        <span class="np-concepte">${t('Període de liquidació')}: 01/10/${any} – 31/10/${any}</span>
        <span class="np-import">${t('{n} dies', { n: 30 })}</span>
      </div>

      <div class="np-seccio">${t('I. MERITACIONS')}</div>
      <div class="np-sub">${t('1. Percepcions salarials')}</div>
      ${fila('salariBase', t('Salari base'), fmt(e.salariBase))}
      ${fila('complementsSalarials', t('Complements salarials'), fmt(e.complementsSalarials), { sub: `${t('Antiguitat')} ${fmt(ANTIGUITAT)} · ${t('Plus de conveni')} ${fmt(e.complementsSalarials - ANTIGUITAT)}` })}
      ${fila('horesExtres', t('Hores extraordinàries'), fmt(0))}
      ${fila('gratificacions', t('Gratificacions extraordinàries'), fmt(0), { detall: t('En aquest exemple hi ha 14 pagues sense prorratejar: aquest mes no en cobres cap.') })}
      <div class="np-sub">${t('2. Percepcions no salarials')}</div>
      ${fila('noSalarials', t('Plus de transport'), fmt(e.noSalarials))}
      ${fila('totalMeritat', t('A. TOTAL MERITAT'), fmt(r.totalMeritat), { classe: 'np-total' })}

      <div class="np-seccio">${t('II. DEDUCCIONS')}</div>
      <div class="np-sub">${t('1. Aportació del treballador a les cotitzacions a la Seguretat Social')}</div>
      ${fila('cc', t('Contingències comunes'), fmt(lin.cc.import), { sub: quota(lin.cc), detall: calc(lin.cc) })}
      ${fila('atur', t('Desocupació'), fmt(lin.atur.import), { sub: quota(lin.atur), detall: calc(lin.atur) })}
      ${fila('fp', t('Formació professional'), fmt(lin.fp.import), { sub: quota(lin.fp), detall: calc(lin.fp) })}
      ${fila('mei', t('MEI (equitat intergeneracional)'), fmt(lin.mei.import), { sub: quota(lin.mei), detall: calc(lin.mei) })}
      ${fila('he', t('Hores extraordinàries'), fmt(0))}
      ${fila('totalSS', t('Total aportacions'), fmt(r.totalSS), { classe: 'np-subtotal' })}
      <div class="np-sub">${t("2. Impost sobre la renda de les persones físiques")}</div>
      ${fila('irpf', 'IRPF', fmt(r.irpf.import), { sub: `${fmt(r.irpf.base)} × ${pc(r.irpf.tipus)}`, detall: t("En aquest exemple: {base} × {tipus} = {import}. El percentatge surt del sou de tot l'any i de la situació familiar (model 145).", { base: fmt(r.irpf.base), tipus: pc(r.irpf.tipus), import: fmt(r.irpf.import) }) })}
      ${fila('bestretes', t('3. Bestretes · 4. Productes en espècie · 5. Altres deduccions'), fmt(0))}
      ${fila('totalDeduir', t('B. TOTAL A DEDUIR'), fmt(r.totalDeduccions), { classe: 'np-total', detall: t("En aquest exemple: {ss} de Seguretat Social + {irpf} d'IRPF = {total}.", { ss: fmt(r.totalSS), irpf: fmt(r.irpf.import), total: fmt(r.totalDeduccions) }) })}
      ${fila('net', t('LÍQUID TOTAL A PERCEBRE (A − B)'), fmt(r.net), { classe: 'np-liquid', detall: t('En aquest exemple: {a} − {b} = {net}.', { a: fmt(r.totalMeritat), b: fmt(r.totalDeduccions), net: fmt(r.net) }) })}

      <div class="np-fila np-firma" data-fila>
        ${punt('firma', t('Signatura i segell'))}
        <span class="np-concepte">${t("Signatura i segell de l'empresa")}<small>31/10/${any}</small></span>
        <span class="np-import">${t('Rebut')}</span>
      </div>

      <div class="np-seccio">${t("DETERMINACIÓ DE LES BASES DE COTITZACIÓ I DE LA BASE SUBJECTA A RETENCIÓ DE L'IRPF")}</div>
      ${fila('bccc', t('1. Base de cotització per contingències comunes'), fmt(r.bccc), { sub: `${t('Remuneració mensual')} ${fmt(r.totalMeritat - e.noSalarials)} + ${t('Prorrata pagues extres')} ${fmt(r.prorrata)}`, detall: t('En aquest exemple: {mes} del mes + {prorrata} de prorrata (2 pagues de {paga} ÷ 12) = {base}.', { mes: fmt(r.totalMeritat - e.noSalarials), prorrata: fmt(r.prorrata), paga: fmt(e.importPagaExtra), base: fmt(r.bccc) }) })}
      ${fila('bccp', t('2. Base de cotització per contingències professionals'), fmt(r.bccp))}
      ${fila('baseIRPF', t("3. Base subjecta a retenció de l'IRPF"), fmt(r.irpf.base))}
      ${fila('aportacioEmpresa', t("Aportació de l'empresa"), '…', { classe: 'np-nota' })}

      <div class="np-pop" role="dialog" aria-modal="false" aria-labelledby="np-pop-titol" tabindex="-1" hidden>
        <div class="np-pop-cap"><span class="np-pop-n"></span><h2 id="np-pop-titol"></h2>
          <button type="button" class="np-tanca" aria-label="${esc(t('Tanca'))}">×</button></div>
        <p class="np-pop-text"></p>
        <p class="np-pop-detall"></p>
        <div class="np-pop-nav">
          <button type="button" class="boto secundari" data-mou="-1">← ${t('Anterior')}</button>
          <button type="button" class="boto" data-mou="1">${t('Següent')} →</button>
        </div>
      </div>
    </section>
    <p class="petit">${t('Vols comprovar la teva? Ves a <a href="#/nomina">Comprovar nòmina</a> i posa-hi les xifres de la teva nòmina.')}</p>
  `;
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  el.append(tpl.content);

  const paper = el.querySelector('.nomina-paper');
  const pop = paper.querySelector('.np-pop');
  const botons = [...paper.querySelectorAll('.np-punt')];
  let actiu = -1;

  const tanca = () => {
    if (actiu < 0) return;
    const b = botons[actiu];
    b.closest('[data-fila]').classList.remove('np-actiu');
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
    const filaEl = b.closest('[data-fila]');
    filaEl.classList.add('np-actiu');
    b.setAttribute('aria-expanded', 'true');
    pop.querySelector('.np-pop-n').textContent = n + 1;
    pop.querySelector('h2').textContent = p.titol;
    pop.querySelector('.np-pop-text').textContent = p.text;
    const det = pop.querySelector('.np-pop-detall');
    det.textContent = p.detall;
    det.hidden = !p.detall;
    pop.querySelector('[data-mou="-1"]').disabled = n === 0;
    const seg = pop.querySelector('[data-mou="1"]');
    seg.disabled = n === punts.length - 1;
    pop.hidden = false;
    pop.style.top = `${filaEl.offsetTop + filaEl.offsetHeight + 6}px`;
    pop.focus({ preventScroll: true });
    pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  // Tocar fora de la nòmina tanca l'explicació (l'escoltador es treu quan es canvia de pantalla)
  const fora = (ev) => { if (!el.contains(paper)) document.removeEventListener('click', fora); else if (!pop.contains(ev.target)) tanca(); };
  document.addEventListener('click', fora);
}
