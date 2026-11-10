// Lector de factures de llum en PDF. Els PDF de prova es generen amb scripts/genera-pdf-proves.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { llegeixFacturaPdf, interpretaFactura, numLlum } from '../js/llum/llegeix-pdf.js';
import { calculaFactura } from '../js/llum/calc.js';

const avis = console.log;
console.log = (...a) => { if (!String(a[0]).includes('legacy')) avis(...a); };

const dades = JSON.parse(readFileSync(new URL('../data/llum-2026.json', import.meta.url), 'utf8'));
const pdf = (nom) => new Uint8Array(readFileSync(new URL(`./fixtures/${nom}.pdf`, import.meta.url)));

test('números de factura amb molts decimals', () => {
  assert.equal(numLlum('0,098123'), 0.098123);
  assert.equal(numLlum('4,6'), 4.6);
  assert.equal(numLlum('1.234,56'), 1234.56);
  assert.equal(numLlum('0.098'), 0.098);
  assert.equal(numLlum('5,11269632'), 5.11269632);
});

test('factura en català (mercat lliure): tot llegit i el total quadra', async () => {
  const r = await llegeixFacturaPdf(pdf('factura-llum-ca'));
  assert.deepEqual(r.valors, {
    dataInici: '2026-10-01', dataFi: '2026-10-31',
    lloguer: true, lloguerDia: '0.02663', totalFactura: '63.89',
    potenciaP1: '4.6', preuPotenciaP1: '0.098', potenciaP2: '4.6', preuPotenciaP2: '0.012',
    consumP1: '62', preuEnergiaP1: '0.22', consumP2: '75', preuEnergiaP2: '0.15', consumP3: '133', preuEnergiaP3: '0.09',
    unPreu: false, boSocialDia: '0.019', descompte: '3.69', // el resum i el detall no se sumen dos cops
    impostElectric: '5.11269632', iva: '21', maximetre: '3.1',
  });
  assert.deepEqual(r.noTrobats, []);
  const c = calculaFactura(r.valors, dades);
  assert.equal(c.total, 63.89);
});

test('factura PVPC en castellà: peatges, càrrecs i marge en €/kW any se sumen', async () => {
  const r = await llegeixFacturaPdf(pdf('factura-llum-pvpc'));
  const v = r.valors;
  assert.equal(v.potenciaP1, '3.45');
  assert.equal(Number(v.preuPotenciaP1), Math.round((23.324952 + 4.379461 + 3.113) / 365 * 1e6) / 1e6);
  // «coste de la energía» (sense franja) se suma al preu de cada franja
  assert.equal(Number(v.preuEnergiaP3), Math.round((0.003292 + 0.1182) * 1e6) / 1e6);
  assert.equal(v.consumP2, '52');
  assert.equal(v.maximetre, '2.87');
  assert.ok(r.avisos.some((a) => a.codi === 'pvpc'));
  const c = calculaFactura(v, dades);
  assert.ok(Math.abs(c.total - 48.67) <= 0.02, `${c.total}`);
});

test('preu únic: el consum per franges surt de la informació de consum', () => {
  const r = interpretaFactura([
    'Periodo de facturación: del 01/11/2026 al 30/11/2026',
    'Potencia punta 3,3 kW x 30 días x 0,1 €/kW día 9,90 €',
    'Energía consumida 200 kWh x 0,15 €/kWh 30,00 €',
    'Consumo punta 50 kWh   llano 60 kWh   valle 90 kWh',
    'Servicio de mantenimiento 4,50 €',
    'TOTAL A PAGAR 60,00 €',
  ]);
  assert.equal(r.valors.unPreu, true);
  assert.equal(r.valors.preuEnergia, '0.15');
  assert.equal(r.valors.potenciaP2, '3.3'); // si no surt la vall, la mateixa que la punta
  assert.equal(r.valors.altres, '4.5');
  assert.equal(r.valors.totalFactura, '60');
  assert.ok(r.avisos.some((a) => a.codi === 'sense-lloguer'));
});

test('avisos: autoconsum, tarifa 3.0TD i dos tipus d\'IVA', () => {
  const r = interpretaFactura([
    'Peaje de acceso 3.0TD',
    'Energía excedentaria compensada -50 kWh x 0,06 €/kWh -3,00 €',
    'IVA 10% s/ 20,00 € 2,00 €',
    'IVA 21% s/ 30,00 € 6,30 €',
  ]);
  const codis = r.avisos.map((a) => a.codi);
  assert.ok(codis.includes('tarifa') && codis.includes('autoconsum') && codis.includes('dos-tipus'));
  assert.equal(r.valors.iva, undefined); // amb dos tipus, l'IVA es calcula per dates
  assert.ok(r.noTrobats.includes('potencia'));
});
