// Pantalles de la factura de llum: comprovar i simular.
import { calculaFactura, aplicaSimulacio, diesEntre, PERIODES_ENERGIA } from './calc.js';
import { explicacions as expl } from './textos.js';
import { fmt } from '../nomina/calc.js';
import { t } from '../i18n.js';
import { peuResultat, resumLlum } from '../historial.js';
import { seccioPdf, enllacaPdf, resumLectura, CAMPS_PDF } from './vista-pdf.js';

const CLAU = 'pdc.llum.v1';
const PER_DEFECTE = {
  dataInici: '', dataFi: '', dies: '',
  potenciaP1: '', potenciaP2: '', preuPotenciaP1: '', preuPotenciaP2: '',
  unPreu: false, preuEnergia: '', preuEnergiaP1: '', preuEnergiaP2: '', preuEnergiaP3: '',
  consumP1: '', consumP2: '', consumP3: '',
  descompte: '', boSocialDia: '', lloguer: true, lloguerDia: '', altres: '',
  iva: '', impostElectric: '', totalFactura: '', maximetre: '',
  recordar: false,
};
const EXEMPLE = {
  dataInici: '2026-10-01', dataFi: '2026-10-31', dies: '',
  potenciaP1: '4.6', potenciaP2: '4.6', preuPotenciaP1: '0.098', preuPotenciaP2: '0.012',
  unPreu: false, preuEnergiaP1: '0.22', preuEnergiaP2: '0.15', preuEnergiaP3: '0.09',
  consumP1: '62', consumP2: '75', consumP3: '133',
  boSocialDia: '0.019', lloguer: true, maximetre: '3.1', totalFactura: '68.58',
};

const llegeixDesat = () => { try { const v = localStorage.getItem(CLAU); return v ? JSON.parse(v) : null; } catch { return null; } };
let estat = { ...PER_DEFECTE, ...(llegeixDesat() ?? {}) };
export const estatLlum = () => estat;
let lectura = null; // última factura llegida d'un PDF (només en memòria)
function desa() {
  try { if (estat.recordar) localStorage.setItem(CLAU, JSON.stringify(estat)); else localStorage.removeItem(CLAU); } catch { /* res */ }
}

const h = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content; };
const pct = (n) => `${String(Math.round(n * 100) / 100).replace('.', ',')} %`;
const nombre = (n, dec = 6) => String(Math.round(n * 10 ** dec) / 10 ** dec).replace('.', ',');
const ajuda = (text, titol = t('Què és?')) => (text ? `<details class="ajuda"><summary>${titol}</summary><p>${text}</p></details>` : '');
const linia = (nom, text) => (text ? `<details class="linia"><summary>${nom}</summary><p>${text}</p></details>` : nom);

function camp(nom, etiqueta, { sufix = '', tipus = 'number', step = 'any', placeholder = '', text } = {}) {
  const mode = tipus === 'number' ? ' inputmode="decimal"' : '';
  return `
    <div class="camp">
      <label for="l-${nom}">${etiqueta}</label>
      <div class="entrada"><input id="l-${nom}" name="${nom}" type="${tipus}"${mode} step="${step}" min="0" placeholder="${placeholder}" value="${estat[nom] ?? ''}">${sufix ? `<span class="sufix">${sufix}</span>` : ''}</div>
      ${ajuda(text)}
    </div>`;
}
const casella = (nom, etiqueta) => `<label class="casella"><input type="checkbox" name="${nom}" ${estat[nom] ? 'checked' : ''}> ${etiqueta}</label>`;

// ---------- Comprovar la factura ----------
export function vistaLlum(el, dades) {
  const x = expl();
  el.append(h(`
    <h1>${t('Comprovar la factura de llum')}</h1>
    <p class="intro">${t('Per a la tarifa domèstica 2.0TD (fins a 15 kW). Copia les xifres de la teva factura: el resultat s\'actualitza mentre escrius.')} <a href="#/llum/simular">${t('Simular canvis')} →</a> · <a href="#/llum/exemple">${t('No saps on és cada cosa? Mira la factura explicada.')}</a> · <a href="#/llum/bo-social">${t('Tinc dret al bo social?')}</a></p>
    ${lectura ? resumLectura(lectura) : seccioPdf()}
    <div class="dues-columnes">
      <form id="form-llum" class="formulari" autocomplete="off" onsubmit="return false">
        <fieldset>
          <legend>${t('Període de facturació')}</legend>
          <div class="graella">
            ${camp('dataInici', t('Des del'), { tipus: 'date' })}
            ${camp('dataFi', t('Fins al'), { tipus: 'date' })}
            ${camp('dies', t('Dies'), { step: '1', placeholder: t('automàtic') })}
          </div>
          <p class="petit">${t("Les dates serveixen per aplicar l'IVA i l'impost elèctric de cada moment (el 2026 han canviat).")}</p>
        </fieldset>
        <fieldset>
          <legend>${t('Potència')}</legend>
          <div class="graella">
            ${camp('potenciaP1', t('Potència punta (P1)'), { sufix: 'kW', text: x.potenciaP1 })}
            ${camp('potenciaP2', t('Potència vall (P2)'), { sufix: 'kW', placeholder: t('igual que P1'), text: x.potenciaP2 })}
          </div>
          <div class="graella">
            ${camp('preuPotenciaP1', t('Preu potència P1'), { sufix: '€/kW·dia', text: t("Surt a la factura com a «€/kW dia». Si el teu contracte el dona per any, divideix-lo per 365.") })}
            ${camp('preuPotenciaP2', t('Preu potència P2'), { sufix: '€/kW·dia' })}
          </div>
        </fieldset>
        <fieldset>
          <legend>${t('Energia consumida')}</legend>
          ${casella('unPreu', t("Tinc un preu únic d'energia (igual a totes les hores)"))}
          <div class="graella">
            ${camp('consumP1', t('Consum punta (P1)'), { sufix: 'kWh', text: x.energiaP1 })}
            ${camp('consumP2', t('Consum pla (P2)'), { sufix: 'kWh', text: x.energiaP2 })}
            ${camp('consumP3', t('Consum vall (P3)'), { sufix: 'kWh', text: x.energiaP3 })}
          </div>
          <div class="graella" data-preus="3" ${estat.unPreu ? 'hidden' : ''}>
            ${camp('preuEnergiaP1', t('Preu P1'), { sufix: '€/kWh' })}
            ${camp('preuEnergiaP2', t('Preu P2'), { sufix: '€/kWh' })}
            ${camp('preuEnergiaP3', t('Preu P3'), { sufix: '€/kWh' })}
          </div>
          <div data-preus="1" ${estat.unPreu ? '' : 'hidden'}>
            ${camp('preuEnergia', t("Preu de l'energia"), { sufix: '€/kWh' })}
          </div>
        </fieldset>
        <fieldset>
          <legend>${t('Altres conceptes')}</legend>
          ${camp('boSocialDia', t('Finançament del bo social'), { sufix: '€/dia', placeholder: '0', text: x.boSocial })}
          ${camp('descompte', t('Descomptes'), { sufix: '€', placeholder: '0', text: x.descompte })}
          ${casella('lloguer', t('Pago lloguer del comptador'))}
          ${camp('lloguerDia', t('Lloguer del comptador'), { sufix: '€/dia', placeholder: nombre(dades.lloguerComptador.monofasicEurDia), text: x.lloguer })}
          ${camp('altres', t('Altres serveis (manteniment, assegurances...)'), { sufix: '€', placeholder: '0', text: x.altres })}
        </fieldset>
        <fieldset>
          <legend>${t('Impostos')}</legend>
          <p class="petit">${t("Deixa-ho en blanc i es calcularan segons les dates. Escriu-los només si la teva factura n'aplica uns altres.")}</p>
          <div class="graella">
            ${camp('impostElectric', t('Impost elèctric'), { sufix: '%', placeholder: t('automàtic'), text: x.impostElectric })}
            ${camp('iva', 'IVA', { sufix: '%', placeholder: t('automàtic'), text: x.iva })}
          </div>
        </fieldset>
        <fieldset>
          <legend>${t('Per comprovar')}</legend>
          ${camp('totalFactura', t('Total de la factura'), { sufix: '€', placeholder: t('opcional') })}
          ${camp('maximetre', t('Maxímetre (potència màxima utilitzada)'), { sufix: 'kW', placeholder: t('opcional'), text: x.maximetre })}
        </fieldset>
        <div class="accions">
          ${casella('recordar', t('Recordar aquestes dades en aquest dispositiu'))}
          <button type="button" class="boto secundari" id="esborrar-llum">${t('Esborrar dades')}</button>
        </div>
      </form>
      <section id="resultat-llum" class="resultat" aria-live="polite"></section>
    </div>
    <button type="button" class="resum-mobil" id="resum-mobil" hidden></button>
  `));

  const form = el.querySelector('#form-llum');
  const sortida = el.querySelector('#resultat-llum');
  el.querySelector('#resum-mobil').addEventListener('click', () => sortida.scrollIntoView({ behavior: 'smooth' }));
  const actualitza = () => {
    for (const inp of form.elements) if (inp.name) estat[inp.name] = inp.type === 'checkbox' ? inp.checked : inp.value;
    form.querySelector('[data-preus="3"]').hidden = !!estat.unPreu;
    form.querySelector('[data-preus="1"]').hidden = !estat.unPreu;
    const d = diesEntre(estat.dataInici, estat.dataFi);
    form.querySelector('#l-dies').placeholder = d ? String(d) : t('automàtic');
    desa();
    pintaResultat(sortida, dades);
  };
  form.addEventListener('input', actualitza);
  form.addEventListener('change', actualitza);
  const tornaAPintar = () => { el.innerHTML = ''; vistaLlum(el, dades); };
  const buida = () => { for (const c of CAMPS_PDF) estat[c] = PER_DEFECTE[c]; };
  if (lectura) {
    el.querySelector('#treu-lectura').addEventListener('click', () => { buida(); lectura = null; desa(); tornaAPintar(); });
  } else {
    enllacaPdf(el, (l) => {
      buida();
      Object.assign(estat, l.valors);
      lectura = l;
      desa();
      tornaAPintar();
      el.querySelector('.lectura-pdf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  el.querySelector('#esborrar-llum').addEventListener('click', () => {
    lectura = null;
    estat = { ...PER_DEFECTE };
    desa();
    el.innerHTML = '';
    vistaLlum(el, dades);
  });
  actualitza();
}

const teDades = () => parseFloat(estat.potenciaP1) > 0 || ['consumP1', 'consumP2', 'consumP3'].some((k) => parseFloat(estat[k]) > 0);

function pintaResultat(sortida, dades) {
  const x = expl();
  const resum = document.getElementById('resum-mobil');
  if (resum) resum.hidden = true;
  if (!teDades()) {
    sortida.innerHTML = `<div class="buit"><p>${t('Introdueix la <strong>potència</strong> i el <strong>consum</strong> per veure el càlcul.')}</p><p class="petit">${t('Exemple:')} <button type="button" class="enllac" id="exemple-llum">${t("carrega una factura d'exemple")}</button>.</p></div>`;
    sortida.querySelector('#exemple-llum').addEventListener('click', () => {
      Object.assign(estat, PER_DEFECTE, EXEMPLE, { recordar: estat.recordar });
      const vista = document.getElementById('vista');
      vista.innerHTML = '';
      vistaLlum(vista, dades);
    });
    return;
  }
  const r = calculaFactura(estat, dades);
  if (resum) {
    const alertes = r.avisos.filter((a) => a.nivell === 'alerta').length;
    resum.textContent = `${t('Total')}: ${fmt(r.total)}${alertes ? ` · ⚠ ${alertes}` : ''} — ${t('veure detall')} ↓`;
    resum.hidden = false;
  }

  const nomP = { P1: t('punta'), P2: t('pla'), P3: t('vall') };
  const nomPot = { P1: t('punta'), P2: t('vall') };
  const filesPot = r.liniesPotencia.filter((l) => l.kW > 0).map((l) => `
    <tr><td>${linia(`${t('Potència')} ${l.periode} (${nomPot[l.periode]})`, x[`potencia${l.periode}`])}<span class="detall">${nombre(l.kW, 3)} kW × ${r.dies} ${t('dies')} × ${nombre(l.preu)} €</span></td><td class="num">${fmt(l.import)}</td></tr>`).join('');
  const filesEne = r.liniesEnergia.filter((l) => l.kWh > 0).map((l) => `
    <tr><td>${linia(`${t('Energia')} ${l.periode} (${nomP[l.periode]})`, x[`energia${l.periode}`])}<span class="detall">${nombre(l.kWh, 2)} kWh × ${nombre(l.preu)} €</span></td><td class="num">${fmt(l.import)}</td></tr>`).join('');

  // On van els diners: peatges i càrrecs, comercialitzadora, impostos, comptador i altres
  const parts = [
    ['regulat', t('Peatges i càrrecs (BOE)'), r.regulat.total],
    ['comercial', t('Energia i marge de la comercialitzadora'), Math.max(0, r.potencia + r.energia + r.boSocial - r.descompte - r.regulat.total)],
    ['impostos', t('Impostos'), r.impostElectric + r.iva],
    ['altres', t('Comptador i altres'), r.lloguer + r.altres],
  ].filter(([, , v]) => v > 0.005);
  const suma = parts.reduce((s, [, , v]) => s + v, 0) || 1;

  sortida.innerHTML = `
    <div class="xifra-net">
      <span>${t('Total de la factura calculat')}</span>
      <strong>${fmt(r.total)}</strong>
      <span class="petit">${r.dies} ${t('dies')} · ${nombre(r.kWh, 2)} kWh${r.preuMigKWh ? ` · ${nombre(r.preuMigKWh, 3)} €/kWh ${t('de mitjana, tot inclòs')}` : ''} · ${t('Any aproximat')}: ${fmt(r.totalAnual)}</span>
    </div>
    ${r.avisos.map((a) => `<div class="avis ${a.nivell}">${a.text}</div>`).join('')}

    <h2>${t('On van els teus diners')}</h2>
    <div class="barra-parts" role="img" aria-label="${parts.map(([, n, v]) => `${n}: ${fmt(v)}`).join(', ')}">
      ${parts.map(([k, , v]) => `<span class="part-${k}" style="width:${(v / suma) * 100}%"></span>`).join('')}
    </div>
    <ul class="llegenda">
      ${parts.map(([k, n, v]) => `<li><span class="punt part-${k}"></span>${n}<strong>${fmt(v)} · ${Math.round((v / suma) * 100)} %</strong></li>`).join('')}
    </ul>
    ${ajuda(x.regulat, t('Què són els peatges i càrrecs?'))}

    <h2>${t('Línia a línia')}</h2>
    <table class="taula">
      <thead><tr><th colspan="2">${linia(t('Terme de potència'), x.potencia)}</th></tr></thead>
      <tbody>
        ${filesPot}
        <tr class="subtotal"><td>${t('Total potència')} <span class="detall">${t('dels quals peatges i càrrecs')}: ${fmt(r.regulat.potencia)}</span></td><td class="num">${fmt(r.potencia)}</td></tr>
      </tbody>
      <thead><tr><th colspan="2">${linia(t('Terme d\'energia'), x.energia)}</th></tr></thead>
      <tbody>
        ${filesEne}
        <tr class="subtotal"><td>${t('Total energia')} <span class="detall">${t('dels quals peatges i càrrecs')}: ${fmt(r.regulat.energia)}</span></td><td class="num">${fmt(r.energia)}</td></tr>
      </tbody>
      <tbody>
        ${r.boSocial ? `<tr><td>${linia(t('Finançament del bo social'), x.boSocial)}<span class="detall">${r.dies} ${t('dies')} × ${nombre(r.entrada.boSocialDia)} €</span></td><td class="num">${fmt(r.boSocial)}</td></tr>` : ''}
        ${r.descompte ? `<tr><td>${linia(t('Descomptes'), x.descompte)}</td><td class="num">−${fmt(r.descompte)}</td></tr>` : ''}
        <tr><td>${linia(t('Impost elèctric'), x.impostElectric)}<span class="detall">${t('{pct} de {base}', { pct: pct(r.tipusIEE), base: fmt(r.baseImpost) })}</span></td><td class="num">${fmt(r.impostElectric)}</td></tr>
        ${r.lloguer ? `<tr><td>${linia(t('Lloguer del comptador'), x.lloguer)}<span class="detall">${r.dies} ${t('dies')}</span></td><td class="num">${fmt(r.lloguer)}</td></tr>` : ''}
        ${r.altres ? `<tr><td>${linia(t('Altres serveis'), x.altres)}</td><td class="num">${fmt(r.altres)}</td></tr>` : ''}
        <tr class="subtotal"><td>${t('Base de l\'IVA')}</td><td class="num">${fmt(r.baseIVA)}</td></tr>
        <tr><td>${linia('IVA', x.iva)}<span class="detall">${t('{pct} de {base}', { pct: pct(r.tipusIVA), base: fmt(r.baseIVA) })}</span></td><td class="num">${fmt(r.iva)}</td></tr>
      </tbody>
      <tbody>
        <tr class="total gran"><td>${t('Total')}</td><td class="num">${fmt(r.total)}</td></tr>
      </tbody>
    </table>

    ${r.repartiment ? `
    <h2>${t('Quan gastes la llum')}</h2>
    <table class="taula compacta">
      ${PERIODES_ENERGIA.map((p) => `<tr><td>${linia(`${p} · ${nomP[p]}`, x[`energia${p}`])}</td><td class="num">${nombre(r.entrada.consum[p], 2)} kWh · ${Math.round(r.repartiment[p] * 100)} %</td></tr>`).join('')}
    </table>` : ''}

    <details class="ajuda gran">
      <summary>${t('Peatges i càrrecs oficials 2026 (2.0TD)')}</summary>
      <table class="taula compacta">
        ${r.liniesPotencia.map((l) => `<tr><td>${t('Potència')} ${l.periode}</td><td class="num">${nombre(l.preuRegulat)} €/kW·${t('dia')}</td></tr>`).join('')}
        ${r.liniesEnergia.map((l) => `<tr><td>${t('Energia')} ${l.periode}</td><td class="num">${nombre(l.preuRegulat)} €/kWh</td></tr>`).join('')}
      </table>
      <p class="petit">${t('Fonts: {fonts}.', { fonts: dades.fonts.slice(0, 2).map((f) => `<a href="${f.url}" target="_blank" rel="noopener">${f.nom.split(':')[0]}</a>`).join(', ') })}
      ${t("Si tens el PVPC, el preu de l'energia canvia cada hora; aquí pots posar el preu mitjà que surt a la factura.")}</p>
    </details>
  `;
  peuResultat(sortida, 'llum', { ...estat }, resumLlum(r), /^\d{4}-\d{2}/.test(estat.dataFi) ? estat.dataFi.slice(0, 7) : undefined);
}

// ---------- Simulador ----------
export function vistaSimularLlum(el, dades) {
  const base = teDades() ? { ...estat } : { ...PER_DEFECTE, ...EXEMPLE };
  const potActual = parseFloat(base.potenciaP1) || 4.6;
  const opcionsPot = [...new Set([...dades.potenciesNormalitzades, potActual])].sort((a, b) => a - b);

  el.append(h(`
    <h1>${t('Simular la factura de llum')}</h1>
    ${teDades() ? `<p class="intro">${t('Partim de la teva factura. Prova què passaria si canvies la potència, el moment en què gastes o la companyia.')}</p>`
      : `<div class="avis info">${t('Primer omple la teva factura a <a href="#/llum">Factura de llum</a>. Mentrestant, fem servir una factura d\'exemple.')}</div>`}
    <div class="dues-columnes">
      <form class="formulari" id="form-sim-llum" onsubmit="return false">
        <fieldset>
          <legend>${t('Potència')}</legend>
          <div class="camp">
            <label for="s-pot">${t('Potència contractada')}</label>
            <select id="s-pot">${opcionsPot.map((p) => `<option value="${p}" ${p === potActual ? 'selected' : ''}>${nombre(p, 3)} kW${p === potActual ? ` (${t('actual')})` : ''}</option>`).join('')}</select>
          </div>
        </fieldset>
        <fieldset>
          <legend>${t('Hàbits')}</legend>
          <div class="camp">
            <label for="s-desp">${t('Consum que passes a hores vall')}: <output id="s-desp-val">0 %</output></label>
            <input id="s-desp" type="range" min="0" max="60" step="5" value="0">
            <p class="petit">${t('Part del consum en punta i pla que mous a la nit o al cap de setmana (rentadora, rentaplats, cotxe elèctric...).')}</p>
          </div>
        </fieldset>
        <fieldset>
          <legend>${t('Comparar una altra oferta')}</legend>
          <p class="petit">${t("Deixa en blanc el que no canviï. Els preus són sense impostos, com surten a les ofertes.")}</p>
          <div class="graella">
            <div class="camp"><label for="o-pp1">${t('Preu potència P1')}</label><div class="entrada"><input id="o-pp1" type="number" inputmode="decimal" step="any" min="0"><span class="sufix">€/kW·dia</span></div></div>
            <div class="camp"><label for="o-pp2">${t('Preu potència P2')}</label><div class="entrada"><input id="o-pp2" type="number" inputmode="decimal" step="any" min="0"><span class="sufix">€/kW·dia</span></div></div>
          </div>
          <div class="camp"><label for="o-pu">${t("Preu únic d'energia")}</label><div class="entrada"><input id="o-pu" type="number" inputmode="decimal" step="any" min="0" placeholder="${t('o per períodes, a sota')}"><span class="sufix">€/kWh</span></div></div>
          <div class="graella">
            <div class="camp"><label for="o-p1">${t('Preu P1')}</label><div class="entrada"><input id="o-p1" type="number" inputmode="decimal" step="any" min="0"><span class="sufix">€/kWh</span></div></div>
            <div class="camp"><label for="o-p2">${t('Preu P2')}</label><div class="entrada"><input id="o-p2" type="number" inputmode="decimal" step="any" min="0"><span class="sufix">€/kWh</span></div></div>
            <div class="camp"><label for="o-p3">${t('Preu P3')}</label><div class="entrada"><input id="o-p3" type="number" inputmode="decimal" step="any" min="0"><span class="sufix">€/kWh</span></div></div>
          </div>
        </fieldset>
      </form>
      <section id="sim-llum" class="resultat" aria-live="polite"></section>
    </div>
  `));

  const form = el.querySelector('#form-sim-llum');
  const sortida = el.querySelector('#sim-llum');
  const v = (id) => el.querySelector(`#${id}`).value;
  const pinta = () => {
    const desplacament = Number(v('s-desp'));
    el.querySelector('#s-desp-val').textContent = `${desplacament} %`;
    let nova = aplicaSimulacio(base, { potencia: Number(v('s-pot')), desplacament });
    const oferta = {};
    if (v('o-pp1') !== '') oferta.preuPotenciaP1 = v('o-pp1');
    if (v('o-pp2') !== '') oferta.preuPotenciaP2 = v('o-pp2');
    if (v('o-pu') !== '') Object.assign(oferta, { unPreu: true, preuEnergia: v('o-pu') });
    else if (['o-p1', 'o-p2', 'o-p3'].some((id) => v(id) !== '')) {
      Object.assign(oferta, { unPreu: false,
        preuEnergiaP1: v('o-p1') || base.preuEnergiaP1 || base.preuEnergia,
        preuEnergiaP2: v('o-p2') || base.preuEnergiaP2 || base.preuEnergia,
        preuEnergiaP3: v('o-p3') || base.preuEnergiaP3 || base.preuEnergia });
    }
    nova = { ...nova, ...oferta };
    pintaSimulacio(sortida, dades, base, nova);
  };
  form.addEventListener('input', pinta);
  pinta();
}

function pintaSimulacio(sortida, dades, base, nova) {
  const ara = calculaFactura({ ...base, totalFactura: '' }, dades);
  const sim = calculaFactura(nova, dades);
  const fila = (nom, a, b) => {
    const d = Math.round((b - a) * 100) / 100;
    const cls = d === 0 ? '' : (d < 0 ? 'puja' : 'baixa');
    return `<tr><td>${nom}</td><td class="num">${fmt(a)}</td><td class="num">${fmt(b)}</td><td class="num ${cls}">${d > 0 ? '+' : ''}${fmt(d)}</td></tr>`;
  };
  const difAny = sim.totalAnual - ara.totalAnual;
  sortida.innerHTML = `
    <div class="xifra-net">
      <span>${t('Factura simulada')}</span>
      <strong>${fmt(sim.total)}</strong>
      <span class="petit">${difAny <= 0 ? t("Estalvi aproximat: {e} l'any", { e: fmt(-difAny) }) : t("Costaria uns {e} més l'any", { e: fmt(difAny) })}</span>
    </div>
    <table class="taula comparativa">
      <thead><tr><th></th><th class="num">${t('Ara')}</th><th class="num">${t('Simulat')}</th><th class="num">${t('Diferència')}</th></tr></thead>
      <tbody>
        ${fila(t('Potència'), ara.potencia, sim.potencia)}
        ${fila(t('Energia'), ara.energia, sim.energia)}
        ${fila(t('Impostos'), ara.impostElectric + ara.iva, sim.impostElectric + sim.iva)}
        ${fila(t('Total de la factura'), ara.total, sim.total)}
        ${fila(t('Total anual aproximat'), ara.totalAnual, sim.totalAnual)}
      </tbody>
    </table>
    <p class="petit">${t("Si baixes la potència, comprova abans el maxímetre de diversos mesos: si la superes, saltarà l'interruptor. Canviar de potència pot tenir un cost de tràmit a la distribuïdora.")}</p>
  `;
}
