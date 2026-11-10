// Factura de llum explicada: una factura d'exemple amb l'aspecte de les factures reals (2.0TD)
// i punts taronja a cada apartat. Les xifres es calculen amb el motor i les dades de l'any.
import { calculaFactura } from './calc.js';
import { explicacions as expl } from './textos.js';
import { fmt } from '../nomina/calc.js';
import { creaPunts, htmlPopover, activaPunts } from '../punts.js';
import { t, locale } from '../i18n.js';

const EXEMPLE = {
  dataInici: '2026-10-01', dataFi: '2026-10-31',
  potenciaP1: '4.6', potenciaP2: '4.6', preuPotenciaP1: '0.098', preuPotenciaP2: '0.012',
  preuEnergiaP1: '0.22', preuEnergiaP2: '0.15', preuEnergiaP3: '0.09',
  consumP1: '62', consumP2: '75', consumP3: '133',
  boSocialDia: '0.019', lloguer: true, maximetre: '3.1',
};
const LECTURA_ANTERIOR = { P1: 8412, P2: 10377, P3: 17905 };
const HISTORIAL = [310, 295, 302, 268, 240, 225, 251, 318, 342, 296, 249, 270]; // kWh, nov. 2025 – oct. 2026

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (v, dec) => new Intl.NumberFormat('ca-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }).format(v);
const kw = (v) => nf(v, v % 1 ? (String(v).split('.')[1].length > 1 ? 2 : 1) : 0);

export function vistaFacturaExemple(el, dades) {
  const r = calculaFactura(EXEMPLE, dades);
  const e = r.entrada;
  const x = expl();
  const { punts, punt } = creaPunts(x);
  const any = dades.any;
  const pc = (v) => `${nf(v, v % 1 ? String(v).split('.')[1]?.length ?? 0 : 0)} %`;

  // Fila del detall: concepte amb la fórmula i import
  const fila = (clau, titol, concepte, formula, imp, detall = '') => `
    <tr data-fila>
      <td class="np-c-punt">${punt(clau, titol, detall)}</td>
      <td>${concepte}${formula ? `<small>${formula}</small>` : ''}</td>
      <td class="np-num">${nf(imp, 2)} €</td>
    </tr>`;
  const nomP = { P1: t('punta'), P2: t('pla'), P3: t('vall') };
  const lp = Object.fromEntries(r.liniesPotencia.map((l) => [l.periode, l]));
  const le = Object.fromEntries(r.liniesEnergia.map((l) => [l.periode, l]));
  const ex = (s, v) => t('En aquest exemple: {calcul}.', { calcul: s.replace('{=}', `= ${fmt(v)}`) });

  // On van els diners (com a la factura: part regulada, energia i marge, impostos, altres)
  const impostos = r.impostElectric + r.iva;
  const altres = r.lloguer + r.altres;
  const parts = [
    ['regulat', t('Peatges i càrrecs (BOE)'), r.regulat.total],
    ['comercial', t('Energia i marge de la comercialitzadora'), r.total - r.regulat.total - impostos - altres],
    ['impostos', t('Impostos'), impostos],
    ['altres', t('Comptador i altres'), altres],
  ];
  const maxH = Math.max(...HISTORIAL);
  const mesos = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(any - 1, 10 + i, 1)).toLocaleDateString(locale(), { month: 'narrow', timeZone: 'UTC' }));

  const html = `
    <h1>${t('Factura de llum explicada')}</h1>
    <p class="intro">${t("Una factura d'exemple com les de veritat (tarifa 2.0TD). Toca els punts taronja per saber què és cada apartat. Les dades són inventades; els peatges, càrrecs i impostos són els oficials de {any}.", { any })}</p>
    <p><button type="button" class="boto" id="np-comenca">${t('Explica-la pas a pas')}</button></p>
    <p class="petit np-llisca">${t('Al mòbil, llisca la factura de costat per veure-la sencera.')}</p>

    <div class="np-marc">
    <div class="np-scroll">
    <section class="nomina-paper factura-paper" aria-label="${esc(t("Factura d'exemple"))}">
      <div class="fp-cap">
        <div class="fp-logo">COMERCIALITZADORA<br><b>EXEMPLE</b></div>
        <div class="fp-titol"><b>${t("FACTURA D'ELECTRICITAT")}</b><span>${t('Tarifa')} 2.0TD</span></div>
      </div>

      <div class="fp-graella">
        <div class="fp-caixa" data-fila>
          <h3>${punt('dadesFactura', t('Dades de la factura'))}${t('Dades de la factura')}</h3>
          <p>${t('Núm. de factura')}: FE${String(any).slice(2)}-000123</p>
          <p>${t("Data d'emissió")}: 05/11/${any}</p>
          <p data-fila>${punt('periode', t('Període de facturació'), t('En aquest exemple: {dies} dies.', { dies: r.dies }))}${t('Període de facturació')}: 01/10/${any} – 31/10/${any} (${t('{n} dies', { n: r.dies })})</p>
          <p>${t('Data de càrrec')}: 20/11/${any}</p>
        </div>
        <div class="fp-caixa fp-total" data-fila>
          <h3>${punt('totalPagar', t('Total a pagar'))}${t('TOTAL A PAGAR')}</h3>
          <strong>${nf(r.total, 2)} €</strong>
          <p>${t('IVA inclòs')}</p>
        </div>
      </div>

      <div class="fp-caixa" data-fila>
        <h3>${punt('resum', t('Resum de la factura'))}${t('Resum de la factura')}</h3>
        <table class="fp-resum">
          <tr><td>${t('Per potència contractada')}</td><td class="np-num">${nf(r.potencia, 2)} €</td></tr>
          <tr><td>${t('Per energia consumida')}</td><td class="np-num">${nf(r.energia, 2)} €</td></tr>
          <tr><td>${t('Finançament del bo social')}</td><td class="np-num">${nf(r.boSocial, 2)} €</td></tr>
          <tr><td>${t('Impost elèctric')}</td><td class="np-num">${nf(r.impostElectric, 2)} €</td></tr>
          <tr><td>${t('Lloguer del comptador')}</td><td class="np-num">${nf(r.lloguer, 2)} €</td></tr>
          <tr><td>IVA</td><td class="np-num">${nf(r.iva, 2)} €</td></tr>
          <tr class="fp-tot"><td>${t('TOTAL')}</td><td class="np-num">${nf(r.total, 2)} €</td></tr>
        </table>
      </div>

      <div class="fp-caixa">
        <h3>${t('Dades del contracte')}</h3>
        <div class="fp-dades">
          <p>${t('Titular')}: PERSONA EXEMPLE · NIF 00000000T</p>
          <p>${t('Adreça de subministrament')}: C. MAJOR, 1, 08000</p>
          <p data-fila>${punt('cups', 'CUPS')}CUPS: ES 0000 0000 0000 0000 AA0F</p>
          <p data-fila>${punt('potenciaContractada', t('Potència contractada'))}${t('Potència contractada')}: ${t('punta')} ${kw(e.potencia.P1)} kW · ${t('vall')} ${kw(e.potencia.P2)} kW</p>
          <p data-fila>${punt('peatge', t("Peatge d'accés"))}${t("Peatge d'accés")}: 2.0TD</p>
          <p data-fila>${punt('distribuidora', t('Comercialitzadora i distribuïdora'))}${t('Distribuïdora')}: DISTRIBUÏDORA EXEMPLE · ${t('Contracte d\'accés')}: 000000</p>
          <p data-fila>${punt('contracte', t('Durada del contracte'))}${t('Final del contracte')}: 30/09/${any + 1} · ${t('Sense permanència')}</p>
        </div>
      </div>

      <div class="fp-caixa">
        <h3>${t('Informació del consum')}</h3>
        <table class="fp-lectures" data-fila>
          <thead><tr><th class="np-c-punt">${punt('lectures', t('Lectures del comptador'))}</th><th>${t('Període')}</th><th class="np-num">${t('Lectura anterior')}</th><th class="np-num">${t('Lectura actual')}</th><th class="np-num">${t('Consum')}</th></tr></thead>
          <tbody>${['P1', 'P2', 'P3'].map((p) => `<tr><td></td><td>${p} ${nomP[p]}</td><td class="np-num">${nf(LECTURA_ANTERIOR[p], 0)} (${t('real')})</td><td class="np-num">${nf(LECTURA_ANTERIOR[p] + e.consum[p], 0)} (${t('real')})</td><td class="np-num">${e.consum[p]} kWh</td></tr>`).join('')}
          <tr class="fp-tot"><td></td><td colspan="3">${t('Total')}</td><td class="np-num">${r.kWh} kWh</td></tr></tbody>
        </table>
        <p data-fila>${punt('maximetre', t('Maxímetre'), t("En aquest exemple: has arribat a {max} kW i en tens {pot} contractats. Mira els consells de «Comprovar la factura».", { max: kw(e.maximetre), pot: kw(e.potencia.P1) }))}${t('Maxímetre (potència màxima demandada)')}: ${kw(e.maximetre)} kW</p>
        <div class="fp-historial" data-fila>
          ${punt('historial', t('Historial de consum'), t('En aquest exemple: has gastat {mitja} kWh al dia de mitjana.', { mitja: nf(r.kWh / r.dies, 2) }))}
          <div>
            <p>${t('Historial de consum (kWh)')} · ${t('Consum mitjà diari')}: ${nf(r.kWh / r.dies, 2)} kWh</p>
            <svg viewBox="0 0 300 70" role="img" aria-label="${esc(t('Historial de consum (kWh)'))}">
              ${HISTORIAL.map((v, i) => `<rect x="${i * 25 + 4}" y="${58 - (v / maxH) * 50}" width="17" height="${(v / maxH) * 50}" fill="${i === 11 ? '#ff8a1f' : '#9a9a9a'}"/><text x="${i * 25 + 12.5}" y="68" text-anchor="middle" font-size="7" fill="#444">${mesos[i]}</text>`).join('')}
            </svg>
          </div>
        </div>
      </div>

      <div class="fp-caixa">
        <h3>${t('Detall de la factura')}</h3>
        <table class="fp-detall">
          ${fila('potenciaP1', t('Potència punta (P1)'), t('Potència punta (P1)'), `${kw(lp.P1.kW)} kW × ${r.dies} ${t('dies')} × ${nf(lp.P1.preu, 6)} €/kW ${t('dia')}`, lp.P1.import, ex(`${kw(lp.P1.kW)} kW × ${r.dies} × ${nf(lp.P1.preu, 6)} € {=}`, lp.P1.import))}
          ${fila('potenciaP2', t('Potència vall (P2)'), t('Potència vall (P2)'), `${kw(lp.P2.kW)} kW × ${r.dies} ${t('dies')} × ${nf(lp.P2.preu, 6)} €/kW ${t('dia')}`, lp.P2.import)}
          ${['P1', 'P2', 'P3'].map((p) => fila(`energia${p}`, `${t('Energia')} ${p} ${nomP[p]}`, `${t('Energia')} ${p} ${nomP[p]}`, `${le[p].kWh} kWh × ${nf(le[p].preu, 6)} €/kWh`, le[p].import, ex(`${le[p].kWh} kWh × ${nf(le[p].preu, 6)} € {=}`, le[p].import))).join('')}
          ${fila('boSocial', t('Finançament del bo social'), t('Finançament del bo social'), `${r.dies} ${t('dies')} × ${nf(e.boSocialDia, 6)} €/${t('dia')}`, r.boSocial)}
          ${fila('impostElectric', t('Impost elèctric'), t("Impost sobre l'electricitat"), `${pc(r.tipusIEE)} s/ ${nf(r.baseImpost, 2)} €`, r.impostElectric, ex(`${fmt(r.baseImpost)} × ${pc(r.tipusIEE)} {=}`, r.impostElectric))}
          ${fila('lloguer', t('Lloguer del comptador'), t('Lloguer del comptador'), `${r.dies} ${t('dies')} × ${nf(dades.lloguerComptador.monofasicEurDia, 6)} €/${t('dia')}`, r.lloguer)}
          ${fila('iva', 'IVA', 'IVA', `${pc(r.tipusIVA)} s/ ${nf(r.baseIVA, 2)} €`, r.iva, ex(`${fmt(r.baseIVA)} × ${pc(r.tipusIVA)} {=}`, r.iva))}
          <tr class="fp-tot"><td></td><td>${t('TOTAL FACTURA')}</td><td class="np-num">${nf(r.total, 2)} €</td></tr>
        </table>
      </div>

      <div class="fp-graella">
        <div class="fp-caixa" data-fila>
          <h3>${punt('desti', t("Destí de l'import de la factura"), t('En aquest exemple: {regulat} són peatges i càrrecs fixats pel BOE ({pct} de la factura).', { regulat: fmt(r.regulat.total), pct: `${Math.round(r.regulat.total / r.total * 100)} %` }))}${t("Destí de l'import de la factura")}</h3>
          <div class="barra-parts">${parts.map(([k, , v]) => `<span class="part-${k}" style="width:${(v / r.total) * 100}%"></span>`).join('')}</div>
          <ul class="fp-llegenda">${parts.map(([k, n, v]) => `<li><span class="punt part-${k}"></span>${n}: ${nf(v, 2)} €</li>`).join('')}</ul>
        </div>
        <div class="fp-caixa" data-fila>
          <h3>${punt('origen', t("Origen de l'electricitat"))}${t("Origen de l'electricitat i impacte ambiental")}</h3>
          <div class="fp-etiqueta">${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l, i) => `<span class="fp-l${i}${l === 'C' ? ' fp-sel' : ''}" style="width:${38 + i * 9}%">${l}${l === 'C' ? ' ◀' : ''}</span>`).join('')}</div>
        </div>
      </div>

      <div class="fp-peu">
        <p data-fila>${punt('averies', t('Averies i reclamacions'))}${t('Averies (distribuïdora, 24 h)')}: 900 000 000 · ${t('Atenció al client i reclamacions')}: 900 000 001</p>
        <p data-fila>${punt('dretBoSocial', t('Bo social'))}${t("Pot tenir dret al bo social si compleix els requisits. Informi's a una comercialitzadora de referència.")}</p>
      </div>
    </section>
    </div>
    ${htmlPopover()}
    </div>
    <p class="petit">${t('Vols comprovar la teva? Ves a <a href="#/llum">Factura de llum</a> i posa-hi les xifres o el PDF de la teva factura.')}</p>
  `;
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  el.append(tpl.content);
  activaPunts(el, punts);
}
