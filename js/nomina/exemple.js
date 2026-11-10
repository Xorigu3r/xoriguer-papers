// Nòmina explicada: una nòmina d'exemple amb l'aspecte de les nòmines reals (model oficial,
// Orden ESS/2098/2014) i punts clicables a cada apartat. Les xifres es calculen amb el motor
// i les dades de l'any, així sempre quadren amb la normativa vigent.
import { calculaNomina, fmt } from './calc.js';
import { explicacions as expl } from './textos.js';
import { t } from '../i18n.js';

const EXEMPLE = {
  salariBase: '1500', complementsSalarials: '180', noSalarials: '60', horesExtres: '',
  pagues: '14', prorratejades: true, contracte: 'indefinit', jornada: '100', grup: '5',
  situacioFamiliar: '3', anyNaixement: '1990', discapacitat: 'cap', descendents: [], ascendents: [],
};
const ANTIGUITAT = 60; // part dels complements salarials (la resta és plus de conveni)
const DIES = 30;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Números com a les nòmines: sense símbol d'euro, amb coma decimal
const n2 = (v) => new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }).format(v);
const r2 = (v) => Math.round(v * 100) / 100;

export function vistaNominaExemple(el, dades) {
  const r = calculaNomina(EXEMPLE, dades);
  const e = r.entrada;
  const lin = Object.fromEntries(r.linies.map((l) => [l.clau, l]));
  const any = dades.any;
  const textos = expl();
  const emp = dades.cotitzacioEmpresa;

  // Aportació de l'empresa (si l'any en té dades)
  const empLinies = emp ? [
    { nom: t('Contingències comunes'), tipus: emp.contingenciesComunes, base: r.bccc },
    { nom: 'AT i EP', tipus: emp.atEpExemple, base: r.bccp },
    { nom: t('Desocupació'), tipus: emp.aturIndefinit, base: r.bccp },
    { nom: t('Formació professional'), tipus: emp.formacioProfessional, base: r.bccp },
    { nom: t('Fons de Garantia Salarial'), tipus: emp.fogasa, base: r.bccp },
    { nom: 'MEI', tipus: emp.mei, base: r.bccp },
  ].map((l) => ({ ...l, import: r2(l.base * l.tipus / 100) })) : [];
  const totalEmp = r2(empLinies.reduce((s, l) => s + l.import, 0));

  // Cada punt: títol, explicació i, si cal, el càlcul concret de l'exemple
  const punts = [];
  const punt = (clau, titol, detall = '') => {
    punts.push({ clau, titol, text: textos[clau] ?? '', detall });
    return `<button type="button" class="np-punt" data-n="${punts.length - 1}" aria-label="${esc(t('Explicació: {titol}', { titol }))}">${punts.length}</button>`;
  };
  const calc = (l) => t('En aquest exemple: {base} × {tipus} = {import}.', { base: fmt(l.base), tipus: `${n2(l.tipus)} %`, import: fmt(l.import) });

  // Línies de la taula central (com a les nòmines reals: quantia, concepte, import, deducció, totals)
  const meritacio = (clau, concepte, total, detall) => ({ clau, concepte, quantia: DIES, preu: n2(total / DIES), total, detall });
  const deduccio = (clau, concepte, l, detall) => ({ clau, concepte, quantia: n2(l.tipus), deduccio: l.import, detall: detall ?? calc(l) });
  const linies = [
    meritacio('salariBase', t('Salari base'), e.salariBase),
    meritacio('complementsSalarials', t('Antiguitat'), ANTIGUITAT),
    meritacio('complementsSalarials', t('Plus de conveni'), e.complementsSalarials - ANTIGUITAT),
    meritacio('noSalarials', t('Plus de transport'), e.noSalarials),
    meritacio('prorrata', t('Prorrata pagues extres'), r.prorrata, t('En aquest exemple: 2 pagues de {paga} ÷ 12 = {prorrata} cada mes.', { paga: fmt(e.importPagaExtra), prorrata: fmt(r.prorrata) })),
    deduccio('cc', t('Contingències comunes'), lin.cc),
    deduccio('atur', t('Desocupació'), lin.atur),
    deduccio('fp', t('Formació professional'), lin.fp),
    deduccio('mei', 'MEI', lin.mei),
    deduccio('irpf', 'IRPF', r.irpf, t("En aquest exemple: {base} × {tipus} = {import}. El percentatge surt del sou de tot l'any i de la situació familiar (model 145).", { base: fmt(r.irpf.base), tipus: `${n2(r.irpf.tipus)} %`, import: fmt(r.irpf.import) })),
  ];
  const filesTaula = () => linies.map((l) => `
      <tr data-fila>
        <td class="np-c-punt">${punt(l.clau, l.concepte, l.detall)}</td>
        <td class="np-num">${l.quantia}</td>
        <td>${esc(l.concepte.toUpperCase())}</td>
        <td class="np-num">${l.preu ?? ''}</td>
        <td class="np-num">${l.deduccio != null ? n2(l.deduccio) : ''}</td>
        <td class="np-num">${l.total != null ? n2(l.total) : ''}</td>
      </tr>`).join('');

  const remuneracio = r.totalMeritat - r.prorrata - e.noSalarials;
  const html = `
    <h1>${t('Nòmina explicada')}</h1>
    <p class="intro">${t("Una nòmina d'exemple com les de veritat. Toca els punts taronja per saber què és cada apartat. Les dades són inventades; els percentatges són els oficials de {any}.", { any })}</p>
    <p><button type="button" class="boto" id="np-comenca">${t('Explica-la pas a pas')}</button></p>
    <p class="petit np-llisca">${t('Al mòbil, llisca la nòmina de costat per veure-la sencera.')}</p>

    <div class="np-marc">
    <div class="np-scroll">
    <section class="nomina-paper" aria-label="${esc(t("Nòmina d'exemple"))}">
      <div class="np-cap">
        <div class="np-caixa" data-fila>
          <div class="np-cel np-ample"><b>${punt('empresa', t('Empresa'))}${t('EMPRESA')}</b><span>EMPRESA EXEMPLE, SL</span></div>
          <div class="np-cel np-ample"><b>${t('Domicili')}</b><span>C. MAJOR, 1 · 08000</span></div>
          <div class="np-cel"><b>C.I.F.</b><span>B00000000</span></div>
          <div class="np-cel"><b>${t('Núm. inscrip. S.S.')}</b><span>08 0000000000</span></div>
        </div>
        <div class="np-caixa" data-fila>
          <div class="np-cel np-ample"><b>${punt('treballador', t('Treballador/a'))}${t('TREBALLADOR/A')}</b><span>PERSONA EXEMPLE</span></div>
          <div class="np-cel"><b>${t('Categoria')}</b><span>${esc(t('Oficial administratiu/iva').toUpperCase())}</span></div>
          <div class="np-cel"><b>${t('Antiguitat')}</b><span>01/03/2019</span></div>
          <div class="np-cel"><b>${t('Núm. afiliació')}</b><span>08 00000000 00</span></div>
          <div class="np-cel np-gc" data-fila><b>${punt('grup', t('Grup de cotització'))}G.C.</b><span>05</span></div>
          <div class="np-cel np-ample"><b>N.I.F.</b><span>00000000T</span></div>
        </div>
      </div>

      <div class="np-periode">
        <div class="np-cel" data-fila><b>${punt('periode', t('Període de liquidació'))}${t('Període de liquidació')}</b><span>01/10/${any} – 31/10/${any}</span></div>
        <div class="np-cel" data-fila><b>${punt('dies', t('Total dies'))}${t('Total dies')}</b><span>${DIES}</span></div>
        <div class="np-cel"><b>${t('Import total')}</b><span>${n2(r.net)}</span></div>
      </div>

      <table class="np-taula">
        <thead><tr data-fila>
          <th class="np-c-punt">${punt('columnes', t('Com es llegeix cada línia'))}</th>
          <th>${t('Quantia')}</th><th>${t('Conceptes')}</th><th>${t('Import')}</th><th>${t('Deducció')}</th><th>${t('Totals')}</th>
        </tr></thead>
        <tbody>${filesTaula()}<tr class="np-buit"><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody>
      </table>

      <div class="np-totals">
        <div class="np-cel" data-fila><b>${punt('totalMeritat', t('Total meritat'), t('En aquest exemple: {sou} de sou + {transport} de plus de transport + {prorrata} de prorrata = {total}.', { sou: fmt(e.salariBase + e.complementsSalarials), transport: fmt(e.noSalarials), prorrata: fmt(r.prorrata), total: fmt(r.totalMeritat) }))}${t('Total meritat')}</b><span>${n2(r.totalMeritat)}</span></div>
        <div class="np-cel" data-fila><b>${punt('totalDeduir', t('Total a deduir'), t("En aquest exemple: {ss} de Seguretat Social + {irpf} d'IRPF = {total}.", { ss: fmt(r.totalSS), irpf: fmt(r.irpf.import), total: fmt(r.totalDeduccions) }))}${t('Total a deduir')}</b><span>${n2(r.totalDeduccions)}</span></div>
        <div class="np-cel np-liquid" data-fila><b>${punt('net', t('Líquid a percebre'), t('En aquest exemple: {a} − {b} = {net}.', { a: fmt(r.totalMeritat), b: fmt(r.totalDeduccions), net: fmt(r.net) }))}${t('LÍQUID A PERCEBRE')}</b><span>${n2(r.net)}</span></div>
      </div>

      <div class="np-bases">
        <p class="np-bases-titol">${t("DETERMINACIÓ DE LES BASES DE COTITZACIÓ A LA SEGURETAT SOCIAL I CONCEPTES DE RECAPTACIÓ CONJUNTA I DE LA BASE SUBJECTA A RETENCIÓ DE L'IRPF I APORTACIÓ DE L'EMPRESA")}</p>
        <table>
          <thead><tr data-fila><th class="np-c-punt"></th><th>${t('Concepte')}</th><th class="np-num">${t('Base')}</th><th class="np-num">${t('Tipus')}</th>
            <th class="np-num">${emp ? `${punt('aportacioEmpresa', t("Aportació de l'empresa"), t("En aquest exemple l'empresa paga {emp} més. El que costa el teu sou a l'empresa és {cost} ({brut} + {emp}).", { emp: fmt(totalEmp), cost: fmt(r.totalMeritat + totalEmp), brut: fmt(r.totalMeritat) }))}` : ''}${t('Aportació empresa')}</th></tr></thead>
          <tbody>
            <tr data-fila><td class="np-c-punt">${punt('bccc', t('Base de contingències comunes'), t('En aquest exemple: {mes} del mes + {prorrata} de prorrata = {base}. El plus de transport no hi compta.', { mes: fmt(remuneracio), prorrata: fmt(r.prorrata), base: fmt(r.bccc) }))}</td>
              <td>${t('1. Contingències comunes')}<br><small>${t('Import remuneració mensual')} … ${n2(remuneracio)}<br>${t('Import prorrata pagues extres')} … ${n2(r.prorrata)}</small></td>
              <td class="np-num">${n2(r.bccc)}</td><td class="np-num">${emp ? n2(empLinies[0].tipus) : ''}</td><td class="np-num">${emp ? n2(empLinies[0].import) : ''}</td></tr>
            ${empLinies.slice(1, 2).map((l) => `<tr><td></td><td class="np-sang">${l.nom}</td><td></td><td class="np-num">${n2(l.tipus)}</td><td class="np-num">${n2(l.import)}</td></tr>`).join('')}
            <tr data-fila><td class="np-c-punt">${punt('bccp', t('Base de contingències professionals'))}</td>
              <td>${t('2. Contingències professionals i conceptes de recaptació conjunta')}</td>
              <td class="np-num">${n2(r.bccp)}</td><td></td><td></td></tr>
            ${empLinies.slice(2).map((l) => `<tr><td></td><td class="np-sang">${l.nom}</td><td></td><td class="np-num">${n2(l.tipus)}</td><td class="np-num">${n2(l.import)}</td></tr>`).join('')}
            <tr data-fila><td class="np-c-punt">${punt('he', t('Hores extraordinàries'))}</td><td>${t('3. Cotització addicional hores extraordinàries')}</td><td class="np-num">0,00</td><td></td><td></td></tr>
            <tr data-fila><td class="np-c-punt">${punt('baseIRPF', t("Base subjecta a retenció de l'IRPF"))}</td><td>${t("4. Base subjecta a retenció de l'IRPF")}</td><td class="np-num">${n2(r.irpf.base)}</td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>

      <div class="np-firmes" data-fila>
        <div class="np-cel"><b>${punt('firma', t('Signatura i segell'))}${t("Signatura i segell de l'empresa")}</b></div>
        <div class="np-cel"><b>${t('Rebut treballador/a')}: 10/${any}</b></div>
      </div>
    </section>
    </div>

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
    </div>
    <p class="petit">${t('Vols comprovar la teva? Ves a <a href="#/nomina">Comprovar nòmina</a> i posa-hi les xifres de la teva nòmina.')}</p>
  `;
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  el.append(tpl.content);

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
