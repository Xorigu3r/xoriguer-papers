// Llegeix una factura de llum (2.0TD) en PDF al dispositiu i en treu les xifres del formulari.
// Les factures des del 2021 segueixen un model força comú: a cada línia del detall hi ha la fórmula
// («4,6 kW x 31 días x 0,098 €/kW día», «62 kWh x 0,22 €/kWh»...). Es busquen aquestes fórmules
// i les paraules clau en català i castellà. Sempre es mostra què s'ha llegit perquè es revisi.
import { ErrorPdf, textDelPdf, agrupaLinies, pla } from '../pdf-text.js';

export { ErrorPdf };

// Números de factura: 0,098123 · 4,6 · 1.234,56 · 0.098 (tots amb decimals variables)
export function numLlum(s) {
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s) && !s.startsWith('0.')) return Number(s.replace(/\./g, ''));
  return Number(s);
}

const N = String.raw`(\d+(?:[.,]\d+)*)`;
const X = String.raw`\s*[x×*]\s*`;
// (l'OCR de vegades llegeix «€» com «E» o «C»)
const EUR = String.raw`\s*(?:€|eur(?:os?)?|e|c)?\s*\/?\s*`;
const UNITAT = String.raw`\s*(?:y\s*|i\s*|\/\s*|·\s*|-\s*|x\s*)?(dia|any|ano|mes)`;
const RE = {
  // 4,6 kW x 31 días x 0,098 €/kW día
  potDies: new RegExp(`${N}\\s*kw${X}${N}\\s*(?:dies|dias|dia|d)\\.?${X}${N}${EUR}kw${UNITAT}`),
  // 31 días x 4,6 kW x 0,098 €/kW día
  potDies2: new RegExp(`${N}\\s*(?:dies|dias)${X}${N}\\s*kw${X}${N}${EUR}kw${UNITAT}`),
  // 3,45 kW x 23,324952 €/kW año x (30/365) días
  potAny: new RegExp(`${N}\\s*kw${X}${N}${EUR}kw${UNITAT}${X}\\(?\\s*${N}\\s*\\/\\s*(\\d{3})\\s*\\)?`),
  // 62 kWh x 0,22 €/kWh
  // (el «kWh» del consum és opcional: l'OCR de vegades el perd; la unitat del preu sí que hi ha de ser)
  energia: new RegExp(`(-?)${N}\\s*(?:kwh)?${X}${N}${EUR}kwh`),
  // 31 días x 0,019 €/día
  dies: new RegExp(`${N}\\s*(?:dies|dias|dia)${X}${N}${EUR}(dia|mes)`),
  pct: new RegExp(`${N}\\s*%`),
  data: /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g,
  // números solts (per als imports de final de línia)
  num: /(?<![\d.,])-?\d+(?:[.,]\d+)*(?![\d])/g,
};

const periodePotencia = (p) => (/\bp2\b|\bvalle?\b|\bvall\b/.test(p) ? 'P2' : 'P1');
function periodeEnergia(p) {
  if (/\bp1\b|\bpunta\b/.test(p)) return 'P1';
  if (/\bp2\b|\bllano\b|\bpla\b/.test(p)) return 'P2';
  if (/\bp3\b|\bvalle?\b|\bvall\b/.test(p)) return 'P3';
  return null;
}
const ultimImport = (p) => {
  const ns = [...p.matchAll(RE.num)].map((m) => m[0]);
  return ns.length ? Math.abs(numLlum(ns.at(-1).replace('-', ''))) : null;
};
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const r2 = (v) => Math.round(v * 100) / 100;
const dataIso = (d, m, a) => `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

/** Interpreta les línies (text) d'una factura. */
export function interpretaFactura(textos) {
  const vistes = new Set();
  const linies = textos.filter((l) => { const k = l.replace(/\s+/g, ' ').trim(); if (!k || vistes.has(k)) return false; vistes.add(k); return true; });
  const v = {};
  const detall = [];
  const avisos = [];
  const pot = { P1: { kW: null, preu: 0, n: 0 }, P2: { kW: null, preu: 0, n: 0 } };
  const ene = { P1: null, P2: null, P3: null };
  const preuEne = { P1: 0, P2: 0, P3: 0 };
  const generics = []; // línies d'energia sense franja (preu únic o cost de l'energia del PVPC)
  const consumInfo = {};
  let diesFormula = null;
  const descomptes = [];
  const serveis = [];
  const ieePct = new Set();
  const ivaPct = new Set();
  const maximetres = [];
  const afegeix = (clau, text, valor) => detall.push({ clau, text: text.trim().slice(0, 110), valor });

  for (const text of linies) {
    const p = pla(text);
    let m;

    // Avisos de casos que l'app no cobreix
    if (/\b3[.,]0\s*td\b|\b6[.,][1-4]\s*td\b/.test(p)) avisos.push({ codi: 'tarifa' });
    if (/autoconsum|excedent|compensacio/.test(p)) { avisos.push({ codi: 'autoconsum' }); if (/kwh/.test(p)) continue; }
    if (/\bpvpc\b|precio voluntario|preu voluntari/.test(p)) avisos.push({ codi: 'pvpc' });
    if (/\bigic\b/.test(p)) avisos.push({ codi: 'igic' });

    // Període de facturació
    if (!v.dataInici && /periodo|periode|facturac|consumo del|consum del|\bdel\b|\bdes de\b|\bdesde\b/.test(p)) {
      const ds = [...p.matchAll(RE.data)];
      if (ds.length >= 2) {
        v.dataInici = dataIso(ds[0][1], ds[0][2], ds[0][3]);
        v.dataFi = dataIso(ds[1][1], ds[1][2], ds[1][3]);
        afegeix('periode', text, `${ds[0][0]} – ${ds[1][0]}`);
      }
    }

    // Terme de potència
    if ((m = p.match(RE.potAny))) {
      const [, kW, preu, , dies, any] = m;
      const per = periodePotencia(p);
      pot[per].kW ??= numLlum(kW);
      pot[per].preu += numLlum(preu) / Number(any);
      pot[per].n++;
      diesFormula ??= numLlum(dies);
      afegeix(`potencia${per}`, text, `${kW} kW · ${preu} €/kW·${t_any(m[3])}`);
      continue;
    }
    if ((m = p.match(RE.potDies) ?? p.match(RE.potDies2))) {
      const dies2 = RE.potDies2.test(p) && !RE.potDies.test(p);
      const [kW, dies] = dies2 ? [m[2], m[1]] : [m[1], m[2]];
      const per = periodePotencia(p);
      const unitat = m[4];
      const preu = numLlum(m[3]) / (unitat === 'dia' ? 1 : unitat === 'mes' ? 365 / 12 : 365);
      pot[per].kW ??= numLlum(kW);
      pot[per].preu += preu;
      pot[per].n++;
      diesFormula ??= numLlum(dies);
      afegeix(`potencia${per}`, text, `${kW} kW · ${m[3]} €/kW·${t_any(unitat)}`);
      continue;
    }

    // Terme d'energia
    if ((m = p.match(RE.energia))) {
      const [, signe, kWh, preu] = m;
      if (signe) continue;
      const per = periodeEnergia(p);
      if (per) {
        ene[per] ??= numLlum(kWh);
        preuEne[per] += numLlum(preu);
      } else generics.push({ kWh: numLlum(kWh), preu: numLlum(preu) });
      afegeix(per ? `energia${per}` : 'energia', text, `${kWh} kWh · ${preu} €/kWh`);
      continue;
    }

    // Finançament del bo social
    if (/financiaci|financament/.test(p) && /\bbo(no)? social/.test(p)) {
      if ((m = p.match(RE.dies))) { v.boSocialDia = r6(numLlum(m[2]) / (m[3] === 'mes' ? 365 / 12 : 1)); afegeix('boSocial', text, `${m[2]} €/${m[3]}`); }
      else if (ultimImport(p) != null) { v._boSocialImport = ultimImport(p); afegeix('boSocial', text, `${v._boSocialImport} €`); }
      continue;
    }

    // Lloguer del comptador
    if (/alquiler|lloguer/.test(p)) {
      v.lloguer = true;
      if ((m = p.match(RE.dies))) { v.lloguerDia = r6(numLlum(m[2]) / (m[3] === 'mes' ? 365 / 12 : 1)); afegeix('lloguer', text, `${m[2]} €/${m[3]}`); }
      else if (ultimImport(p) != null) { v._lloguerImport = ultimImport(p); afegeix('lloguer', text, `${v._lloguerImport} €`); }
      continue;
    }

    // Impost elèctric (percentatge)
    if (/impuesto\s*(especial\s*)?(sobre\s*(la\s*)?)?electric|impost\s*(especial\s*)?(sobre\s*(l'|l’)?\s*)?electric|\biee\b|imp\.?\s*elec/.test(p)) {
      if ((m = p.match(RE.pct)) && !/mwh/.test(p)) {
        const x = numLlum(m[1]);
        if (x > 0 && x < 10) { ieePct.add(x); afegeix('impostElectric', text, `${m[1]} %`); }
      }
      continue;
    }

    // IVA
    if (/\biva\b|i\.v\.a/.test(p) && !/inclos|incluido|sense iva|sin iva/.test(p)) {
      if ((m = p.match(RE.pct))) {
        const x = numLlum(m[1]);
        if (x >= 4 && x <= 21) { ivaPct.add(x); afegeix('iva', text, `${m[1]} %`); }
      }
      continue;
    }

    // Maxímetre
    if (/maximetr|maxima\s*potencia|potencia\s*maxima|maxima\s*demandada/.test(p)) {
      for (const k of p.matchAll(new RegExp(`${N}\\s*kw\\b`, 'g'))) maximetres.push(numLlum(k[1]));
      if (maximetres.length) afegeix('maximetre', text, `${Math.max(...maximetres)} kW`);
      continue;
    }

    // Potència contractada (si no surt a les fórmules)
    if (/potencia\w*\s*contra[ct]+ad|potencies\s*contractades/.test(p)) {
      const kws = [...p.matchAll(new RegExp(`${N}\\s*kw\\b`, 'g'))].map((k) => numLlum(k[1]));
      if (kws.length) { v._potContractada = kws; afegeix('potenciaContractada', text, kws.map((k) => `${String(k).replace('.', ',')} kW`).join(' / ')); }
      continue;
    }

    // Total de la factura
    if (v.totalFactura == null && /total\s*(importe\s*)?(de\s*(la\s*)?)?factura|importe\s*total|total\s*a\s*pagar|total\s*import|import\s*total/.test(p)) {
      const imp = ultimImport(p);
      if (imp != null) { v.totalFactura = imp; afegeix('total', text, `${imp} €`); }
      continue;
    }

    // Descomptes
    if (/descuento|descompte|bonificaci|\bdto\b/.test(p)) {
      const imp = ultimImport(p);
      if (imp != null && imp > 0) { descomptes.push(imp); afegeix('descompte', text, `−${imp} €`); }
      continue;
    }

    // Serveis addicionals
    if (/mantenimient|manteniment|servicio|servei|seguro|asseguran|asistencia|assistencia|proteccio|\bpack\b|urgencia/.test(p)
      && !/servicios y otros|serveis i altres|otros conceptos|altres conceptes|atencion|atencio|cliente|client|averia|reclamac|telefono|telefon/.test(p)) {
      const imp = ultimImport(p);
      if (imp != null && imp > 0 && imp < 100) { serveis.push(imp); afegeix('altres', text, `${imp} €`); }
      continue;
    }

    // Consum per franges a la informació de consum (per si només hi ha un preu)
    const per = periodeEnergia(p);
    if (per && (m = p.match(new RegExp(`${N}\\s*kwh\\b`)))) consumInfo[per] ??= numLlum(m[1]);
  }

  // ---- Resultat ----
  if (!v.dataInici && diesFormula) v.dies = String(diesFormula);
  const dies = diesFormula ?? (v.dataInici ? Math.round((Date.parse(v.dataFi) - Date.parse(v.dataInici)) / 864e5) + 1 : null);

  const contractada = v._potContractada ?? [];
  for (const per of ['P1', 'P2']) {
    const kW = pot[per].kW ?? contractada[per === 'P1' ? 0 : 1] ?? (per === 'P2' ? pot.P1.kW : null);
    if (kW != null) v[`potencia${per}`] = String(kW);
    if (pot[per].n) v[`preuPotencia${per}`] = String(r6(pot[per].preu));
  }

  // Energia: preus de cada franja + els genèrics (p. ex. «coste de la energía» del PVPC, igual a totes)
  const teFranges = ['P1', 'P2', 'P3'].some((p) => ene[p] != null);
  const generic = generics.reduce((s, g) => s + g.preu, 0);
  if (teFranges) {
    for (const p of ['P1', 'P2', 'P3']) {
      v[`consum${p}`] = String(ene[p] ?? 0);
      v[`preuEnergia${p}`] = String(r6(preuEne[p] + generic));
    }
    v.unPreu = false;
  } else if (generics.length) {
    // Preu únic: el consum per franges surt de la informació de consum, si quadra amb el total
    const total = Math.max(...generics.map((g) => g.kWh));
    const info = ['P1', 'P2', 'P3'].map((p) => consumInfo[p] ?? 0);
    const quadra = Math.abs(info.reduce((a, b) => a + b, 0) - total) < 1;
    ['P1', 'P2', 'P3'].forEach((p, i) => { v[`consum${p}`] = String(quadra ? info[i] : (i === 0 ? total : 0)); });
    if (!quadra) avisos.push({ codi: 'consum-franges' });
    v.unPreu = true;
    v.preuEnergia = String(r6(generic));
  }

  if (v._boSocialImport != null && v.boSocialDia == null && dies) v.boSocialDia = String(r6(v._boSocialImport / dies));
  if (v._lloguerImport != null && v.lloguerDia == null && dies) v.lloguerDia = String(r6(v._lloguerImport / dies));
  if (v.lloguer == null && (v.potenciaP1 || teFranges)) avisos.push({ codi: 'sense-lloguer' });
  const descompte = sumaSenseResum(descomptes);
  const altres = sumaSenseResum(serveis);
  if (descompte) v.descompte = String(descompte);
  if (altres) v.altres = String(altres);
  // Impostos: només si la factura en fa servir un de sol (si en té dos, es calculen per dates)
  if (ieePct.size === 1) v.impostElectric = String([...ieePct][0]);
  if (ivaPct.size === 1) v.iva = String([...ivaPct][0]);
  if (ieePct.size > 1 || ivaPct.size > 1) avisos.push({ codi: 'dos-tipus' });
  if (maximetres.length) v.maximetre = String(Math.max(...maximetres));
  for (const k of Object.keys(v)) if (k.startsWith('_')) delete v[k];
  for (const k of ['boSocialDia', 'lloguerDia', 'totalFactura']) if (typeof v[k] === 'number') v[k] = String(v[k]);

  const noTrobats = [];
  if (!v.potenciaP1) noTrobats.push('potencia');
  if (!teFranges && !generics.length) noTrobats.push('energia');
  if (v.totalFactura == null) noTrobats.push('total');
  if (!v.dataInici && !v.dies) noTrobats.push('periode');
  return { valors: v, detall, avisos: [...new Map(avisos.map((a) => [a.codi, a])).values()], noTrobats };
}
// El resum de la factura repeteix els imports del detall: si un import és la suma dels altres, és el resum
function sumaSenseResum(imports) {
  const ll = [...imports].sort((a, b) => b - a);
  while (ll.length > 1 && Math.abs(ll[0] - ll.slice(1).reduce((a, b) => a + b, 0)) < 0.015) ll.shift();
  return r2(ll.reduce((a, b) => a + b, 0));
}
const t_any = (u) => ({ dia: 'dia', mes: 'mes', any: 'any', ano: 'any' }[u] ?? u);

/** Bytes del PDF → resultat d'interpretaFactura (+ línies llegides). */
export async function llegeixFacturaPdf(bytes, contrasenya) {
  const { items, pagines } = await textDelPdf(bytes, contrasenya);
  if (items.length < 5) throw new ErrorPdf('sense-text');
  return { ...facturaDeItems(items), pagines };
}

/** Trossos de text amb posició (del PDF o de l'OCR) → lectura de la factura. */
export function facturaDeItems(items, tolerancia) {
  const linies = agrupaLinies(items, tolerancia).map((l) => l.text);
  return { ...interpretaFactura(linies), linies };
}
