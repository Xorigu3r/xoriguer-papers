// Historial: nòmines i factures desades al dispositiu (localStorage), gràfics mes a mes i avisos
// de canvis («la llum ha pujat un 30 %», «t'han baixat l'IRPF»). No s'envia res enlloc.
import { t, locale } from './i18n.js';
import { fmt } from './nomina/calc.js';

const CLAU = 'pdc.historial.v1';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (v, dec = 2) => new Intl.NumberFormat(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
const r2 = (v) => Math.round(v * 100) / 100;

// ---------- Emmagatzematge ----------
export function llegeixHistorial() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAU) ?? '[]');
    return Array.isArray(v) ? v.filter((e) => e && (e.tipus === 'nomina' || e.tipus === 'llum') && /^\d{4}-\d{2}$/.test(e.mes)) : [];
  } catch { return []; }
}
function escriu(llista) {
  try { localStorage.setItem(CLAU, JSON.stringify(llista)); return true; } catch { return false; }
}
/** Desa (o substitueix) l'entrada d'un tipus i mes. Retorna 'nou', 'actualitzat' o 'error'. */
export function desaAHistorial(tipus, mes, dades, resum) {
  const llista = llegeixHistorial();
  const i = llista.findIndex((e) => e.tipus === tipus && e.mes === mes);
  const entrada = { id: `${tipus}-${mes}`, tipus, mes, desat: new Date().toISOString(), dades, resum };
  if (i >= 0) llista[i] = entrada; else llista.push(entrada);
  llista.sort((a, b) => a.mes.localeCompare(b.mes));
  return escriu(llista) ? (i >= 0 ? 'actualitzat' : 'nou') : 'error';
}
export const esborraDeHistorial = (id) => escriu(llegeixHistorial().filter((e) => e.id !== id));

// Resum que es guarda de cada document (el càlcul complet es pot refer amb `dades`)
export const resumNomina = (r) => ({ brut: r.totalMeritat, net: r.net, irpfPct: r.irpf.tipus, irpf: r.irpf.import, ss: r.totalSS, font: r.irpf.font });
export const resumLlum = (r) => ({ total: r.total, kWh: r.kWh, dies: r.dies, potencia: r.entrada.potencia.P1, preuMig: r.preuMigKWh, regulat: r.regulat.total });

// ---------- Bloc «Desa a l'historial» al peu dels resultats ----------
const mesActual = () => new Date().toISOString().slice(0, 7);
/**
 * Afegeix al final del resultat el bloc per desar-lo a l'historial i l'enllaç a l'informe.
 * `mesSuggerit`: per a la llum, el mes de la data final de la factura.
 */
export function peuResultat(sortida, tipus, dades, resum, mesSuggerit) {
  const ja = llegeixHistorial().some((e) => e.tipus === tipus && e.mes === (mesSuggerit ?? mesActual()));
  const div = document.createElement('div');
  div.className = 'peu-resultat';
  div.innerHTML = `
    <div class="desa-historial">
      <label for="mes-historial">${tipus === 'nomina' ? t('Mes de la nòmina') : t('Mes de la factura')}</label>
      <input type="month" id="mes-historial" value="${mesSuggerit ?? mesActual()}">
      <button type="button" class="boto" id="desa-historial">${t("Desa a l'historial")}</button>
      <span class="petit" id="estat-historial" aria-live="polite">${ja ? t('Ja tens aquest mes desat: si el tornes a desar, se substituirà.') : ''}</span>
    </div>
    <p class="petit">${t("L'historial es desa només en aquest dispositiu.")} <a href="#/historial">${t("Veure l'historial")}</a> · <a href="#/informe/${tipus}">${t("Fer l'informe (PDF)")}</a></p>`;
  sortida.append(div);
  div.querySelector('#desa-historial').addEventListener('click', () => {
    const mes = div.querySelector('#mes-historial').value;
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    const res = desaAHistorial(tipus, mes, dades, resum);
    div.querySelector('#estat-historial').textContent = res === 'error' ? t("No s'ha pogut desar (l'emmagatzematge del navegador no està disponible).")
      : res === 'actualitzat' ? t('Actualitzat el mes {mes}.', { mes: nomMes(mes) }) : t('Desat el mes {mes}.', { mes: nomMes(mes) });
  });
}

export const nomMes = (mes, curt = false) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString(locale(), { month: curt ? 'short' : 'long', year: curt ? '2-digit' : 'numeric', timeZone: 'UTC' });
};

// ---------- Avisos de canvis ----------
const pct = (a, b) => (b ? (a - b) / b * 100 : 0);
const signe = (v) => `${v > 0 ? '+' : '−'}${nf(Math.abs(v), 0)} %`;
export function avisosNomina(llista) {
  if (llista.length < 2) return [];
  const [ant, ara] = llista.slice(-2);
  const a = [];
  const dNet = pct(ara.resum.net, ant.resum.net);
  if (Math.abs(dNet) >= 3) a.push({ nivell: dNet < 0 ? 'alerta' : 'ok', text: t('El net de {mes} ({ara}) és un {canvi} respecte de {mesAnt} ({abans}).', { mes: nomMes(ara.mes), ara: fmt(ara.resum.net), canvi: signe(dNet), mesAnt: nomMes(ant.mes), abans: fmt(ant.resum.net) }) });
  const dIrpf = ara.resum.irpfPct - ant.resum.irpfPct;
  if (Math.abs(dIrpf) >= 0.5) a.push({ nivell: 'info', text: dIrpf < 0
    ? t("T'han baixat l'IRPF: del {abans} al {ara}. Cobres més ara, però potser hauràs de pagar a la declaració de la renda.", { abans: `${nf(ant.resum.irpfPct)} %`, ara: `${nf(ara.resum.irpfPct)} %` })
    : t("T'han pujat l'IRPF: del {abans} al {ara}. Cobres menys ara, però a la renda et pot sortir a retornar.", { abans: `${nf(ant.resum.irpfPct)} %`, ara: `${nf(ara.resum.irpfPct)} %` }) });
  const dBrut = pct(ara.resum.brut, ant.resum.brut);
  if (Math.abs(dBrut) >= 2) a.push({ nivell: 'info', text: t('El brut ha canviat un {canvi} ({abans} → {ara}). Si no esperaves cap canvi, revisa els complements i les hores.', { canvi: signe(dBrut), abans: fmt(ant.resum.brut), ara: fmt(ara.resum.brut) }) });
  return a;
}
export function avisosLlum(llista) {
  if (llista.length < 2) return [];
  const [ant, ara] = llista.slice(-2);
  const a = [];
  // Per dia, perquè les factures no tenen tots els mateixos dies
  const dia = (e) => e.resum.total / e.resum.dies;
  const dTotal = pct(dia(ara), dia(ant));
  if (Math.abs(dTotal) >= 10) a.push({ nivell: dTotal > 0 ? 'alerta' : 'ok', text: t('La llum de {mes} ha {verb} un {canvi} respecte de la factura anterior ({ara} al dia, abans {abans}).', { mes: nomMes(ara.mes), verb: dTotal > 0 ? t('pujat') : t('baixat'), canvi: `${nf(Math.abs(dTotal), 0)} %`, ara: fmt(dia(ara)), abans: fmt(dia(ant)) }) });
  const kd = (e) => e.resum.kWh / e.resum.dies;
  const dKwh = pct(kd(ara), kd(ant));
  const dPreu = pct(ara.resum.preuMig, ant.resum.preuMig);
  if (Math.abs(dKwh) >= 10) a.push({ nivell: 'info', text: t('Has gastat un {canvi} de kWh al dia ({ara} kWh, abans {abans} kWh).', { canvi: signe(dKwh), ara: nf(kd(ara), 1), abans: nf(kd(ant), 1) }) });
  if (dPreu >= 10) a.push({ nivell: 'alerta', text: t('El preu mitjà del kWh ha pujat un {canvi} ({abans} → {ara} €/kWh, tot inclòs). Si no has canviat de tarifa, revisa si la companyia ha pujat preus.', { canvi: `${nf(dPreu, 0)} %`, abans: nf(ant.resum.preuMig, 3), ara: nf(ara.resum.preuMig, 3) }) });
  if (ara.resum.potencia !== ant.resum.potencia) a.push({ nivell: 'info', text: t('Ha canviat la potència contractada: de {abans} a {ara} kW.', { abans: nf(ant.resum.potencia, 2), ara: nf(ara.resum.potencia, 2) }) });
  return a;
}

// ---------- Gràfic de barres (una sola sèrie, una sola escala) ----------
function grafic(punts, { titol, unitat, format }) {
  if (!punts.length) return '';
  const W = 640; const H = 210; const esq = 52; const dalt = 14; const baix = 28;
  const max = Math.max(...punts.map((p) => p.v)) || 1;
  const pas = niceStep(max / 4);
  const topV = Math.ceil(max / pas) * pas;
  const y = (v) => dalt + (H - dalt - baix) * (1 - v / topV);
  const amp = (W - esq - 8) / punts.length;
  const ba = Math.min(36, amp * 0.6);
  const linies = Array.from({ length: Math.round(topV / pas) + 1 }, (_, i) => i * pas);
  return `
    <figure class="grafic">
      <figcaption>${titol}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titol)}">
        ${linies.map((v) => `<line x1="${esq}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" class="g-grid"/><text x="${esq - 6}" y="${y(v) + 4}" text-anchor="end" class="g-eix">${nf(v, pas % 1 ? 1 : 0)}</text>`).join('')}
        ${punts.map((p, i) => {
          const x = esq + i * amp + (amp - ba) / 2;
          const h = Math.max(1, y(0) - y(p.v));
          return `<g class="g-barra" tabindex="0"><title>${esc(`${p.etiqueta}: ${format(p.v)}`)}</title>
            <rect x="${esq + i * amp}" y="${dalt}" width="${amp}" height="${H - dalt - baix}" class="g-zona"/>
            <path d="M${x},${y(0)} v${-(h - 4)} q0,-4 4,-4 h${ba - 8} q4,0 4,4 v${h - 4} z" class="g-marca${i === punts.length - 1 ? ' g-ultima' : ''}"/>
            <text x="${x + ba / 2}" y="${H - 10}" text-anchor="middle" class="g-eix">${esc(p.curt)}</text></g>`;
        }).join('')}
      </svg>
      <details class="ajuda"><summary>${t('Veure com a taula')}</summary>
        <table class="taula compacta"><tbody>${punts.map((p) => `<tr><td>${esc(p.etiqueta)}</td><td class="num">${format(p.v)}</td></tr>`).join('')}</tbody></table>
      </details>
      <p class="petit">${unitat}</p>
    </figure>`;
}
function niceStep(v) {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= v) ?? 10 * p;
}

// ---------- Pantalla ----------
export function vistaHistorial(el) {
  const tot = llegeixHistorial();
  const nomines = tot.filter((e) => e.tipus === 'nomina');
  const factures = tot.filter((e) => e.tipus === 'llum');
  const avisos = (ll) => ll.map((a) => `<div class="avis ${a.nivell}">${a.text}</div>`).join('');
  const fila = (e, cols) => `<tr><td>${esc(nomMes(e.mes))}</td>${cols.map((c) => `<td class="num">${c}</td>`).join('')}<td class="num"><button type="button" class="enllac" data-esborra="${esc(e.id)}" data-mes="${esc(nomMes(e.mes))}" aria-label="${esc(t('Esborra {mes}', { mes: nomMes(e.mes) }))}">${t('Esborra')}</button></td></tr>`;

  el.innerHTML = `
    <h1>${t('Historial')}</h1>
    <p class="intro">${t("Les nòmines i factures que desis des de «Comprovar» apareixen aquí, mes a mes, amb avisos quan alguna cosa canvia. Es desa només en aquest dispositiu: si esborres les dades del navegador, es perd (fes-ne una còpia).")}</p>

    <section class="seccio-historial">
      <h2>${t('Nòmines')}</h2>
      ${nomines.length ? `
        ${avisos(avisosNomina(nomines))}
        ${grafic(nomines.map((e) => ({ v: e.resum.net, etiqueta: nomMes(e.mes), curt: nomMes(e.mes, true) })), { titol: t('Net cobrat cada mes'), unitat: t('Euros nets (el que t\'ingressen).'), format: fmt })}
        <table class="taula"><thead><tr><th>${t('Mes')}</th><th class="num">${t('Brut')}</th><th class="num">${t('Net')}</th><th class="num">IRPF</th><th></th></tr></thead>
          <tbody>${[...nomines].reverse().map((e) => fila(e, [fmt(e.resum.brut), fmt(e.resum.net), `${nf(e.resum.irpfPct)} %`])).join('')}</tbody></table>`
      : `<div class="buit"><p>${t('Encara no has desat cap nòmina.')}</p><p class="petit"><a href="#/nomina">${t('Comprova una nòmina')}</a> ${t("i toca «Desa a l'historial».")}</p></div>`}
    </section>

    <section class="seccio-historial">
      <h2>${t('Factures de llum')}</h2>
      ${factures.length ? `
        ${avisos(avisosLlum(factures))}
        ${grafic(factures.map((e) => ({ v: e.resum.total, etiqueta: nomMes(e.mes), curt: nomMes(e.mes, true) })), { titol: t('Import de cada factura'), unitat: t('Euros, impostos inclosos.'), format: fmt })}
        ${grafic(factures.map((e) => ({ v: r2(e.resum.kWh / e.resum.dies), etiqueta: nomMes(e.mes), curt: nomMes(e.mes, true) })), { titol: t('Consum mitjà al dia'), unitat: t('kWh al dia (així es poden comparar factures de dies diferents).'), format: (v) => `${nf(v, 1)} kWh` })}
        <table class="taula"><thead><tr><th>${t('Mes')}</th><th class="num">${t('Total')}</th><th class="num">kWh</th><th class="num">€/kWh</th><th></th></tr></thead>
          <tbody>${[...factures].reverse().map((e) => fila(e, [fmt(e.resum.total), nf(e.resum.kWh, 0), nf(e.resum.preuMig ?? 0, 3)])).join('')}</tbody></table>`
      : `<div class="buit"><p>${t('Encara no has desat cap factura.')}</p><p class="petit"><a href="#/llum">${t('Comprova una factura')}</a> ${t("i toca «Desa a l'historial».")}</p></div>`}
    </section>

    <section class="seccio-historial">
      <h2>${t('Còpia de seguretat')}</h2>
      <p class="petit">${t("Desa un fitxer amb tot l'historial per no perdre'l o per passar-lo a un altre dispositiu.")}</p>
      <div class="accions-historial">
        <button type="button" class="boto secundari" id="exporta" ${tot.length ? '' : 'disabled'}>${t('Desa una còpia')}</button>
        <label class="boto secundari" for="importa">${t('Recupera una còpia')}</label>
        <input type="file" id="importa" accept="application/json,.json" class="amagat">
        <button type="button" class="boto secundari" id="esborra-tot" ${tot.length ? '' : 'disabled'}>${t('Esborra tot l\'historial')}</button>
      </div>
      <p class="petit" id="estat-copia" aria-live="polite"></p>
    </section>`;

  const torna = () => vistaHistorial(el);
  el.querySelectorAll('[data-esborra]').forEach((b) => b.addEventListener('click', () => {
    if (confirm(t('Vols esborrar {mes} de l\'historial?', { mes: b.dataset.mes }))) { esborraDeHistorial(b.dataset.esborra); torna(); }
  }));
  el.querySelector('#esborra-tot').addEventListener('click', () => {
    if (confirm(t("Vols esborrar tot l'historial d'aquest dispositiu? No es pot desfer."))) { escriu([]); torna(); }
  });
  el.querySelector('#exporta').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'xoriguer-papers', versio: 1, historial: llegeixHistorial() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xoriguer-papers-historial-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  el.querySelector('#importa').addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const nous = (j.historial ?? []).filter((e) => (e.tipus === 'nomina' || e.tipus === 'llum') && /^\d{4}-\d{2}$/.test(e.mes) && e.resum);
      for (const e of nous) desaAHistorial(e.tipus, e.mes, e.dades ?? {}, e.resum);
      torna();
      el.querySelector('#estat-copia').textContent = t('Recuperats {n} documents.', { n: nous.length });
    } catch {
      el.querySelector('#estat-copia').textContent = t("Aquest fitxer no és una còpia de l'historial.");
    }
  });
}
