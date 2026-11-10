// Motor de càlcul de la nòmina. Funcions pures: reben les dades de l'any (JSON) i l'entrada de l'usuari.
// L'IRPF segueix l'algoritme oficial de l'AEAT (procediment general, sense regularitzacions).
// Tot es calcula al dispositiu; res no surt d'aquí.

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const trunca2 = (n) => Math.floor((n + 1e-9) * 100) / 100;
const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const opcional = (v) => (v === '' || v == null ? null : num(v));
const DISC = ['cap', '33a65', '65'];

/** Normalitza l'entrada del formulari. */
export function normalitza(e = {}) {
  const pagues = Math.max(12, Math.round(num(e.pagues) || 14));
  const salariBase = num(e.salariBase);
  const llista = (v) => (Array.isArray(v) ? v : []);
  return {
    salariBase,
    complementsSalarials: num(e.complementsSalarials),
    noSalarials: num(e.noSalarials),
    horesExtres: num(e.horesExtres),
    horesExtresForcaMajor: !!e.horesExtresForcaMajor,
    pagues,
    prorratejades: !!e.prorratejades,
    importPagaExtra: opcional(e.importPagaExtra) ?? salariBase,
    grup: String(e.grup || '7'),
    contracte: e.contracte === 'temporal' ? 'temporal' : 'indefinit',
    contracteMenysUnAny: !!e.contracteMenysUnAny,
    jornada: Math.min(100, Math.max(1, num(e.jornada) || 100)),
    irpfNomina: opcional(e.irpfNomina),
    netNomina: opcional(e.netNomina),
    // Model 145
    situacioFamiliar: ['1', '2', '3'].includes(String(e.situacioFamiliar)) ? String(e.situacioFamiliar) : '3',
    anyNaixement: Math.round(num(e.anyNaixement)) || null,
    discapacitat: DISC.includes(e.discapacitat) ? e.discapacitat : 'cap',
    mobilitatReduida: !!e.mobilitatReduida,
    mobilitatGeografica: !!e.mobilitatGeografica,
    descendents: llista(e.descendents).filter((d) => num(d.anyNaixement) > 0).map((d) => ({
      anyNaixement: Math.round(num(d.anyNaixement)),
      anyAdopcio: Math.round(num(d.anyAdopcio)) || null,
      discapacitat: DISC.includes(d.discapacitat) ? d.discapacitat : 'cap',
      mobilitatReduida: !!d.mobilitatReduida,
      perEnter: !!d.perEnter,
    })),
    ascendents: llista(e.ascendents).filter((a) => num(a.anyNaixement) > 0).map((a) => ({
      anyNaixement: Math.round(num(a.anyNaixement)),
      discapacitat: DISC.includes(a.discapacitat) ? a.discapacitat : 'cap',
      mobilitatReduida: !!a.mobilitatReduida,
      convivencia: Math.max(1, Math.round(num(a.convivencia)) || 1),
    })),
    pensioCompensatoria: num(e.pensioCompensatoria),
    anualitatsAliments: num(e.anualitatsAliments),
    prestecHabitatge: !!e.prestecHabitatge,
  };
}

export function escala(base, trams) {
  let quota = 0, anterior = 0;
  for (const t of trams) {
    const sostre = t.fins ?? Infinity;
    if (base <= anterior) break;
    quota += (Math.min(base, sostre) - anterior) * t.tipus / 100;
    anterior = sostre;
  }
  return quota;
}

/** Calcula una nòmina mensual ordinària (sense mes de paga extra). */
export function calculaNomina(entrada, dades) {
  const e = normalitza(entrada);
  const c = dades.cotitzacioTreballador;
  const b = dades.basesCotitzacio;

  const paguesExtra = e.pagues - 12;
  const prorrata = r2(e.importPagaExtra * paguesExtra / 12);

  // Meritacions (el que es guanya)
  const salarial = e.salariBase + e.complementsSalarials + e.horesExtres + (e.prorratejades ? prorrata : 0);
  const totalMeritat = r2(salarial + e.noSalarials);

  // Bases de cotització: la prorrata de les extres sempre hi entra, estigui prorratejada o no.
  const remuneracioCotitzable = e.salariBase + e.complementsSalarials + prorrata;
  const minimaGrup = b.minimaPerGrup[e.grup] ?? b.minimaPerGrup['7'];
  const minima = r2(minimaGrup * e.jornada / 100);
  const bccc = r2(Math.min(b.maximaMensual, Math.max(minima, remuneracioCotitzable)));
  const bccp = r2(Math.min(b.maximaMensual, bccc + e.horesExtres));

  const tipusAtur = e.contracte === 'temporal' ? c.aturTemporal : c.aturIndefinit;
  const tipusHE = e.horesExtresForcaMajor ? c.horesExtresForcaMajor : c.horesExtresAltres;

  const linies = [
    { clau: 'cc', nom: 'Contingències comunes', base: bccc, tipus: c.contingenciesComunes },
    { clau: 'atur', nom: 'Atur (desocupació)', base: bccp, tipus: tipusAtur },
    { clau: 'fp', nom: 'Formació professional', base: bccp, tipus: c.formacioProfessional },
    { clau: 'mei', nom: 'MEI (equitat intergeneracional)', base: bccc, tipus: c.mei },
  ];
  if (e.horesExtres > 0) {
    linies.push({ clau: 'he', nom: 'Hores extres', base: r2(e.horesExtres), tipus: tipusHE });
  }

  // Cotització addicional de solidaritat: per trams sobre la part que supera la base màxima
  const retribucioTotal = remuneracioCotitzable + e.horesExtres;
  if (retribucioTotal > b.maximaMensual) {
    let anterior = b.maximaMensual, import_ = 0;
    for (const t of dades.cotitzacioSolidaritat.trams) {
      const sostre = t.fins ?? Infinity;
      const tram = Math.min(retribucioTotal, sostre) - anterior;
      if (tram <= 0) break;
      import_ += tram * t.treballador / 100;
      anterior = sostre;
    }
    linies.push({ clau: 'solidaritat', nom: 'Cotització de solidaritat', base: r2(retribucioTotal - b.maximaMensual), tipus: null, importFix: r2(import_) });
  }

  for (const l of linies) l.import = l.importFix ?? r2(l.base * l.tipus / 100);
  const totalSS = r2(linies.reduce((s, l) => s + l.import, 0));

  // IRPF: estimació oficial i, si n'hi ha, el de la nòmina
  const ssAnual = (totalSS - (linies.find((l) => l.clau === 'he')?.import ?? 0)) * 12;
  const estimacio = estimaIRPF(e, dades, ssAnual);
  const tipusIRPF = e.irpfNomina ?? estimacio.tipus;
  const baseIRPF = r2(salarial); // els conceptes no salarials (dietes, plus transport...) dins dels límits estan exempts
  const irpf = r2(baseIRPF * tipusIRPF / 100);

  const totalDeduccions = r2(totalSS + irpf);
  const net = r2(totalMeritat - totalDeduccions);

  const resultat = {
    entrada: e,
    prorrata, totalMeritat, bccc, bccp, minima,
    linies, totalSS,
    irpf: { tipus: tipusIRPF, base: baseIRPF, import: irpf, font: e.irpfNomina != null ? 'nomina' : 'estimacio' },
    estimacioIRPF: estimacio,
    totalDeduccions, net,
    pagaExtra: e.prorratejades || paguesExtra === 0 ? null : calculaPagaExtra(e, tipusIRPF),
  };
  resultat.netAnual = r2(net * 12 + (resultat.pagaExtra ? resultat.pagaExtra.net * paguesExtra : 0));
  resultat.brutAnual = estimacio.brutAnual;
  resultat.avisos = avisos(resultat, dades);
  return resultat;
}

/** Mes de paga extra (no prorratejada): la paga no cotitza a part (ja s'ha cotitzat amb la prorrata), només IRPF. */
function calculaPagaExtra(e, tipusIRPF) {
  const irpf = r2(e.importPagaExtra * tipusIRPF / 100);
  return { brut: r2(e.importPagaExtra), irpf, net: r2(e.importPagaExtra - irpf) };
}

/**
 * Tipus de retenció segons l'algoritme de l'AEAT (art. 80-87 RIRPF), amb les dades del model 145.
 * No inclou regularitzacions, Ceuta/Melilla/La Palma, pensionistes ni desocupats.
 */
export function estimaIRPF(entrada, dades, ssAnual, any = dades.any) {
  const e = normalitza(entrada);
  const d = dades.irpf;
  const passos = [];

  // Retribucions anuals (RETRIB) i cotitzacions
  const retrib = r2((e.salariBase + e.complementsSalarials) * 12 + e.importPagaExtra * (e.pagues - 12));
  const cotitzacions = r2(ssAnual);

  // Descendents que donen dret a mínim: menors de 25 anys o amb discapacitat. Del més gran al més petit.
  const desc = e.descendents
    .map((x) => ({ ...x, edat: any - x.anyNaixement, enter: x.perEnter ? 1 : 0.5 }))
    .filter((x) => x.edat < 25 || x.discapacitat !== 'cap')
    .sort((a, b) => a.anyNaixement - b.anyNaixement);
  const numDes = desc.length;

  // Ascendents: 65 anys o més, o amb discapacitat
  const asc = e.ascendents
    .map((x) => ({ ...x, edat: any - x.anyNaixement }))
    .filter((x) => x.edat >= 65 || x.discapacitat !== 'cap');

  // Situació 1 exigeix almenys un descendent
  const situacio = e.situacioFamiliar === '1' && numDes === 0 ? '3' : e.situacioFamiliar;

  // Límit excloent de retenció (art. 81 RIRPF)
  const fila = d.llindarsExempcio[situacio];
  const llindar = fila[Math.min(numDes, 2)] ?? fila[1];

  // Despeses deduïbles
  let altresDespeses = d.despeses.general;
  if (e.mobilitatGeografica) altresDespeses += d.despeses.mobilitatGeografica;
  if (e.discapacitat === '65' || (e.discapacitat === '33a65' && e.mobilitatReduida)) altresDespeses += d.despeses.discapacitat65oMobilitat;
  else if (e.discapacitat === '33a65') altresDespeses += d.despeses.discapacitat33a65;
  const netPrevi = Math.max(0, retrib - cotitzacions);
  altresDespeses = Math.min(altresDespeses, netPrevi);

  // Reducció per obtenció de rendiments del treball (art. 20 LIRPF)
  const rr = d.reduccioRendimentsTreball;
  const rnt = netPrevi;
  let red20 = 0;
  if (rnt <= rr.llindarBaix) red20 = rr.importMaxim;
  else if (rnt <= rr.tram1Fins) red20 = rr.importMaxim - rr.tram1Factor * (rnt - rr.llindarBaix);
  else if (rnt < rr.tram2Fins) red20 = rr.tram2Import - rr.tram2Factor * (rnt - rr.tram1Fins);
  red20 = r2(Math.max(0, red20));

  const rntRedu = Math.max(0, rnt - altresDespeses - red20);
  const redMesDeDos = numDes > 2 ? d.reduccioMesDeDosDescendents : 0;
  const reduccions = redMesDeDos + e.pensioCompensatoria;
  const base = r2(Math.max(0, rntRedu - reduccions));

  // Mínim personal i familiar
  const edat = e.anyNaixement ? any - e.anyNaixement : 40;
  let minCon = d.minimPersonal;
  if (edat > 64) minCon += d.minimMajor65;
  if (edat > 74) minCon += d.minimMajor75;

  let minDes = 0;
  desc.forEach((x, i) => {
    minDes += d.minimDescendents[Math.min(i, d.minimDescendents.length - 1)] * x.enter;
    const adoptatRecent = x.anyAdopcio && x.anyAdopcio > any - 3;
    if (x.anyNaixement > any - 3 || adoptatRecent) minDes += d.minimDescendentMenor3 * x.enter;
  });

  let minAs = 0;
  for (const a of asc) {
    minAs += d.minimAscendent65 / a.convivencia;
    if (a.edat > 74) minAs += d.minimAscendent75 / a.convivencia;
  }

  const minDisc = (disc, mob) => (disc === '65' ? d.minimDiscapacitat65 : disc === '33a65' ? d.minimDiscapacitat33a65 : 0);
  const assist = (disc, mob) => (disc === '65' || (disc === '33a65' && mob) ? d.despesesAssistencia : 0);
  let minDis = minDisc(e.discapacitat) + assist(e.discapacitat, e.mobilitatReduida);
  for (const x of desc) minDis += (minDisc(x.discapacitat) + assist(x.discapacitat, x.mobilitatReduida)) * x.enter;
  for (const a of asc) minDis += (minDisc(a.discapacitat) + assist(a.discapacitat, a.mobilitatReduida)) / a.convivencia;

  const minim = r2(minCon + minDes + minAs + minDis);

  // Quota
  let quota1, quota2;
  const anual = e.anualitatsAliments;
  if (anual > 0 && base - anual > 0) {
    quota1 = escala(base - anual, d.escalaRetencions) + escala(anual, d.escalaRetencions);
    quota2 = escala(minim + d.incrementMinimAnualitats, d.escalaRetencions);
  } else {
    quota1 = escala(base, d.escalaRetencions);
    quota2 = escala(minim, d.escalaRetencions);
  }
  let quota = Math.max(0, quota1 - quota2);

  let exempt = false, limitAplicat = false;
  if (retrib <= llindar) { quota = 0; exempt = true; }
  else if (retrib <= d.limitQuota.retribucioFins) {
    const limit = (retrib - llindar) * d.limitQuota.percentatge / 100;
    if (quota > limit) { quota = limit; limitAplicat = true; }
  }
  quota = r2(quota);

  // Minoració per préstec d'habitatge habitual anterior a 2013
  const ph = d.prestecHabitatge;
  const minoracio = e.prestecHabitatge && retrib < ph.retribucioMenorDe ? trunca2(retrib * ph.percentatge / 100) : 0;

  const diferencia = Math.max(0, quota - minoracio);
  let tipus = retrib > 0 ? trunca2((diferencia / retrib) * 100) : 0;
  let minimAplicat = false;
  if (e.contracteMenysUnAny && tipus < d.minimContracteMenysUnAny) {
    tipus = d.minimContracteMenysUnAny; minimAplicat = true;
  }

  passos.push(
    ['Retribucions anuals', retrib],
    ['Cotitzacions a la Seguretat Social', -cotitzacions],
    ['Altres despeses deduïbles', -altresDespeses],
    ['Reducció per rendiments del treball', -red20],
  );
  if (redMesDeDos) passos.push(['Reducció per més de dos descendents', -redMesDeDos]);
  if (e.pensioCompensatoria) passos.push(['Pensió compensatòria al cònjuge', -e.pensioCompensatoria]);

  return {
    brutAnual: retrib, ssAnual: cotitzacions, altresDespeses: r2(altresDespeses), reduccio: red20,
    baseRetencio: base, minim, detallMinim: { contribuent: minCon, descendents: r2(minDes), ascendents: r2(minAs), discapacitat: r2(minDis) },
    quota, minoracio, tipus, llindar, situacio, numDescendents: numDes, numAscendents: asc.length,
    exempt, limitAplicat, minimAplicat, passos,
  };
}

function avisos(res, dades) {
  const a = [];
  const e = res.entrada;
  const est = res.estimacioIRPF;

  if (e.netNomina != null) {
    const dif = r2(e.netNomina - res.net);
    if (Math.abs(dif) <= 1) a.push({ nivell: 'ok', text: `El líquid de la teva nòmina quadra amb el càlcul (diferència de ${fmt(dif)}).` });
    else a.push({
      nivell: 'alerta',
      text: `El líquid de la nòmina (${fmt(e.netNomina)}) i el calculat (${fmt(res.net)}) es diferencien en ${fmt(dif)}. ` +
        'Pot ser per conceptes que no has introduït (embargaments, bestretes, espècie, quota sindical...), per un mes de paga extra o per un error. Revisa-ho línia a línia.',
    });
  }

  if (e.irpfNomina != null) {
    if (e.irpfNomina + 2 < est.tipus) a.push({ nivell: 'alerta', text: `El teu IRPF (${pc(e.irpfNomina)}) sembla baix respecte al que surt amb el teu model 145 (${pc(est.tipus)}). Potser et tocarà pagar a la declaració de la renda. Comprova que l'empresa té el model 145 actualitzat.` });
    else if (e.irpfNomina > est.tipus + 3) a.push({ nivell: 'info', text: `El teu IRPF (${pc(e.irpfNomina)}) és més alt que el que surt amb el teu model 145 (${pc(est.tipus)}). Si no hi ha cap motiu (has demanat més retenció, tens altres ingressos, l'empresa no té el 145 al dia...), probablement et tornaran diners a la renda.` });
    else a.push({ nivell: 'ok', text: `El teu IRPF (${pc(e.irpfNomina)}) és coherent amb el que surt amb el teu model 145 (${pc(est.tipus)}).` });
  }
  if (e.situacioFamiliar === '1' && est.numDescendents === 0) a.push({ nivell: 'alerta', text: 'La situació familiar 1 exigeix tenir almenys un fill que doni dret a mínim. S\'ha calculat com a situació 3.' });
  if (est.minimAplicat) a.push({ nivell: 'info', text: 'Contracte de menys d\'un any: la retenció mínima és del 2 %.' });
  if (est.exempt) a.push({ nivell: 'info', text: `Amb un brut anual de ${fmt(est.brutAnual)} estàs per sota del límit de retenció per a la teva situació (${fmt(est.llindar)}): no t'han de retenir IRPF${e.contracteMenysUnAny ? ', excepte el 2 % mínim dels contractes de menys d\'un any' : ''}.` });
  if (e.prestecHabitatge && est.minoracio > 0) a.push({ nivell: 'info', text: `Per la hipoteca d'abans del 2013, la retenció es redueix ${fmt(est.minoracio)} l'any.` });

  const smiProporcional = dades.smi.anual * e.jornada / 100;
  if (est.brutAnual > 0 && est.brutAnual < smiProporcional - 1) {
    a.push({ nivell: 'alerta', text: `El brut anual (${fmt(est.brutAnual)}) és inferior al salari mínim ${e.jornada < 100 ? `proporcional a la teva jornada (${fmt(smiProporcional)})` : `(${fmt(dades.smi.anual)})`}. Consulta-ho amb un sindicat o la gestoria.` });
  }
  if (res.bccc >= dades.basesCotitzacio.maximaMensual) a.push({ nivell: 'info', text: 'Cobres per sobre de la base màxima: cotitzes per la base màxima i, per la resta, la cotització de solidaritat.' });
  if (res.bccc === res.minima && e.salariBase + e.complementsSalarials + res.prorrata < res.minima) a.push({ nivell: 'info', text: 'La teva remuneració és inferior a la base mínima del teu grup; es cotitza per la mínima.' });
  return a;
}

export function fmt(n) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export const pc = (n) => `${String(n).replace('.', ',')} %`;
