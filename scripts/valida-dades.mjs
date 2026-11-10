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

if (errors.length) {
  console.error(`✖ ${errors.length} error(s) a les dades:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ Dades correctes (${fitxers.join(', ')})`);
