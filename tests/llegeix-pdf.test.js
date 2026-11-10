// Lector de nòmines en PDF. Els PDF de prova es generen amb scripts/genera-pdf-proves.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { llegeixNominaPdf, agrupaLinies, interpretaNomina, llegeixNombre } from '../js/nomina/llegeix-pdf.js';

// pdf.js avisa que a Node és millor la build «legacy»: ja és la que fem servir
const avis = console.log;
console.log = (...a) => { if (!String(a[0]).includes('legacy')) avis(...a); };

const pdf = (nom) => new Uint8Array(readFileSync(new URL(`./fixtures/${nom}.pdf`, import.meta.url)));
const linies = (...textos) => agrupaLinies(textos.flatMap((fila, i) => fila.map(([x, str]) => ({ x, y: 800 - i * 15, str, w: str.length * 5 }))));

test('números en format espanyol i anglès', () => {
  assert.equal(llegeixNombre('1.508,76'), 1508.76);
  assert.equal(llegeixNombre('70,91'), 70.91);
  assert.equal(llegeixNombre('1,508.76'), 1508.76);
  assert.equal(llegeixNombre('1508.76'), 1508.76);
});

test('nòmina clàssica en castellà (una columna, totals a sota de l\'etiqueta)', async () => {
  const r = await llegeixNominaPdf(pdf('nomina-columna'));
  assert.deepEqual(r.valors, {
    salariBase: 783.74,
    complementsSalarials: 594.4, // dedicació + millora voluntària + no competència
    prorratejades: true, pagues: '14', importPagaExtra: 783.72,
    contracte: 'indefinit', // atur 1,55 %
    netNomina: 1250,
    irpfNomina: 10.8,
    grup: '7',
  });
  assert.equal(r.totals.totalMeritat, 1508.76);
  assert.equal(r.totals.totalDeduir, 258.76);
  assert.equal(r.cotitzacio.cc.pct, 4.7);
  assert.equal(r.cotitzacio.cc.import, 70.91);
  assert.equal(r.cotitzacio.mei, undefined); // el 2018 no hi havia MEI
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.noTrobats, []);
});

test('nòmina en català amb meritacions i deduccions en paral·lel', async () => {
  const r = await llegeixNominaPdf(pdf('nomina-dues-columnes'));
  assert.deepEqual(r.valors, {
    salariBase: 1500, complementsSalarials: 180, noSalarials: 60,
    prorratejades: true, pagues: '14', importPagaExtra: 1500,
    contracte: 'temporal', // atur 1,60 %
    netNomina: 1622.33, irpfNomina: 12.5, grup: '5',
  });
  assert.equal(r.cotitzacio.mei.pct, 0.15);
  assert.deepEqual(r.avisos, []);
});

test('PDF escanejat (sense text) i PDF amb contrasenya', async () => {
  await assert.rejects(llegeixNominaPdf(pdf('nomina-escanejada')), { codi: 'sense-text' });
  await assert.rejects(llegeixNominaPdf(pdf('nomina-contrasenya')), { codi: 'contrasenya' });
  await assert.rejects(llegeixNominaPdf(pdf('nomina-contrasenya'), 'no'), { codi: 'contrasenya-incorrecta' });
  const r = await llegeixNominaPdf(pdf('nomina-contrasenya'), '1234');
  assert.equal(r.valors.salariBase, 783.74);
});

test('paga extra al mes i suma de meritacions que no quadra', () => {
  const r = interpretaNomina(linies(
    [[40, 'Salario base'], [400, '1.200,00']],
    [[40, 'Paga extra de Navidad'], [400, '1.200,00']],
    [[40, 'Contingencias comunes'], [300, '4,70'], [400, '56,40']],
    [[40, 'Total devengado'], [400, '2.600,00']],
  ));
  assert.ok(r.avisos.some((a) => a.codi === 'paga-extra' && a.import === 1200));
  assert.ok(r.avisos.some((a) => a.codi === 'meritat-no-quadra' && a.suma === 2400));
  assert.ok(r.noTrobats.includes('irpf'));
});

test('IRPF sense percentatge: es calcula amb la base', () => {
  const r = interpretaNomina(linies(
    [[40, 'Sueldo base'], [400, '2.000,00']],
    [[40, 'Retención IRPF'], [400, '300,00']],
    [[40, 'Base sujeta a retención'], [400, '2.000,00']],
  ));
  assert.equal(r.valors.irpfNomina, 15);
  assert.ok(r.avisos.some((a) => a.codi === 'irpf-calculat'));
});
