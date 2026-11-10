import { calculaNomina, fmt } from './calc.js';
import { seccioModel145, llegeixLlistes145, enllacaModel145 } from './model145.js';
import { explicacions as expl, glossari as gloss } from './textos.js';
import { glossari as glossLlum } from '../llum/textos.js';
import { t } from '../i18n.js';
import { seccioPdf, enllacaPdf, resumLectura, CAMPS_PDF } from './vista-pdf.js';

// ---------- Estat del formulari (memòria; opcionalment al dispositiu) ----------
const CLAU = 'pdc.nomina.v1';
const PER_DEFECTE = {
  salariBase: '', complementsSalarials: '', noSalarials: '', horesExtres: '', horesExtresForcaMajor: false,
  pagues: '14', prorratejades: false, importPagaExtra: '',
  contracte: 'indefinit', contracteMenysUnAny: false, jornada: '100',
  irpfNomina: '', netNomina: '', grup: '7',
  situacioFamiliar: '3', anyNaixement: '', discapacitat: 'cap', mobilitatReduida: false, mobilitatGeografica: false,
  descendents: [], ascendents: [], pensioCompensatoria: '', anualitatsAliments: '', prestecHabitatge: false,
  recordar: false,
};

function llegeixDesat() {
  try { const v = localStorage.getItem(CLAU); return v ? JSON.parse(v) : null; } catch { return null; }
}
let estat = { ...PER_DEFECTE, ...(llegeixDesat() ?? {}) };
let lectura = null; // última nòmina llegida d'un PDF (només en memòria)

function desa() {
  try {
    if (estat.recordar) localStorage.setItem(CLAU, JSON.stringify(estat));
    else localStorage.removeItem(CLAU);
  } catch { /* emmagatzematge no disponible */ }
}

const h = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content; };
const pct = (n) => `${String(n).replace('.', ',')} %`;

// ---------- Inici ----------
export function vistaInici(el) {
  el.append(h(`
    <section class="heroi">
      <h1>${t('Entén els teus <span>papers</span>')}</h1>
      <p>${t('Explicacions en llenguatge planer dels documents de casa. Sense registre i sense enviar res enlloc: tot es calcula al teu dispositiu.')}</p>
    </section>
    <div class="targetes">
      <a class="targeta" href="#/nomina">
        <img class="targeta-icona" src="icons/nomina.svg" alt="" width="40" height="40">
        <h2>${t('Nòmina')}</h2>
        <p>${t('Comprova si els càlculs quadren i entén cada línia: cotitzacions, IRPF, pagues extres.')}</p>
      </a>
      <a class="targeta" href="#/nomina/exemple">
        <svg class="targeta-icona" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="#ff8a1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5h15l6 6v24H10z"/><path d="M15 15h8M15 21h11M15 27h6" stroke="#f5efe6"/><circle cx="29" cy="29" r="5" fill="#ff8a1f" stroke="none"/></svg>
        <h2>${t('Nòmina explicada')} <span class="etiqueta">${t('Nou')}</span></h2>
        <p>${t("Una nòmina d'exemple amb punts: toca cada concepte i et diu què és.")}</p>
      </a>
      <a class="targeta" href="#/simular">
        <svg class="targeta-icona" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="#ff8a1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="5" width="24" height="30" rx="4"/><rect x="12" y="9" width="16" height="7" rx="1.5"/><path d="M13 22h2M19 22h2M25 22h2M13 28h2M19 28h2M25 28h2" stroke="#f5efe6"/></svg>
        <h2>${t('Simulador')}</h2>
        <p>${t('Si em pugen 100 €, quant cobro net? I amb reducció de jornada? I amb pagues prorratejades?')}</p>
      </a>
      <a class="targeta" href="#/glossari">
        <svg class="targeta-icona" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="#ff8a1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11c-4-3-9-3-13-2v22c4-1 9-1 13 2 4-3 9-3 13-2V9c-4-1-9-1-13 2z"/><path d="M20 11v22"/><path d="M11 16h5M11 21h5M24 16h5M24 21h5" stroke="#f5efe6"/></svg>
        <h2>${t('Glossari')}</h2>
        <p>${t('Què vol dir base de cotització, meritacions, líquid a percebre...')}</p>
      </a>
      <a class="targeta" href="#/llum">
        <svg class="targeta-icona" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="#ff8a1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 25c-3-2.5-5-6-5-9.5a11 11 0 0 1 22 0c0 3.5-2 7-5 9.5v4H14z"/><path d="M15 33h10M17 37h6" stroke="#f5efe6"/><path d="M21 12l-3 6h5l-3 6" stroke="#f5efe6"/></svg>
        <h2>${t('Factura de llum')} <span class="etiqueta">${t('Nou')}</span></h2>
        <p>${t('Comprova la factura i entén potència, energia, peatges, impostos i comptador. Descobreix si et sobra potència.')}</p>
      </a>
      <div class="targeta desactivada" aria-disabled="true">
        <svg class="targeta-icona" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="#ff8a1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L20 7l14 12"/><path d="M10 16v17h20V16"/><path d="M17 33v-9h6v9" stroke="#f5efe6"/></svg>
        <h2>${t('Aigua, gas i IBI')} <span class="etiqueta">${t('Més endavant')}</span></h2>
        <p>${t('La resta de rebuts de casa.')}</p>
      </div>
    </div>
  `));
}

// ---------- Comprovar nòmina ----------
function camp(nom, etiqueta, { tipus = 'number', ajuda, sufix = '€', min = 0, step = '0.01', placeholder = '' } = {}) {
  return `
    <div class="camp">
      <label for="f-${nom}">${etiqueta}</label>
      <div class="entrada"><input id="f-${nom}" name="${nom}" type="${tipus}" inputmode="decimal" min="${min}" step="${step}" placeholder="${placeholder}" value="${estat[nom] ?? ''}"><span class="sufix">${sufix}</span></div>
      ${ajuda ? `<details class="ajuda"><summary>${t('Què és?')}</summary><p>${ajuda}</p></details>` : ''}
    </div>`;
}
function casella(nom, etiqueta) {
  return `<label class="casella"><input type="checkbox" name="${nom}" ${estat[nom] ? 'checked' : ''}> ${etiqueta}</label>`;
}

export function vistaNomina(el, dades) {
  const explicacions = expl();
  el.append(h(`
    <h1>${t('Comprovar la nòmina')}</h1>
    <p class="intro">${t("Copia les xifres de la teva nòmina d'un mes normal (sense paga extra). Els resultats s'actualitzen mentre escrius.")} <a href="#/nomina/exemple">${t('No saps on és cada cosa? Mira la nòmina explicada.')}</a></p>
    ${lectura ? resumLectura(lectura, dades) : seccioPdf()}
    <div class="dues-columnes">
      <form id="form-nomina" class="formulari" autocomplete="off" onsubmit="return false">
        <fieldset>
          <legend>${t('Meritacions (el que guanyes)')}</legend>
          ${camp('salariBase', t('Salari base'), { ajuda: explicacions.salariBase })}
          ${camp('complementsSalarials', t('Complements salarials (suma)'), { ajuda: explicacions.complementsSalarials, placeholder: '0' })}
          ${camp('noSalarials', t('Conceptes no salarials (dietes, transport...)'), { ajuda: explicacions.noSalarials, placeholder: '0' })}
          ${camp('horesExtres', t('Hores extres'), { ajuda: explicacions.horesExtres, placeholder: '0' })}
          ${casella('horesExtresForcaMajor', t('Les hores extres són per força major'))}
        </fieldset>
        <fieldset>
          <legend>${t('Pagues extres')}</legend>
          <div class="camp">
            <label for="f-pagues">${t("Nombre de pagues a l'any")}</label>
            <select id="f-pagues" name="pagues">
              ${[12, 14, 15, 16].map((n) => `<option value="${n}" ${String(estat.pagues) === String(n) ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          ${casella('prorratejades', t('Les pagues extres estan prorratejades (les cobro cada mes)'))}
          ${camp('importPagaExtra', t('Import de cada paga extra'), { ajuda: t('Si no ho saps, deixa-ho en blanc i es farà servir el salari base. Mira el conveni: sovint és salari base + antiguitat.'), placeholder: t('igual al salari base') })}
        </fieldset>
        <fieldset>
          <legend>${t('Contracte')}</legend>
          <div class="camp">
            <label for="f-contracte">${t('Tipus de contracte')}</label>
            <select id="f-contracte" name="contracte">
              <option value="indefinit" ${estat.contracte === 'indefinit' ? 'selected' : ''}>${t('Indefinit')}</option>
              <option value="temporal" ${estat.contracte === 'temporal' ? 'selected' : ''}>${t('Temporal')}</option>
            </select>
          </div>
          ${casella('contracteMenysUnAny', t('Contracte de durada inferior a un any'))}
          <div class="camp">
            <label for="f-grup">${t('Grup de cotització')}</label>
            <select id="f-grup" name="grup">
              ${Object.entries(dades.grupsCotitzacio).map(([k, v]) => `<option value="${k}" ${String(estat.grup) === k ? 'selected' : ''}>${k}. ${t(v)}</option>`).join('')}
            </select>
            <details class="ajuda"><summary>${t('On ho trobo?')}</summary><p>${t('Surt a la capçalera de la nòmina com a «grup de cotització» o «grup tarifa». Només afecta la base mínima.')}</p></details>
          </div>
          ${camp('jornada', t('Jornada'), { sufix: '%', step: '1', min: 1, ajuda: t('100 % si treballes a jornada completa. Si fas mitja jornada, 50 %.') })}
        </fieldset>
        <fieldset>
          <legend>IRPF</legend>
          ${camp('irpfNomina', t("Percentatge d'IRPF de la nòmina"), { sufix: '%', ajuda: `${explicacions.irpf} ${t('Si el deixes en blanc, es farà servir el càlcul amb el teu model 145.')}`, placeholder: t('calcular') })}
        </fieldset>
        ${seccioModel145(estat)}
        <fieldset>
          <legend>${t('Per comprovar')}</legend>
          ${camp('netNomina', t('Líquid a percebre de la nòmina'), { ajuda: explicacions.net, placeholder: t('opcional') })}
        </fieldset>
        <div class="accions">
          ${casella('recordar', t('Recordar aquestes dades en aquest dispositiu'))}
          <button type="button" class="boto secundari" id="esborrar">${t('Esborrar dades')}</button>
        </div>
      </form>
      <section id="resultat" class="resultat" aria-live="polite"></section>
    </div>
    <button type="button" class="resum-mobil" id="resum-mobil" hidden></button>
  `));

  const form = el.querySelector('#form-nomina');
  const resum = el.querySelector('#resum-mobil');
  resum.addEventListener('click', () => el.querySelector('#resultat').scrollIntoView({ behavior: 'smooth' }));
  const sortida = el.querySelector('#resultat');
  const actualitza = () => {
    for (const inp of form.elements) {
      if (!inp.name || inp.closest('[data-llista]')) continue;
      if (inp.type === 'radio' && !inp.checked) continue;
      estat[inp.name] = inp.type === 'checkbox' ? inp.checked : inp.value;
    }
    Object.assign(estat, llegeixLlistes145(form));
    desa();
    pintaResultat(sortida, dades);
  };
  form.addEventListener('input', actualitza);
  form.addEventListener('change', actualitza);
  enllacaModel145(form, actualitza);
  const tornaAPintar = () => { el.innerHTML = ''; vistaNomina(el, dades); };
  if (lectura) {
    el.querySelector('#treu-lectura').addEventListener('click', () => {
      for (const c of CAMPS_PDF) estat[c] = PER_DEFECTE[c];
      lectura = null;
      desa();
      tornaAPintar();
    });
  } else {
    enllacaPdf(el, (l) => {
      for (const c of CAMPS_PDF) estat[c] = PER_DEFECTE[c];
      for (const [k, v] of Object.entries(l.valors)) estat[k] = typeof v === 'number' ? String(v) : v;
      lectura = l;
      desa();
      tornaAPintar();
      el.querySelector('.lectura-pdf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  el.querySelector('#esborrar').addEventListener('click', () => {
    lectura = null;
    estat = { ...PER_DEFECTE };
    desa();
    el.innerHTML = '';
    vistaNomina(el, dades);
  });
  pintaResultat(sortida, dades);
}

function pintaResultat(sortida, dades) {
  const explicacions = expl();
  const resum = document.getElementById('resum-mobil');
  if (resum) resum.hidden = true;
  if (!(parseFloat(estat.salariBase) > 0)) {
    sortida.innerHTML = `<div class="buit"><p>${t('Introdueix almenys el <strong>salari base</strong> per veure el càlcul.')}</p><p class="petit">${t('Exemple:')} <button type="button" class="enllac" id="exemple">${t("carrega una nòmina d'exemple")}</button>.</p></div>`;
    sortida.querySelector('#exemple').addEventListener('click', () => {
      Object.assign(estat, { salariBase: '1650', complementsSalarials: '180', noSalarials: '60', pagues: '14', irpfNomina: '11', netNomina: '1551.86' });
      const vista = document.getElementById('vista');
      vista.innerHTML = '';
      vistaNomina(vista, dades);
    });
    return;
  }
  const r = calculaNomina(estat, dades);
  const e = r.entrada;
  if (resum) {
    const alertes = r.avisos.filter((a) => a.nivell === 'alerta').length;
    resum.textContent = `${t('Net')}: ${fmt(r.net)}${alertes ? ` · ⚠ ${alertes}` : ''} — ${t('veure detall')} ↓`;
    resum.hidden = false;
  }

  const filaMeritacio = (nom, valor, ajuda) => valor ? `<tr><td>${linia(nom, ajuda)}</td><td class="num">${fmt(valor)}</td></tr>` : '';
  const ssFiles = r.linies.map((l) => `
    <tr><td>${linia(l.nom, explicacions[l.clau])}<span class="detall">${l.tipus != null ? t('{pct} de {base}', { pct: pct(l.tipus), base: fmt(l.base) }) : t("sobre {base} d'excés", { base: fmt(l.base) })}</span></td>
    <td class="num">−${fmt(l.import)}</td></tr>`).join('');

  sortida.innerHTML = `
    <div class="xifra-net">
      <span>${t('Líquid a percebre calculat')}</span>
      <strong>${fmt(r.net)}</strong>
      <span class="petit">${t('Net anual aproximat')}: ${fmt(r.netAnual)} · ${t('Brut anual')}: ${fmt(r.brutAnual)}</span>
    </div>
    ${r.avisos.map((a) => `<div class="avis ${a.nivell}">${a.text}</div>`).join('')}

    <h2>${t('Línia a línia')}</h2>
    <table class="taula">
      <thead><tr><th colspan="2">${t('Meritacions')}</th></tr></thead>
      <tbody>
        ${filaMeritacio(t('Salari base'), e.salariBase, explicacions.salariBase)}
        ${filaMeritacio(t('Complements salarials'), e.complementsSalarials, explicacions.complementsSalarials)}
        ${filaMeritacio(t('Hores extres'), e.horesExtres, explicacions.horesExtres)}
        ${e.prorratejades ? filaMeritacio(t('Prorrata pagues extres'), r.prorrata, explicacions.prorrata) : ''}
        ${filaMeritacio(t('Conceptes no salarials'), e.noSalarials, explicacions.noSalarials)}
        <tr class="total"><td>${t('Total meritat')}</td><td class="num">${fmt(r.totalMeritat)}</td></tr>
      </tbody>
      <thead><tr><th colspan="2">${t('Deduccions')}</th></tr></thead>
      <tbody>
        ${ssFiles}
        <tr class="subtotal"><td>${t('Total Seguretat Social')}</td><td class="num">−${fmt(r.totalSS)}</td></tr>
        <tr><td>${linia('IRPF', explicacions.irpf)}<span class="detall">${t('{pct} de {base}', { pct: pct(r.irpf.tipus), base: fmt(r.irpf.base) })} ${r.irpf.font === 'estimacio' ? t('(estimat)') : t('(de la teva nòmina)')}</span></td><td class="num">−${fmt(r.irpf.import)}</td></tr>
        <tr class="total"><td>${t('Total deduccions')}</td><td class="num">−${fmt(r.totalDeduccions)}</td></tr>
      </tbody>
      <tbody>
        <tr class="total gran"><td>${t('Líquid a percebre')}</td><td class="num">${fmt(r.net)}</td></tr>
      </tbody>
    </table>

    <h2>${t('Bases de cotització')}</h2>
    <table class="taula">
      <tr><td>${linia(t('Prorrata de pagues extres'), explicacions.prorrata)}</td><td class="num">${fmt(r.prorrata)}</td></tr>
      <tr><td>${linia(t('Base contingències comunes'), explicacions.bccc)}</td><td class="num">${fmt(r.bccc)}</td></tr>
      <tr><td>${linia(t('Base contingències professionals'), explicacions.bccp)}</td><td class="num">${fmt(r.bccp)}</td></tr>
    </table>

    ${r.pagaExtra ? `
    <h2>${t('El mes de paga extra')}</h2>
    <p>${t("A més de la nòmina normal, cobraràs {n} pagues de {brut} bruts. No cotitzen a part (ja s'ha fet cada mes amb la prorrata); només se'n descompta l'IRPF (−{irpf}), així que en cobraràs uns <strong>{net}</strong> nets cadascuna.", { n: r.entrada.pagues - 12, brut: fmt(r.pagaExtra.brut), irpf: fmt(r.pagaExtra.irpf), net: fmt(r.pagaExtra.net) })}</p>` : ''}

    ${detallIRPF(r.estimacioIRPF)}
  `;
}

function detallIRPF(est) {
  const sit = { 1: t('situació 1 (monoparental)'), 2: t('situació 2 (cònjuge amb rendes ≤ 1.500 €)'), 3: t('situació 3 (altres casos)') }[est.situacio];
  const m = est.detallMinim;
  return `
    <details class="ajuda gran">
      <summary>${t("Com es calcula el teu IRPF? (algoritme de l'AEAT)")}</summary>
      <table class="taula compacta">
        ${est.passos.map(([n, v]) => `<tr><td>${n}</td><td class="num">${fmt(v)}</td></tr>`).join('')}
        <tr class="total"><td>${t('Base per calcular la retenció')}</td><td class="num">${fmt(est.baseRetencio)}</td></tr>
        <tr><td>${t('Mínim personal i familiar')} <span class="detall">${t('tu')} ${fmt(m.contribuent)} · ${t('fills')} ${fmt(m.descendents)} · ${t('ascendents')} ${fmt(m.ascendents)} · ${t('discapacitat')} ${fmt(m.discapacitat)}</span></td><td class="num">${fmt(est.minim)}</td></tr>
        <tr><td>${t('Quota anual (escala sobre la base − escala sobre el mínim)')}${est.limitAplicat ? ` <span class="detall">${t("limitada al 43 % de l'excés sobre el límit excloent")}</span>` : ''}</td><td class="num">${fmt(est.quota)}</td></tr>
        ${est.minoracio ? `<tr><td>${t('Minoració per hipoteca anterior a 2013')}</td><td class="num">−${fmt(est.minoracio)}</td></tr>` : ''}
        <tr class="total gran"><td>${t('Tipus de retenció')}</td><td class="num">${pct(est.tipus)}</td></tr>
      </table>
      <p class="petit">${t('Calculat com a {sit}, {d} descendent(s) i {a} ascendent(s). Límit per sota del qual no hi ha retenció: {llindar}.', { sit, d: est.numDescendents, a: est.numAscendents, llindar: fmt(est.llindar) })}
      ${t('No inclou regularitzacions de mig any, altres pagadors, rendiments irregulars, Ceuta/Melilla/La Palma ni pensionistes o desocupats. El resultat final el dona la declaració de la renda.')}</p>
    </details>`;
}

function linia(nom, ajuda) {
  if (!ajuda) return nom;
  return `<details class="linia"><summary>${nom}</summary><p>${ajuda}</p></details>`;
}

// ---------- Simulador ----------
export function vistaSimular(el, dades) {
  const sim = { augment: 0, jornada: Number(estat.jornada) || 100, prorratejades: !!estat.prorratejades };
  const teBase = parseFloat(estat.salariBase) > 0;

  el.append(h(`
    <h1>${t('Simular situacions')}</h1>
    ${teBase ? `<p class="intro">${t('Partim de les dades de la teva nòmina. Mou els controls per veure què canviaria.')}</p>`
      : `<div class="avis info">${t('Primer omple la teva nòmina a <a href="#/nomina">Comprovar nòmina</a>. Mentrestant, fem servir un exemple de 1.800 € bruts en 14 pagues.')}</div>`}
    <div class="preselec">
      <button type="button" class="boto secundari" data-p="augment">${t('Si em pugen 100 € bruts')}</button>
      <button type="button" class="boto secundari" data-p="jornada">${t('Reducció de jornada al 80 %')}</button>
      <button type="button" class="boto secundari" data-p="prorrateig">${t('Pagues prorratejades o no')}</button>
      <button type="button" class="boto secundari" data-p="reset">${t("Tornar a l'inici")}</button>
    </div>
    <div class="dues-columnes">
      <form class="formulari" onsubmit="return false">
        <fieldset>
          <legend>${t('Canvis')}</legend>
          <div class="camp">
            <label for="s-augment">${t('Augment de sou brut mensual')}</label>
            <div class="entrada"><input id="s-augment" type="number" step="10" value="0"><span class="sufix">€</span></div>
          </div>
          <div class="camp">
            <label for="s-jornada">${t('Jornada')}: <output id="s-jornada-val">${sim.jornada} %</output></label>
            <input id="s-jornada" type="range" min="10" max="100" step="5" value="${sim.jornada}">
          </div>
          <label class="casella"><input id="s-prorrateig" type="checkbox" ${sim.prorratejades ? 'checked' : ''}> ${t('Pagues extres prorratejades')}</label>
        </fieldset>
      </form>
      <section id="sim-resultat" class="resultat" aria-live="polite"></section>
    </div>
  `));

  const base = teBase ? { ...estat } : { ...PER_DEFECTE, salariBase: '1800', pagues: '14' };
  const sortida = el.querySelector('#sim-resultat');
  const inAug = el.querySelector('#s-augment');
  const inJor = el.querySelector('#s-jornada');
  const inPro = el.querySelector('#s-prorrateig');

  const pinta = () => {
    sim.augment = parseFloat(inAug.value) || 0;
    sim.jornada = Number(inJor.value);
    sim.prorratejades = inPro.checked;
    el.querySelector('#s-jornada-val').textContent = `${sim.jornada} %`;
    pintaSimulacio(sortida, dades, base, sim);
  };
  [inAug, inJor, inPro].forEach((i) => i.addEventListener('input', pinta));
  el.querySelector('.preselec').addEventListener('click', (ev) => {
    const p = ev.target.dataset?.p;
    if (!p) return;
    if (p === 'augment') inAug.value = (parseFloat(inAug.value) || 0) + 100;
    if (p === 'jornada') inJor.value = 80;
    if (p === 'prorrateig') inPro.checked = !inPro.checked;
    if (p === 'reset') { inAug.value = 0; inJor.value = Number(base.jornada) || 100; inPro.checked = !!base.prorratejades; }
    pinta();
  });
  pinta();
}

function aplicaSimulacio(base, sim) {
  const jorBase = Number(base.jornada) || 100;
  const factor = sim.jornada / jorBase;
  const n = (v) => parseFloat(v) || 0;
  const s = { ...base };
  s.salariBase = (n(base.salariBase) + sim.augment) * factor;
  s.complementsSalarials = n(base.complementsSalarials) * factor;
  s.horesExtres = n(base.horesExtres) * factor;
  if (base.importPagaExtra !== '' && base.importPagaExtra != null) s.importPagaExtra = (n(base.importPagaExtra) + sim.augment) * factor;
  s.jornada = sim.jornada;
  s.prorratejades = sim.prorratejades;
  s.netNomina = '';
  return s;
}

function pintaSimulacio(sortida, dades, base, sim) {
  const ara = calculaNomina({ ...base, netNomina: '' }, dades);
  const simEntrada = aplicaSimulacio(base, sim);
  // Si l'usuari ha posat el seu IRPF, el desplacem amb la diferència d'estimacions
  if (base.irpfNomina !== '' && base.irpfNomina != null) {
    const estSim = calculaNomina({ ...simEntrada, irpfNomina: '' }, dades).estimacioIRPF.tipus;
    simEntrada.irpfNomina = Math.max(0, Math.round((parseFloat(base.irpfNomina) + estSim - ara.estimacioIRPF.tipus) * 100) / 100);
  }
  const nou = calculaNomina(simEntrada, dades);

  const fila = (nom, a, b, signe = 1) => {
    const d = Math.round((b - a) * 100) / 100;
    const cls = d === 0 ? '' : (d * signe > 0 ? 'puja' : 'baixa');
    return `<tr><td>${nom}</td><td class="num">${fmt(a)}</td><td class="num">${fmt(b)}</td><td class="num ${cls}">${d > 0 ? '+' : ''}${fmt(d)}</td></tr>`;
  };

  const difNet = nou.net - ara.net;
  const brutMesAra = ara.totalMeritat, brutMesNou = nou.totalMeritat;
  const difBrut = brutMesNou - brutMesAra;
  let frase = '';
  if (sim.augment && difBrut > 0) {
    frase = t("De cada euro brut que puja, te'n queden uns <strong>{c} cèntims</strong> nets cada mes.", { c: Math.round((difNet / difBrut) * 100) });
  }
  const difAny = nou.netAnual - ara.netAnual;

  sortida.innerHTML = `
    <div class="xifra-net">
      <span>${t('Net mensual simulat')}</span>
      <strong>${fmt(nou.net)}</strong>
      <span class="petit">${difNet >= 0 ? '+' : ''}${fmt(difNet)} ${t('al mes')} · ${difAny >= 0 ? '+' : ''}${fmt(difAny)} ${t("l'any")}</span>
    </div>
    ${frase ? `<div class="avis info">${frase}</div>` : ''}
    ${sim.prorratejades !== !!base.prorratejades ? `<div class="avis info">${t("Prorratejar les pagues no canvia el que cobres a l'any: només com es reparteix. El net mensual puja, però deixes de cobrar les pagues de juny i desembre.")}</div>` : ''}
    ${sim.jornada < (Number(base.jornada) || 100) ? `<div class="avis info">${t('En una reducció de jornada per cura de fills o familiars, durant uns anys la Seguretat Social et computa la cotització com si treballessis a jornada completa per a la jubilació i altres prestacions.')}</div>` : ''}
    <table class="taula comparativa">
      <thead><tr><th></th><th class="num">${t('Ara')}</th><th class="num">${t('Simulat')}</th><th class="num">${t('Diferència')}</th></tr></thead>
      <tbody>
        ${fila(t('Brut del mes'), brutMesAra, brutMesNou)}
        ${fila(t('Seguretat Social'), ara.totalSS, nou.totalSS, -1)}
        ${fila(`IRPF (${pct(ara.irpf.tipus)} → ${pct(nou.irpf.tipus)})`, ara.irpf.import, nou.irpf.import, -1)}
        ${fila(t('Net del mes'), ara.net, nou.net)}
        ${fila(t('Brut anual'), ara.brutAnual, nou.brutAnual)}
        ${fila(t('Net anual'), ara.netAnual, nou.netAnual)}
      </tbody>
    </table>
    <p class="petit">${t("L'IRPF simulat és una estimació.")} ${base.irpfNomina ? t('Partim del teu percentatge actual i hi sumem la variació estimada.') : ''}</p>
  `;
}

// ---------- Glossari ----------
export function vistaGlossari(el) {
  el.append(h(`
    <h1>${t('Glossari')}</h1>
    <div class="camp cerca"><label for="cerca">${t('Cerca un terme')}</label><input id="cerca" type="search" placeholder="${t('p. ex. base, IRPF, prorrata...')}"></div>
    <h2 class="seccio-glossari">${t('Nòmina')}</h2>
    <dl class="glossari">
      ${gloss().map(([terme, d]) => `<div class="terme"><dt>${terme}</dt><dd>${d}</dd></div>`).join('')}
    </dl>
    <h2 class="seccio-glossari">${t('Factura de llum')}</h2>
    <dl class="glossari">
      ${glossLlum().map(([terme, d]) => `<div class="terme"><dt>${terme}</dt><dd>${d}</dd></div>`).join('')}
    </dl>
  `));
  const cerca = el.querySelector('#cerca');
  const treuAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  cerca.addEventListener('input', () => {
    const q = treuAccents(cerca.value);
    el.querySelectorAll('.terme').forEach((x) => { x.hidden = q && !treuAccents(x.textContent).includes(q); });
    el.querySelectorAll('.glossari').forEach((dl) => { dl.previousElementSibling.hidden = ![...dl.children].some((x) => !x.hidden); });
  });
}
