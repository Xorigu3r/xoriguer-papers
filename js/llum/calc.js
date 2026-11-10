// Motor de càlcul de la factura de llum (tarifa 2.0TD, fins a 15 kW). Funcions pures.
// Reben les dades de l'any (data/llum-AAAA.json) i l'entrada de l'usuari. Tot es calcula al dispositiu.
import { t } from '../i18n.js';
import { fmt } from '../nomina/calc.js';

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const kw = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const opcional = (v) => (v === '' || v == null ? null : num(v));
const DIA = 864e5;
const dataUTC = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
export const PERIODES_ENERGIA = ['P1', 'P2', 'P3'];
export const PERIODES_POTENCIA = ['P1', 'P2'];

/** Dies de facturació (inici i fi inclosos), o null si les dates no són vàlides. */
export function diesEntre(inici, fi) {
  const a = dataUTC(inici), b = dataUTC(fi);
  if (a == null || b == null || b < a) return null;
  return Math.round((b - a) / DIA) + 1;
}

export function normalitza(e = {}) {
  const dies = opcional(e.dies) ?? diesEntre(e.dataInici, e.dataFi) ?? 30;
  return {
    dataInici: e.dataInici || '',
    dataFi: e.dataFi || '',
    dies: Math.max(1, Math.round(dies)),
    potencia: { P1: num(e.potenciaP1), P2: opcional(e.potenciaP2) ?? num(e.potenciaP1) },
    preuPotencia: { P1: num(e.preuPotenciaP1), P2: num(e.preuPotenciaP2) },
    unPreu: !!e.unPreu,
    consum: { P1: num(e.consumP1), P2: num(e.consumP2), P3: num(e.consumP3) },
    preuEnergia: e.unPreu
      ? { P1: num(e.preuEnergia), P2: num(e.preuEnergia), P3: num(e.preuEnergia) }
      : { P1: num(e.preuEnergiaP1), P2: num(e.preuEnergiaP2), P3: num(e.preuEnergiaP3) },
    descompte: num(e.descompte),
    boSocialDia: num(e.boSocialDia),
    lloguer: e.lloguer !== false,
    lloguerDia: opcional(e.lloguerDia),
    altres: num(e.altres),
    iva: opcional(e.iva),
    impostElectric: opcional(e.impostElectric),
    totalFactura: opcional(e.totalFactura),
    maximetre: opcional(e.maximetre),
  };
}

/**
 * Reparteix els dies de la factura entre els períodes fiscals (IVA i impost elèctric) de les dades.
 * Si la factura no té dates, es fa servir l'últim període (el vigent).
 */
export function trams(e, dades) {
  const pf = dades.periodesFiscals;
  const a = dataUTC(e.dataInici), b = dataUTC(e.dataFi);
  if (a == null || b == null || b < a) return [{ ...pf.at(-1), pes: 1 }];
  const total = (b - a) / DIA + 1;
  const sortida = [];
  for (const p of pf) {
    const ini = Math.max(a, dataUTC(p.des)), fi = Math.min(b, dataUTC(p.fins));
    if (fi >= ini) sortida.push({ ...p, pes: ((fi - ini) / DIA + 1) / total });
  }
  // dies fora de l'any de les dades: s'hi aplica el període més proper
  const cobert = sortida.reduce((s, x) => s + x.pes, 0);
  if (cobert < 0.999) {
    const proper = a < dataUTC(pf[0].des) ? pf[0] : pf.at(-1);
    const ja = sortida.find((x) => x.des === proper.des);
    if (ja) ja.pes += 1 - cobert; else sortida.push({ ...proper, pes: 1 - cobert });
  }
  return sortida;
}

/** Calcula la factura completa. */
export function calculaFactura(entrada, dades) {
  const e = normalitza(entrada);
  const D = dades.diesAny;

  // Terme de potència: kW × dies × €/kW·dia
  const liniesPotencia = PERIODES_POTENCIA.map((p) => {
    const regulat = (dades.peatges.potencia[p] + dades.carrecs.potencia[p]) / D;
    return {
      periode: p, kW: e.potencia[p], preu: e.preuPotencia[p],
      import: r2(e.potencia[p] * e.dies * e.preuPotencia[p]),
      regulat: r2(e.potencia[p] * e.dies * regulat), preuRegulat: regulat,
    };
  });
  const potencia = r2(liniesPotencia.reduce((s, l) => s + l.import, 0));

  // Terme d'energia: kWh × €/kWh
  const liniesEnergia = PERIODES_ENERGIA.map((p) => {
    const regulat = dades.peatges.energia[p] + dades.carrecs.energia[p];
    return {
      periode: p, kWh: e.consum[p], preu: e.preuEnergia[p],
      import: r2(e.consum[p] * e.preuEnergia[p]),
      regulat: r2(e.consum[p] * regulat), preuRegulat: regulat,
    };
  });
  const energia = r2(liniesEnergia.reduce((s, l) => s + l.import, 0));
  const kWh = PERIODES_ENERGIA.reduce((s, p) => s + e.consum[p], 0);

  const boSocial = r2(e.boSocialDia * e.dies);
  const baseImpost = r2(Math.max(0, potencia + energia - e.descompte + boSocial));

  // Impostos, per trams de dates (el 2026 han canviat durant l'any)
  const tr = trams(e, dades);
  const minim = (kWh / 1000) * dades.impostElectric.minimEurMWh;
  let impostElectric = 0, tipusIEE = 0;
  for (const x of tr) {
    const tipus = e.impostElectric ?? x.impostElectric;
    tipusIEE += tipus * x.pes;
    impostElectric += Math.max(baseImpost * tipus / 100, minim) * x.pes;
  }
  impostElectric = r2(impostElectric);

  const lloguerDia = e.lloguer ? (e.lloguerDia ?? dades.lloguerComptador.monofasicEurDia) : 0;
  const lloguer = r2(lloguerDia * e.dies);
  const baseIVA = r2(baseImpost + impostElectric + lloguer + e.altres);
  const potMax = Math.max(e.potencia.P1, e.potencia.P2);
  let iva = 0, tipusIVA = 0;
  for (const x of tr) {
    const reduit = x.ivaReduit != null && potMax <= x.potenciaMaxIvaReduit;
    const tipus = e.iva ?? (reduit ? x.ivaReduit : x.iva);
    tipusIVA += tipus * x.pes;
    iva += baseIVA * tipus / 100 * x.pes;
  }
  iva = r2(iva);
  const total = r2(baseIVA + iva);

  const regulatPotencia = r2(liniesPotencia.reduce((s, l) => s + l.regulat, 0));
  const regulatEnergia = r2(liniesEnergia.reduce((s, l) => s + l.regulat, 0));

  const res = {
    entrada: e, dies: e.dies, kWh,
    liniesPotencia, liniesEnergia, potencia, energia, boSocial, descompte: r2(e.descompte),
    baseImpost, impostElectric, tipusIEE: r2(tipusIEE * 1e6) / 1e6, lloguer, altres: r2(e.altres),
    baseIVA, iva, tipusIVA: r2(tipusIVA), total,
    trams: tr,
    regulat: { potencia: regulatPotencia, energia: regulatEnergia, total: r2(regulatPotencia + regulatEnergia) },
    preuMigKWh: kWh > 0 ? total / kWh : null,
    totalAnual: r2(total * D / e.dies),
    repartiment: kWh > 0 ? Object.fromEntries(PERIODES_ENERGIA.map((p) => [p, e.consum[p] / kWh])) : null,
  };
  res.avisos = avisos(res, dades);
  return res;
}

/** Potència normalitzada més petita que cobreix el maxímetre amb un 10 % de marge. */
export function potenciaRecomanada(maximetre, dades) {
  const objectiu = maximetre * 1.1;
  return dades.potenciesNormalitzades.find((p) => p >= objectiu) ?? null;
}

function avisos(res, dades) {
  const a = [];
  const e = res.entrada;

  if (e.totalFactura != null) {
    const dif = r2(e.totalFactura - res.total);
    if (Math.abs(dif) <= 0.5) a.push({ nivell: 'ok', text: t('El total de la teva factura quadra amb el càlcul (diferència de {dif}).', { dif: fmt(dif) }) });
    else a.push({ nivell: 'alerta', text: t('El total de la factura ({factura}) i el calculat ({calc}) es diferencien en {dif}. Revisa que hagis copiat bé els preus i els kWh, i si hi ha serveis extra (manteniment, assegurances) o regularitzacions de lectures anteriors.', { factura: fmt(e.totalFactura), calc: fmt(res.total), dif: fmt(dif) }) });
  }

  // Preus de potència que no poden ser per dia
  for (const l of res.liniesPotencia) {
    if (l.preu > 0.5) a.push({ nivell: 'alerta', text: t('El preu de potència {p} ({preu} €/kW) sembla anual o mensual. Aquí cal posar-lo per dia: divideix-lo per 365 (si és anual) o per 30 (si és mensual).', { p: l.periode, preu: String(l.preu).replace('.', ',') }) });
    else if (l.kW > 0 && l.preu > 0 && l.preu < l.preuRegulat * 0.98) a.push({ nivell: 'alerta', text: t('El preu de potència {p} és inferior als peatges i càrrecs oficials ({oficial} €/kW·dia). Comprova que el preu sigui per kW i dia.', { p: l.periode, oficial: l.preuRegulat.toFixed(6).replace('.', ',') }) });
  }
  for (const l of res.liniesEnergia) {
    if (l.kWh > 0 && l.preu > 1) a.push({ nivell: 'alerta', text: t("El preu de l'energia {p} ({preu}) és massa alt per ser €/kWh. Potser és en €/MWh o en cèntims: divideix-lo per 1.000 o per 100.", { p: l.periode, preu: String(l.preu).replace('.', ',') }) });
  }

  // Potència: el maxímetre diu quanta en fas servir de veritat
  if (e.maximetre != null && e.maximetre > 0 && e.potencia.P1 > 0) {
    const rec = potenciaRecomanada(e.maximetre, dades);
    if (e.maximetre > e.potencia.P1) a.push({ nivell: 'info', text: t("El maxímetre ({max} kW) supera la potència contractada ({pot} kW). En 2.0TD no hi ha penalització, però si et salta l'interruptor sovint potser et convé més potència.", { max: kw(e.maximetre), pot: kw(e.potencia.P1) }) });
    else if (rec && rec < e.potencia.P1) {
      const preu = e.preuPotencia.P1 || res.liniesPotencia[0].preuRegulat;
      const estalvi = (e.potencia.P1 - rec) * preu * dades.diesAny * (1 + res.tipusIEE / 100) * (1 + res.tipusIVA / 100);
      a.push({ nivell: 'info', text: t("El màxim que has fet servir és {max} kW i en tens {pot} contractats. Amb {rec} kW (amb marge) estalviaries uns {estalvi} l'any en potència punta. Abans, comprova el maxímetre de diversos mesos (sobretot a l'hivern i a l'estiu).", { max: kw(e.maximetre), pot: kw(e.potencia.P1), rec: kw(rec), estalvi: fmt(estalvi) }) });
    } else a.push({ nivell: 'ok', text: t('La potència contractada ({pot} kW) està ben ajustada al que fas servir (maxímetre {max} kW).', { pot: kw(e.potencia.P1), max: kw(e.maximetre) }) });
  }

  // Repartiment del consum
  if (res.repartiment && !e.unPreu) {
    const vall = res.repartiment.P3;
    const difPreu = e.preuEnergia.P1 - e.preuEnergia.P3;
    if (vall < 0.3 && difPreu > 0.02) a.push({ nivell: 'info', text: t("Només el {pct} del teu consum és en hores vall. Posar rentadores, rentaplats o la càrrega del cotxe a la nit o el cap de setmana et pot estalviar fins a {dif} cèntims per kWh.", { pct: `${Math.round(vall * 100)} %`, dif: (difPreu * 100).toFixed(1).replace('.', ',') }) });
  }
  if (e.unPreu && res.kWh > 0) a.push({ nivell: 'info', text: t("Tens un preu únic d'energia: et costa igual a qualsevol hora. Si pots concentrar consum a la nit i el cap de setmana, una tarifa amb tres períodes podria sortir més barata.") });

  if (res.trams.some((x) => x.ivaReduit != null && x.pes > 0)) a.push({ nivell: 'info', text: t("Una part d'aquesta factura cau entre el 22 de març i el 31 de maig del 2026: l'impost elèctric era del 0,5 % i l'IVA del 10 % si tens 10 kW o menys contractats.") });
  if (e.lloguer && res.lloguer > 0) a.push({ nivell: 'info', text: t("El lloguer del comptador el fixa el Govern (0,81 €/mes per a un comptador monofàsic digital). Si el comptador és teu, no te l'han de cobrar.") });
  return a;
}

/** Aplica una simulació (canvi de potència i desplaçament de consum cap a la vall). */
export function aplicaSimulacio(entrada, sim) {
  const s = { ...entrada };
  if (sim.potencia != null) { s.potenciaP1 = sim.potencia; s.potenciaP2 = sim.potencia; }
  const mou = (sim.desplacament ?? 0) / 100;
  if (mou > 0) {
    const c1 = num(entrada.consumP1), c2 = num(entrada.consumP2), c3 = num(entrada.consumP3);
    s.consumP1 = c1 * (1 - mou);
    s.consumP2 = c2 * (1 - mou);
    s.consumP3 = c3 + (c1 + c2) * mou;
  }
  s.totalFactura = '';
  return s;
}
