#!/usr/bin/env node
// Vigila les fonts oficials que afecten les dades de l'app i avisa si hi ha novetats.
//  - BOE: sumari diari (API de dades obertes) buscant cotització, SMI, IRPF, MEI... i, per a la llum,
//    peatges (CNMC), càrrecs, impost elèctric i IVA de l'electricitat.
//  - AEAT: enllaços nous a la pàgina de retencions (algoritme i quadre de tipus).
//  - Dades: comprova que existeix el fitxer de l'any en curs.
// No modifica les dades: només avisa. Les xifres les revisa una persona (vegeu REVISIO-ANUAL.md).
//
// Ús:  node scripts/vigila-fonts.mjs [--des-de=AAAAMMDD] [--sense-desar]

import { readFile, writeFile, appendFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');
const fitxerEstat = join(arrel, 'scripts', 'estat-vigilancia.json');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));

const UA = { 'User-Agent': 'papers-de-casa-vigilant/1.0', Accept: 'application/json' };
const DIES_ENRERE = 4;

// Paraules clau (sense accents, en minúscules) → tema
const PATRONS = [
  [/normas legales de cotizacion/, 'Cotització a la Seguretat Social (ordre anual)'],
  [/salario minimo interprofesional/, 'Salari mínim interprofessional'],
  [/reglamento del impuesto sobre la renta de las personas fisicas/, 'Reglament de l\'IRPF (retencions)'],
  [/^(?!.*estimacion objetiva).*(ley 35\/2006|impuesto sobre la renta de las personas fisicas)/, 'IRPF'],
  [/mecanismo de equidad intergeneracional/, 'MEI'],
  [/cotizacion adicional de solidaridad/, 'Cotització de solidaritat'],
  [/^ley .*presupuestos generales del estado para/, 'Pressupostos Generals de l\'Estat'],
  [/bases (minimas|maximas) de cotizacion|tope maximo.*cotizacion/, 'Bases de cotització'],
  // Factura de llum
  [/precios de los cargos del sistema electrico/, 'Llum: càrrecs del sistema elèctric'],
  [/impuesto (especial )?sobre la electricidad/, 'Llum: impost elèctric'],
  [/^real decreto-ley.*(energia|electric|precios|crisis|inflacion)/, "Llum: possible canvi d'IVA o impost elèctric (real decret llei)"],
  [/alquiler de (los )?(equipos de medida|contadores)/, 'Llum: lloguer del comptador'],
];
// Secció III (altres disposicions): aquí la CNMC publica els peatges de cada any.
const PATRONS_III = [
  [/peajes de acceso a las redes de transporte y distribucion de electricidad/, 'Llum: peatges de transport i distribució (CNMC)'],
];

const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const aData = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const deData = (s) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));

async function llegeixEstat() {
  try { return JSON.parse(await readFile(fitxerEstat, 'utf8')); } catch { return { boe: {}, aeat: {} }; }
}

/** Recorre el sumari i retorna tots els ítems amb identificador i títol. */
function items(node, sortida = []) {
  if (Array.isArray(node)) node.forEach((n) => items(n, sortida));
  else if (node && typeof node === 'object') {
    if (node.identificador && node.titulo) sortida.push(node);
    for (const v of Object.values(node)) if (v && typeof v === 'object') items(v, sortida);
  }
  return sortida;
}

async function vigilaBOE(estat, troballes) {
  const avui = new Date();
  // Cada execució revisa els últims dies (marge per si un dia falla); els repetits es descarten amb "vistos".
  // Així l'estat només canvia quan hi ha novetats i no cal un commit cada dia.
  const inici = args['des-de'] ? deData(args['des-de']) : new Date(avui.getTime() - DIES_ENRERE * 864e5);

  const vistos = new Set(estat.boe.vistos ?? []);
  for (let d = inici; d <= avui; d = new Date(d.getTime() + 864e5)) {
    const data = aData(d);
    const resp = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${data}`, { headers: UA });
    if (resp.status === 404) continue; // diumenges i festius no hi ha BOE
    if (!resp.ok) { console.warn(`BOE ${data}: HTTP ${resp.status}`); break; }
    const json = await resp.json();
    // Només la secció I (Disposicions generals): és on surten ordres, reials decrets i lleis.
    const seccions = (json.data?.sumario?.diario ?? []).flatMap((dd) => [].concat(dd.seccion ?? []));
    const perSeccio = [['1', PATRONS], ['3', PATRONS_III]]
      .flatMap(([codi, patrons]) => items(seccions.filter((sc) => sc.codigo === codi)).map((it) => [it, patrons]));
    for (const [it, patrons] of perSeccio) {
      if (vistos.has(it.identificador)) continue;
      const titol = normal(it.titulo);
      const tema = patrons.find(([re]) => re.test(titol))?.[1];
      if (!tema) continue;
      vistos.add(it.identificador);
      troballes.push({
        font: 'BOE', tema, data,
        titol: it.titulo,
        url: it.url_html ?? `https://www.boe.es/diario_boe/txt.php?id=${it.identificador}`,
      });
    }
  }
  estat.boe = { vistos: [...vistos].slice(-300) };
}

async function vigilaAEAT(estat, troballes) {
  const url = 'https://sede.agenciatributaria.gob.es/Sede/Retenciones.shtml';
  const resp = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!resp.ok) { console.warn(`AEAT: HTTP ${resp.status}`); return; }
  const html = await resp.text();
  const enllacos = [...new Set([...html.matchAll(/href="([^"]*\/Retenciones\/\d{4}\/[^"]+)"/gi)].map((m) => m[1]))]
    .filter((h) => /algoritmo|cuadro|tipos/i.test(h));
  const coneguts = new Set(estat.aeat.enllacos ?? []);
  const primeraVegada = coneguts.size === 0;
  for (const h of enllacos) {
    if (coneguts.has(h)) continue;
    if (!primeraVegada) {
      troballes.push({
        font: 'AEAT', tema: 'Retencions IRPF (algoritme o quadre de tipus)', data: aData(new Date()),
        titol: decodeURIComponent(h.split('/').pop()),
        url: new URL(h, url).href,
      });
    }
  }
  estat.aeat = { enllacos };
}

async function vigilaDades(troballes) {
  const any = new Date().getFullYear();
  for (const tipus of ['nomina', 'llum']) {
    try {
      await access(join(arrel, 'data', `${tipus}-${any}.json`));
    } catch {
      troballes.push({
        font: 'App', tema: "Dades de l'any", data: aData(new Date()),
        titol: `No existeix data/${tipus}-${any}.json. L'app fa servir les dades de l'any anterior.`,
        url: null,
      });
    }
  }
}

function informe(troballes) {
  const linies = [
    '## Novetats a les fonts oficials',
    '',
    'Cal revisar si canvien les xifres de `data/nomina-AAAA.json` o `data/llum-AAAA.json` (vegeu `REVISIO-ANUAL.md`).',
    '',
    '| Font | Tema | Data | Document |',
    '|---|---|---|---|',
    ...troballes.map((t) => `| ${t.font} | ${t.tema} | ${t.data.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1')} | ${t.url ? `[${t.titol.replace(/\|/g, '/')}](${t.url})` : t.titol} |`),
    '',
    '- [ ] Revisat i dades actualitzades (o no cal cap canvi)',
  ];
  return linies.join('\n');
}

const estat = await llegeixEstat();
const troballes = [];
for (const [nom, fn] of [['BOE', () => vigilaBOE(estat, troballes)], ['AEAT', () => vigilaAEAT(estat, troballes)], ['Dades', () => vigilaDades(troballes)]]) {
  try { await fn(); } catch (err) { console.warn(`${nom}: ${err.message}`); }
}

if (!('sense-desar' in args)) await writeFile(fitxerEstat, JSON.stringify(estat, null, 2) + '\n');

if (troballes.length === 0) {
  console.log('Cap novetat a les fonts oficials.');
} else {
  const md = informe(troballes);
  console.log(md);
  await writeFile(join(arrel, 'scripts', 'avis.md'), md + '\n');
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `novetats=${troballes.length > 0}\n`);
