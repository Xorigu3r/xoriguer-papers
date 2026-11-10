// Pantalla «Tinc dret al bo social?»: formulari de la llar i resultat (categoria, descompte, estalvi).
import { avaluaBoSocial } from './bo-social.js';
import { estatLlum } from './vistes.js';
import { calculaFactura } from './calc.js';
import { fmt } from '../nomina/calc.js';
import { t, locale } from '../i18n.js';

const nf = (v, dec = 0) => new Intl.NumberFormat(locale(), { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(v);
let estat = { adults: '1', menors: '0', ingressos: '', familiaNombrosa: false, pensionistes: false, imv: false, especial: false, potencia: '', consumAnual: '', preuEnergia: '' };

// Si ja hi ha una factura a «Comprovar», se n'agafen la potència, el consum de l'any i el preu de l'energia
function dadesDeLaFactura(dades) {
  const f = estatLlum();
  if (!(parseFloat(f.potenciaP1) > 0)) return {};
  const r = calculaFactura(f, dades);
  const preu = r.kWh > 0 ? r.energia / r.kWh : null;
  return { potencia: String(r.entrada.potencia.P1), consumAnual: r.kWh > 0 ? String(Math.round(r.kWh / r.dies * 365)) : '', preuEnergia: preu ? String(Math.round(preu * 1000) / 1000) : '' };
}

export function vistaBoSocial(el, dades) {
  const deFactura = dadesDeLaFactura(dades);
  for (const [k, v] of Object.entries(deFactura)) if (!estat[k] && v) estat[k] = v;
  const bs = dades.boSocial;
  const camp = (nom, etiqueta, { sufix = '', step = '1', ajuda = '', placeholder = '' } = {}) => `
    <div class="camp">
      <label for="b-${nom}">${etiqueta}</label>
      <div class="entrada"><input id="b-${nom}" name="${nom}" type="number" inputmode="decimal" min="0" step="${step}" placeholder="${placeholder}" value="${estat[nom]}">${sufix ? `<span class="sufix">${sufix}</span>` : ''}</div>
      ${ajuda ? `<p class="petit">${ajuda}</p>` : ''}
    </div>`;
  const casella = (nom, etiqueta, ajuda = '') => `<label class="casella"><input type="checkbox" name="${nom}" ${estat[nom] ? 'checked' : ''}> ${etiqueta}</label>${ajuda ? `<p class="petit sagnat">${ajuda}</p>` : ''}`;

  el.innerHTML = `
    <h1>${t('Tinc dret al bo social?')}</h1>
    <p class="intro">${t("El bo social és un descompte a la factura de la llum per a llars amb pocs ingressos, famílies nombroses i pensionistes amb pensió mínima. Respon aquestes preguntes i et diré si hi pots tenir dret i quant et podria estalviar. No s'envia res enlloc.")}</p>
    <div class="dues-columnes">
      <form id="form-bo" class="formulari" autocomplete="off" onsubmit="return false">
        <fieldset>
          <legend>${t('Qui viu a casa')}</legend>
          <p class="petit">${t("Compten les persones empadronades al mateix domicili que són parella o família fins a segon grau (la «unitat de convivència»).")}</p>
          <div class="graella">
            ${camp('adults', t("Persones adultes (18 anys o més)"), { step: '1' })}
            ${camp('menors', t("Menors d'edat"), { step: '1' })}
          </div>
          ${camp('ingressos', t("Ingressos de l'any passat de totes aquestes persones, sumats"), { sufix: '€', step: '100', placeholder: t('p. ex. 14000'), ajuda: t('Els ingressos bruts de la declaració de la renda (o dels certificats de pensions, atur...).') })}
        </fieldset>
        <fieldset>
          <legend>${t('Situacions especials')}</legend>
          ${casella('familiaNombrosa', t('Tenim el títol de família nombrosa'))}
          ${casella('pensionistes', t('Totes les persones amb ingressos cobren la pensió mínima de jubilació o d\'incapacitat permanent'), t('I no tenen altres ingressos de més de {max} € l\'any.', { max: nf(bs.pensionistesAltresIngressosMax) }))}
          ${casella('imv', t('Cobrem l\'ingrés mínim vital'))}
          ${casella('especial', t('Algú té discapacitat del 33 % o més, és víctima de violència de gènere o de terrorisme, té dependència de grau II o III, depèn d\'aparells elèctrics per a la salut, o és una família monoparental amb menors'))}
        </fieldset>
        <fieldset>
          <legend>${t('La teva llum')}</legend>
          ${deFactura.potencia ? `<p class="petit">${t("He agafat les dades de la factura que tens a «Comprovar la factura». Pots canviar-les.")}</p>` : ''}
          <div class="graella">
            ${camp('potencia', t('Potència contractada'), { sufix: 'kW', step: '0.01', placeholder: '3,45' })}
            ${camp('consumAnual', t('Consum de tot un any'), { sufix: 'kWh', step: '10', placeholder: t('opcional') })}
          </div>
          ${camp('preuEnergia', t("Preu mitjà de l'energia"), { sufix: '€/kWh', step: '0.001', placeholder: '0,13', ajuda: t("Per calcular l'estalvi. Si no el saps, es fa servir 0,13 €/kWh (aproximat).") })}
        </fieldset>
      </form>
      <section id="resultat-bo" class="resultat" aria-live="polite"></section>
    </div>`;

  const form = el.querySelector('#form-bo');
  const sortida = el.querySelector('#resultat-bo');
  const pinta = () => {
    for (const inp of form.elements) if (inp.name) estat[inp.name] = inp.type === 'checkbox' ? inp.checked : inp.value;
    sortida.innerHTML = resultat(avaluaBoSocial(estat, dades), dades);
  };
  form.addEventListener('input', pinta);
  form.addEventListener('change', pinta);
  pinta();
}

function resultat(r, dades) {
  const bs = dades.boSocial;
  const VIA = { renda: t('pels ingressos'), familiaNombrosa: t('per ser família nombrosa'), pensionistes: t('per ser pensionistes amb pensió mínima'), imv: t("per cobrar l'ingrés mínim vital") };
  const explicaLlindar = `
    <p class="petit">${t('El teu límit d\'ingressos: {mult} × IPREM ({iprem} €) = <strong>{llindar}</strong> a l\'any. Per al bo social sever, la meitat: <strong>{sever}</strong>.', { mult: nf(r.multiplicador, 1), iprem: nf(r.iprem), llindar: fmt(r.llindar), sever: fmt(r.llindarSever) })}</p>`;

  let cap;
  if (r.categoria === 'no') {
    cap = `<div class="xifra-net"><span>${t('Resultat')}</span><strong class="sense-dret">${t('Segurament no hi tens dret')}</strong></div>
      ${r.ingressos == null ? `<div class="avis info">${t('Escriu els ingressos de la llar per saber-ho.')}</div>` : `<div class="avis info">${t('Els ingressos ({ing}) superen el límit ({llindar}).', { ing: fmt(r.ingressos), llindar: fmt(r.llindar) })}</div>`}`;
  } else if (r.categoria === 'potencia') {
    cap = `<div class="xifra-net"><span>${t('Resultat')}</span><strong class="sense-dret">${t('Compliries, però…')}</strong></div>
      <div class="avis alerta">${t('El bo social només és per a potències de fins a {max} kW. Si baixes la potència, hi podries tenir dret.', { max: nf(bs.potenciaMaxKW) })}</div>`;
  } else {
    const nom = r.categoria === 'sever' ? t('Consumidor vulnerable sever') : t('Consumidor vulnerable');
    cap = `<div class="xifra-net"><span>${t('Hi pots tenir dret')} (${VIA[r.via] ?? ''})</span><strong>${nom}</strong>
      <span class="petit">${t('Descompte del {pct} %', { pct: nf(r.descompte, 1) })}${r.descomptePeriode ? ` · ${t('fins al {data}; després, {pct} %', { data: new Date(r.descomptePeriode.fins).toLocaleDateString(locale()), pct: nf(r.categoria === 'sever' ? r.descompteOrdinari.sever : r.descompteOrdinari.vulnerable, 1) })}` : ''}</span></div>`;
  }

  const e = r.estalvi;
  const estalvi = e ? `
    <h2>${t('Quant et podries estalviar')}</h2>
    <p class="gran-estalvi">${t('Uns <strong>{eur}</strong> l\'any', { eur: fmt(e.ambImpostos) })}</p>
    <table class="taula compacta"><tbody>
      <tr><td>${t('Terme de potència d\'un any')} <span class="detall">${nf(e.kW, 2)} kW</span></td><td class="num">${fmt(e.terPotencia)}</td></tr>
      <tr><td>${t('Energia amb descompte')} <span class="detall">${t('{kwh} kWh de {consum} (límit de la teva llar: {limit} kWh l\'any) × {preu} €', { kwh: nf(e.kWhAmbDescompte), consum: nf(e.consum), limit: nf(r.limitKWh), preu: nf(e.preuEnergia, 3) })}</span></td><td class="num">${fmt(e.base - e.terPotencia)}</td></tr>
      <tr><td>${t('Descompte del {pct} %', { pct: nf(r.descompte, 1) })}</td><td class="num">${fmt(e.senseImpostos)}</td></tr>
      <tr class="total"><td>${t('Amb impost elèctric i IVA')}</td><td class="num">${fmt(e.ambImpostos)}</td></tr>
    </tbody></table>
    <p class="petit">${t("És aproximat: el càlcul exacte el fa la comercialitzadora amb el PVPC de cada hora. El descompte es fa sobre tota la potència i sobre l'energia fins al límit de la teva llar.")}</p>` : '';

  const passos = r.categoria === 'vulnerable' || r.categoria === 'sever' || r.categoria === 'potencia' ? `
    <h2>${t('Com es demana')}</h2>
    <ol class="passos">
      <li>${t("Has de tenir el PVPC (la tarifa regulada) amb una comercialitzadora de referència: Energía XXI, Curenergía, Gas & Power, Baser, Régsiti o Comercializador de Referencia Energético. Si ara tens una altra companyia, t'hi pots canviar quan vulguis.")}</li>
      <li>${t("Ha de ser l'habitatge habitual i la potència, de {max} kW o menys.", { max: nf(bs.potenciaMaxKW) })}</li>
      <li>${t('Omple la sol·licitud de la comercialitzadora de referència i adjunta el DNI o NIE, el certificat d\'empadronament de tota la llar i, si escau, el llibre de família, el títol de família nombrosa o el certificat de discapacitat.')}</li>
      <li>${t("Si el bo social és sever i serveis socials paguen almenys la meitat de la factura, no et poden tallar la llum.")}</li>
    </ol>` : '';

  return `${cap}${r.ingressos != null || r.categoria !== 'no' ? explicaLlindar : ''}${estalvi}${passos}
    <details class="ajuda gran"><summary>${t("D'on surten aquestes xifres")}</summary>
      <p>${t("Llindars i límits de consum del Reial decret 897/2017; descomptes del 2026 del Reial decret llei 7/2026. L'IPREM és el de 14 pagues ({iprem} €). Aquesta calculadora és orientativa: qui decideix és la comercialitzadora de referència amb la documentació.", { iprem: nf(r.iprem) })}</p>
      <ul>${bs.fonts.map((f) => `<li><a href="${f.url}" target="_blank" rel="noopener">${f.nom}</a></li>`).join('')}</ul>
    </details>`;
}
