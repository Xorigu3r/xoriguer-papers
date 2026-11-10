#!/usr/bin/env node
// Comprova que els fitxers data/nomina-AAAA.json estan complets i tenen valors raonables.
// Evita publicar un error de tecleig (p. ex. 47 en lloc de 4,7) quan s'actualitzen les dades.

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dirDades = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

const enRang = (f, nom, v, min, max) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) err(f, `${nom} ha de ser un número (és ${JSON.stringify(v)})`);
  else if (v < min || v > max) err(f, `${nom} = ${v} fora del rang raonable [${min}, ${max}]`);
};

const fitxers = (await readdir(dirDades)).filter((n) => /^nomina-\d{4}\.json$/.test(n)).sort();
const index = JSON.parse(await readFile(join(dirDades, 'index.json'), 'utf8'));

for (const f of fitxers) {
  let d;
  try { d = JSON.parse(await readFile(join(dirDades, f), 'utf8')); } catch (e) { err(f, `JSON invàlid: ${e.message}`); continue; }
  const any = Number(f.match(/\d{4}/)[0]);
  if (d.any !== any) err(f, `"any" (${d.any}) no coincideix amb el nom del fitxer`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.revisat ?? '')) err(f, '"revisat" ha de ser una data AAAA-MM-DD');
  if (!Array.isArray(d.fonts) || d.fonts.length === 0) err(f, 'falten les "fonts" oficials');
  if (!index.anys?.includes(any)) err(f, `l'any ${any} no és a data/index.json`);

  enRang(f, 'smi.anual', d.smi?.anual, 10000, 40000);
  enRang(f, 'smi.mensual14pagues', d.smi?.mensual14pagues, 700, 3000);
  if (d.smi && Math.abs(d.smi.mensual14pagues * 14 - d.smi.anual) > 1) err(f, 'smi.anual no és smi.mensual14pagues × 14');

  const b = d.basesCotitzacio ?? {};
  enRang(f, 'basesCotitzacio.maximaMensual', b.maximaMensual, 3000, 10000);
  for (let g = 1; g <= 11; g++) enRang(f, `basesCotitzacio.minimaPerGrup.${g}`, b.minimaPerGrup?.[g], 900, 3500);

  const c = d.cotitzacioTreballador ?? {};
  enRang(f, 'contingenciesComunes', c.contingenciesComunes, 3, 7);
  enRang(f, 'aturIndefinit', c.aturIndefinit, 1, 3);
  enRang(f, 'aturTemporal', c.aturTemporal, 1, 3);
  enRang(f, 'formacioProfessional', c.formacioProfessional, 0, 1);
  enRang(f, 'mei', c.mei, 0, 1);
  enRang(f, 'horesExtresForcaMajor', c.horesExtresForcaMajor, 0, 5);
  enRang(f, 'horesExtresAltres', c.horesExtresAltres, 0, 7);

  // Aportació de l'empresa (opcional; només la fa servir la nòmina explicada)
  const ce = d.cotitzacioEmpresa;
  if (ce) {
    enRang(f, 'cotitzacioEmpresa.contingenciesComunes', ce.contingenciesComunes, 18, 30);
    enRang(f, 'cotitzacioEmpresa.aturIndefinit', ce.aturIndefinit, 3, 8);
    enRang(f, 'cotitzacioEmpresa.aturTemporal', ce.aturTemporal, 3, 9);
    enRang(f, 'cotitzacioEmpresa.fogasa', ce.fogasa, 0, 1);
    enRang(f, 'cotitzacioEmpresa.formacioProfessional', ce.formacioProfessional, 0, 2);
    enRang(f, 'cotitzacioEmpresa.mei', ce.mei, 0, 2);
    enRang(f, 'cotitzacioEmpresa.atEpExemple', ce.atEpExemple, 0, 8);
  }

  const trams = d.cotitzacioSolidaritat?.trams ?? [];
  if (trams.length === 0) err(f, 'falten els trams de solidaritat');
  trams.forEach((t, i) => enRang(f, `solidaritat.trams[${i}].treballador`, t.treballador, 0, 1));

  const irpf = d.irpf ?? {};
  const escala = irpf.escalaRetencions ?? [];
  if (escala.length < 3 || escala.at(-1).fins !== null) err(f, 'l\'escala d\'IRPF ha d\'acabar amb un tram "fins": null');
  for (let i = 1; i < escala.length; i++) {
    if (escala[i - 1].fins == null || (escala[i].fins != null && escala[i].fins <= escala[i - 1].fins)) err(f, `escala d'IRPF: tram ${i} no és creixent`);
    if (escala[i].tipus < escala[i - 1].tipus) err(f, `escala d'IRPF: el tipus del tram ${i} baixa`);
  }
  escala.forEach((t, i) => enRang(f, `escala[${i}].tipus`, t.tipus, 0, 60));
  enRang(f, 'irpf.minimPersonal', irpf.minimPersonal, 3000, 10000);
  enRang(f, 'irpf.despeses.general', irpf.despeses?.general, 0, 5000);
  for (const s of ['1', '2', '3']) {
    const fila = irpf.llindarsExempcio?.[s];
    if (!Array.isArray(fila) || fila.length !== 3) { err(f, `llindarsExempcio.${s} ha de tenir 3 valors`); continue; }
    fila.forEach((v, i) => { if (!(s === '1' && i === 0)) enRang(f, `llindarsExempcio.${s}[${i}]`, v, 10000, 30000); });
  }
  if ((irpf.minimDescendents ?? []).length !== 4) err(f, 'minimDescendents ha de tenir 4 valors');
}

if (fitxers.length === 0) err('data', 'no hi ha cap fitxer nomina-AAAA.json');
for (const any of index.anys ?? []) if (!fitxers.includes(`nomina-${any}.json`)) err('index.json', `falta data/nomina-${any}.json`);

// ---------- Factura de llum: data/llum-AAAA.json ----------
const fitxersLlum = (await readdir(dirDades)).filter((n) => /^llum-\d{4}\.json$/.test(n)).sort();
for (const f of fitxersLlum) {
  let d;
  try { d = JSON.parse(await readFile(join(dirDades, f), 'utf8')); } catch (e) { err(f, `JSON invàlid: ${e.message}`); continue; }
  const any = Number(f.match(/\d{4}/)[0]);
  if (d.any !== any) err(f, `"any" (${d.any}) no coincideix amb el nom del fitxer`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.revisat ?? '')) err(f, '"revisat" ha de ser una data AAAA-MM-DD');
  if (!Array.isArray(d.fonts) || d.fonts.length === 0) err(f, 'falten les "fonts" oficials');
  if (!index.llum?.includes(any)) err(f, `l'any ${any} no és a data/index.json ("llum")`);
  const bisext = (any % 4 === 0 && any % 100 !== 0) || any % 400 === 0;
  if (d.diesAny !== (bisext ? 366 : 365)) err(f, `diesAny ha de ser ${bisext ? 366 : 365}`);

  // Peatges i càrrecs 2.0TD (potència en €/kW·any, energia en €/kWh)
  for (const tipus of ['peatges', 'carrecs']) {
    enRang(f, `${tipus}.potencia.P1`, d[tipus]?.potencia?.P1, 0, 60);
    enRang(f, `${tipus}.potencia.P2`, d[tipus]?.potencia?.P2, 0, 10);
    for (const p of ['P1', 'P2', 'P3']) enRang(f, `${tipus}.energia.${p}`, d[tipus]?.energia?.[p], 0, 0.3);
  }
  enRang(f, 'lloguerComptador.monofasicEurDia', d.lloguerComptador?.monofasicEurDia, 0, 0.2);
  enRang(f, 'impostElectric.minimEurMWh', d.impostElectric?.minimEurMWh, 0, 5);

  // Períodes fiscals: han de cobrir l'any sencer, sense forats ni solapaments
  const pf = d.periodesFiscals ?? [];
  if (pf.length === 0) err(f, 'falten els periodesFiscals');
  const dia = (s) => Date.parse(`${s}T00:00:00Z`);
  pf.forEach((p, i) => {
    enRang(f, `periodesFiscals[${i}].iva`, p.iva, 0, 30);
    enRang(f, `periodesFiscals[${i}].impostElectric`, p.impostElectric, 0, 10);
    if (p.ivaReduit != null) enRang(f, `periodesFiscals[${i}].ivaReduit`, p.ivaReduit, 0, p.iva);
    if (!(dia(p.fins) >= dia(p.des))) err(f, `periodesFiscals[${i}]: "fins" és anterior a "des"`);
    if (i > 0 && dia(p.des) - dia(pf[i - 1].fins) !== 864e5) err(f, `periodesFiscals[${i}] no comença l'endemà de l'anterior`);
  });
  if (pf.length && (pf[0].des !== `${any}-01-01` || pf.at(-1).fins !== `${any}-12-31`)) err(f, 'els periodesFiscals han de cobrir de l\'1 de gener al 31 de desembre');
  // Bo social
  const bs = d.boSocial;
  if (!bs) err(f, 'falta "boSocial"');
  else {
    enRang(f, 'boSocial.iprem14', bs.iprem14, 6000, 15000);
    enRang(f, 'boSocial.multiplicador.base', bs.multiplicador?.base, 1, 3);
    for (const k of ['adultAddicional', 'menor', 'circumstanciaEspecial']) enRang(f, `boSocial.multiplicador.${k}`, bs.multiplicador?.[k], 0, 2);
    enRang(f, 'boSocial.severPartDelLlindar', bs.severPartDelLlindar, 0.2, 1);
    for (const k of ['vulnerable', 'sever']) enRang(f, `boSocial.descompteOrdinari.${k}`, bs.descompteOrdinari?.[k], 10, 100);
    (bs.descomptes ?? []).forEach((x, i) => { enRang(f, `boSocial.descomptes[${i}].vulnerable`, x.vulnerable, 10, 100); enRang(f, `boSocial.descomptes[${i}].sever`, x.sever, x.vulnerable, 100); });
    const lk = Object.values(bs.limitsKWh ?? {});
    if (lk.length !== 4 || lk.some((v, i) => i && v <= lk[i - 1])) err(f, 'boSocial.limitsKWh ha de tenir 4 límits creixents');
  }
  const pot = d.potenciesNormalitzades ?? [];
  if (pot.length < 3 || pot.some((v, i) => i && v <= pot[i - 1])) err(f, 'potenciesNormalitzades ha de ser una llista creixent');
}
for (const any of index.llum ?? []) if (!fitxersLlum.includes(`llum-${any}.json`)) err('index.json', `falta data/llum-${any}.json`);

if (errors.length) {
  console.error(`✖ ${errors.length} error(s) a les dades:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ Dades correctes (${[...fitxers, ...fitxersLlum].join(', ')})`);
