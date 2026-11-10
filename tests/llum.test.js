import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculaFactura, diesEntre, trams, potenciaRecomanada, aplicaSimulacio } from '../js/llum/calc.js';

const dades = JSON.parse(readFileSync(new URL('../data/llum-2026.json', import.meta.url), 'utf8'));
const aprox = (a, b, tol = 0.011) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const BASE = {
  dataInici: '2026-10-01', dataFi: '2026-10-30',
  potenciaP1: '4.6', potenciaP2: '4.6', preuPotenciaP1: '0.09', preuPotenciaP2: '0.01',
  consumP1: '60', consumP2: '70', consumP3: '120',
  preuEnergiaP1: '0.20', preuEnergiaP2: '0.15', preuEnergiaP3: '0.10',
};

test('dies de facturació amb inici i fi inclosos', () => {
  assert.equal(diesEntre('2026-10-01', '2026-10-30'), 30);
  assert.equal(diesEntre('2026-09-15', '2026-10-14'), 30);
  assert.equal(diesEntre('2026-10-30', '2026-10-01'), null);
});

test('factura normal (octubre): potència, energia, impost, comptador i IVA', () => {
  const r = calculaFactura(BASE, dades);
  assert.equal(r.dies, 30);
  assert.equal(r.potencia, 13.8);       // 4,6×30×0,09 + 4,6×30×0,01
  assert.equal(r.energia, 34.5);        // 60×0,20 + 70×0,15 + 120×0,10
  assert.equal(r.baseImpost, 48.3);
  assert.equal(r.impostElectric, 2.47); // 48,30 × 5,11269632 %
  assert.equal(r.lloguer, 0.8);         // 0,02663 × 30
  assert.equal(r.baseIVA, 51.57);
  assert.equal(r.iva, 10.83);           // 21 %
  assert.equal(r.total, 62.4);
  assert.equal(r.kWh, 250);
});

test('part regulada: peatges i càrrecs del BOE', () => {
  const r = calculaFactura(BASE, dades);
  aprox(r.regulat.potencia, 4.6 * 30 * (27.704413 + 0.725423) / 365);
  aprox(r.regulat.energia, 60 * 0.097553 + 70 * 0.029267 + 120 * 0.003292);
});

test('abril del 2026: impost elèctric 0,5 % (amb mínim d\'1 €/MWh) i IVA 10 % fins a 10 kW', () => {
  const r = calculaFactura({ ...BASE, dataInici: '2026-04-01', dataFi: '2026-04-30' }, dades);
  assert.equal(r.impostElectric, 0.25); // 0,5 % de 48,30 = 0,24 < mínim 250 kWh × 1 €/MWh
  assert.equal(r.tipusIVA, 10);
  aprox(r.total, 49.35 * 1.10, 0.015);

  const gran = calculaFactura({ ...BASE, dataInici: '2026-04-01', dataFi: '2026-04-30', potenciaP1: '11.5', potenciaP2: '11.5' }, dades);
  assert.equal(gran.tipusIVA, 21);      // més de 10 kW: IVA general
});

test('factura que travessa el canvi d\'impostos (22/05 – 20/06): es reparteix per dies', () => {
  const tr = trams({ dataInici: '2026-05-22', dataFi: '2026-06-20' }, dades);
  assert.equal(tr.length, 2);
  aprox(tr[0].pes, 10 / 30, 1e-9);
  aprox(tr[1].pes, 20 / 30, 1e-9);
  const r = calculaFactura({ ...BASE, dataInici: '2026-05-22', dataFi: '2026-06-20' }, dades);
  aprox(r.tipusIVA, 10 / 3 + 21 * 2 / 3, 0.01);
});

test('IVA i impost elèctric escrits a mà tenen prioritat', () => {
  const r = calculaFactura({ ...BASE, iva: '10', impostElectric: '0.5' }, dades);
  assert.equal(r.tipusIVA, 10);
  assert.equal(r.impostElectric, 0.25);
});

test('preu únic d\'energia i comptador propi', () => {
  const r = calculaFactura({ ...BASE, unPreu: true, preuEnergia: '0.14', lloguer: false }, dades);
  assert.equal(r.energia, 35);
  assert.equal(r.lloguer, 0);
});

test('avisos: total que no quadra, preu de potència anual i potència sobredimensionada', () => {
  const r = calculaFactura({ ...BASE, totalFactura: '70', preuPotenciaP1: '30', potenciaP1: '5.75', potenciaP2: '5.75', maximetre: '2.5' }, dades);
  assert.ok(r.avisos.some((a) => a.nivell === 'alerta' && a.text.includes('70')));
  assert.ok(r.avisos.some((a) => a.text.includes('anual o mensual')));
  assert.equal(potenciaRecomanada(2.5, dades), 3.45);
  assert.ok(r.avisos.some((a) => a.text.includes('3,45')));
  const ok = calculaFactura({ ...BASE, totalFactura: '62.40' }, dades);
  assert.ok(ok.avisos.some((a) => a.nivell === 'ok'));
});

test('simulació: baixar potència i passar consum a la vall abarateix la factura', () => {
  const ara = calculaFactura(BASE, dades);
  const sim = calculaFactura(aplicaSimulacio(BASE, { potencia: 3.45, desplacament: 20 }), dades);
  assert.ok(sim.total < ara.total);
  assert.equal(sim.kWh, ara.kWh); // el consum total no canvia
});
