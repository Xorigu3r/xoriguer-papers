// Informe d'una pàgina per desar en PDF (amb «Imprimeix → Desa com a PDF») o compartir:
// dades introduïdes, càlcul línia a línia, comparació amb el document i avisos.
// Es fa amb les dades que hi ha ara a «Comprovar»; no inclou noms, DNI ni cap dada personal.
import { calculaNomina, fmt } from './nomina/calc.js';
import { calculaFactura } from './llum/calc.js';
import { estatNomina } from './nomina/vistes.js';
import { estatLlum } from './llum/vistes.js';
import { t, locale } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (v, dec = 2) => new Intl.NumberFormat(locale(), { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(v);
const pc = (v) => `${nf(v, 8)} %`;
const sensePunts = (html) => String(html).replace(/<[^>]+>/g, '');
const fila = (a, b, classe = '') => `<tr class="${classe}"><td>${a}</td><td class="num">${b}</td></tr>`;

function marc(el, titol, cos, resumText) {
  const avui = new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  el.innerHTML = `
    <div class="no-imprimir accions-informe">
      <button type="button" class="boto" id="imprimeix">${t('Desa en PDF o imprimeix')}</button>
      ${navigator.share ? `<button type="button" class="boto secundari" id="comparteix">${t('Comparteix el resum')}</button>` : ''}
      <p class="petit">${t("Per desar-lo en PDF, tria «Desa com a PDF» a la finestra d'imprimir.")}</p>
    </div>
    <article class="informe">
      <header class="informe-cap">
        <div><strong>${titol}</strong><span>${t('Fet el {data} amb Xoriguer Papers', { data: avui })}</span></div>
        <img src="icons/icon-64.png" alt="" width="40" height="40">
      </header>
      ${cos}
      <footer class="informe-peu">${t("Càlcul orientatiu fet amb les dades que s'han introduït i els valors oficials de l'any. No substitueix l'assessorament d'una gestoria, un sindicat o una oficina de consum.")}</footer>
    </article>`;
  el.querySelector('#imprimeix').addEventListener('click', () => window.print());
  el.querySelector('#comparteix')?.addEventListener('click', () => {
    navigator.share({ title: titol, text: resumText }).catch(() => {});
  });
}
const buit = (el, text, enllac) => { el.innerHTML = `<div class="buit"><p>${text}</p><p class="petit">${enllac}</p></div>`; };
const avisosHtml = (avisos) => (avisos.length ? `<h2>${t('Avisos')}</h2><ul class="informe-avisos">${avisos.map((a) => `<li class="${a.nivell}">${a.text}</li>`).join('')}</ul>` : '');
const fontsHtml = (dades) => `<h2>${t('Fonts oficials')}</h2><ul class="informe-fonts">${(dades.fonts ?? []).map((f) => `<li>${esc(f.nom)}</li>`).join('')}</ul>`;

export function vistaInforme(el, tipus, { dades, dadesLlum }) {
  if (tipus === 'llum') return informeLlum(el, dadesLlum);
  return informeNomina(el, dades);
}

function informeNomina(el, dades) {
  const estat = estatNomina();
  if (!(parseFloat(estat.salariBase) > 0)) return buit(el, t('Primer omple la nòmina.'), `<a href="#/nomina">${t('Comprovar nòmina')}</a>`);
  const r = calculaNomina(estat, dades);
  const e = r.entrada;
  const dif = e.netNomina != null ? e.netNomina - r.net : null;
  const cos = `
    <h2>${t('Dades de la nòmina')}</h2>
    <table class="taula compacta"><tbody>
      ${fila(t('Salari base'), fmt(e.salariBase))}
      ${e.complementsSalarials ? fila(t('Complements salarials'), fmt(e.complementsSalarials)) : ''}
      ${e.noSalarials ? fila(t('Conceptes no salarials'), fmt(e.noSalarials)) : ''}
      ${e.horesExtres ? fila(t('Hores extres'), fmt(e.horesExtres)) : ''}
      ${fila(t('Pagues'), `${e.pagues}${e.prorratejades ? ` · ${t('prorratejades')}` : ''}`)}
      ${fila(t('Contracte'), `${e.contracte === 'temporal' ? t('Temporal') : t('Indefinit')} · ${t('grup')} ${esc(e.grup)} · ${t('jornada')} ${e.jornada} %`)}
      ${e.irpfNomina != null ? fila(t("Percentatge d'IRPF de la nòmina"), `${nf(e.irpfNomina)} %`) : ''}
    </tbody></table>

    <h2>${t('Càlcul')}</h2>
    <table class="taula compacta"><tbody>
      ${fila(t('Total meritat'), fmt(r.totalMeritat), 'total')}
      ${fila(t('Base de cotització'), fmt(r.bccc))}
      ${r.linies.map((l) => fila(`${esc(l.nom)} <span class="detall">${fmt(l.base)} × ${nf(l.tipus)} %</span>`, `− ${fmt(l.import)}`)).join('')}
      ${fila(`IRPF <span class="detall">${fmt(r.irpf.base)} × ${nf(r.irpf.tipus)} %</span>`, `− ${fmt(r.irpf.import)}`)}
      ${fila(t('Total deduccions'), `− ${fmt(r.totalDeduccions)}`, 'total')}
      ${fila(t('Líquid a percebre calculat'), fmt(r.net), 'total gran')}
      ${dif != null ? fila(t('Líquid a percebre de la nòmina'), fmt(e.netNomina)) + fila(t('Diferència'), fmt(dif), Math.abs(dif) > 1 ? 'total alerta' : 'total') : ''}
    </tbody></table>
    ${avisosHtml(r.avisos)}
    ${fontsHtml(dades)}`;
  const resum = [
    t('Informe de la nòmina (Xoriguer Papers)'),
    `${t('Total meritat')}: ${fmt(r.totalMeritat)}`,
    `${t('Total deduccions')}: ${fmt(r.totalDeduccions)}`,
    `${t('Líquid a percebre calculat')}: ${fmt(r.net)}`,
    dif != null ? `${t('Líquid a percebre de la nòmina')}: ${fmt(e.netNomina)} (${t('Diferència')}: ${fmt(dif)})` : '',
    ...r.avisos.map((a) => `• ${sensePunts(a.text)}`),
  ].filter(Boolean).join('\n');
  marc(el, t('Informe de la nòmina'), cos, resum);
}

function informeLlum(el, dades) {
  const estat = estatLlum();
  const te = parseFloat(estat.potenciaP1) > 0 || ['consumP1', 'consumP2', 'consumP3'].some((k) => parseFloat(estat[k]) > 0);
  if (!te || !dades) return buit(el, t('Primer omple la factura de llum.'), `<a href="#/llum">${t('Factura de llum')}</a>`);
  const r = calculaFactura(estat, dades);
  const e = r.entrada;
  const dif = e.totalFactura != null ? e.totalFactura - r.total : null;
  const dates = e.dataInici && e.dataFi ? `${new Date(e.dataInici).toLocaleDateString(locale())} – ${new Date(e.dataFi).toLocaleDateString(locale())} · ` : '';
  const cos = `
    <h2>${t('Dades de la factura')}</h2>
    <table class="taula compacta"><tbody>
      ${fila(t('Període de facturació'), `${dates}${r.dies} ${t('dies')}`)}
      ${fila(t('Potència contractada'), `P1 ${nf(e.potencia.P1)} kW · P2 ${nf(e.potencia.P2)} kW`)}
      ${fila(t('Energia consumida'), `${nf(r.kWh)} kWh (P1 ${nf(e.consum.P1)} · P2 ${nf(e.consum.P2)} · P3 ${nf(e.consum.P3)})`)}
      ${e.maximetre != null ? fila(t('Maxímetre'), `${nf(e.maximetre)} kW`) : ''}
    </tbody></table>

    <h2>${t('Càlcul')}</h2>
    <table class="taula compacta"><tbody>
      ${r.liniesPotencia.map((l) => fila(`${t('Potència')} ${l.periode} <span class="detall">${nf(l.kW)} kW × ${r.dies} ${t('dies')} × ${nf(l.preu, 6)} €</span>`, fmt(l.import))).join('')}
      ${r.liniesEnergia.map((l) => fila(`${t('Energia')} ${l.periode} <span class="detall">${nf(l.kWh)} kWh × ${nf(l.preu, 6)} €</span>`, fmt(l.import))).join('')}
      ${r.boSocial ? fila(t('Finançament del bo social'), fmt(r.boSocial)) : ''}
      ${r.descompte ? fila(t('Descomptes'), `− ${fmt(r.descompte)}`) : ''}
      ${fila(`${t('Impost elèctric')} <span class="detall">${pc(r.tipusIEE)}</span>`, fmt(r.impostElectric))}
      ${r.lloguer ? fila(t('Lloguer del comptador'), fmt(r.lloguer)) : ''}
      ${r.altres ? fila(t('Altres serveis (manteniment, assegurances...)'), fmt(r.altres)) : ''}
      ${fila(`IVA <span class="detall">${pc(r.tipusIVA)}</span>`, fmt(r.iva))}
      ${fila(t('Total de la factura calculat'), fmt(r.total), 'total gran')}
      ${dif != null ? fila(t('Total de la factura'), fmt(e.totalFactura)) + fila(t('Diferència'), fmt(dif), Math.abs(dif) > 0.5 ? 'total alerta' : 'total') : ''}
      ${fila(t('Peatges i càrrecs (BOE)'), fmt(r.regulat.total))}
    </tbody></table>
    ${avisosHtml(r.avisos)}
    ${fontsHtml(dades)}`;
  const resum = [
    t('Informe de la factura de llum (Xoriguer Papers)'),
    `${t('Període de facturació')}: ${dates}${r.dies} ${t('dies')}`,
    `${t('Total de la factura calculat')}: ${fmt(r.total)}`,
    dif != null ? `${t('Total de la factura')}: ${fmt(e.totalFactura)} (${t('Diferència')}: ${fmt(dif)})` : '',
    ...r.avisos.map((a) => `• ${sensePunts(a.text)}`),
  ].filter(Boolean).join('\n');
  marc(el, t('Informe de la factura de llum'), cos, resum);
}
