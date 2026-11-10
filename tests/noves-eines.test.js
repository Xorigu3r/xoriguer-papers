// Bo social, avisos de l'historial i ajudes per a l'OCR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avaluaBoSocial } from '../js/llum/bo-social.js';
import { avisosNomina, avisosLlum } from '../js/historial.js';
import { pendent } from '../js/ocr.js';
import { interpretaFactura } from '../js/llum/llegeix-pdf.js';
import { interpretaNomina, agrupaLinies } from '../js/nomina/llegeix-pdf.js';

const dades = JSON.parse(readFileSync(new URL('../data/llum-2026.json', import.meta.url), 'utf8'));
const avui = new Date('2026-11-10T12:00:00Z');

test('bo social: llindars del RD 897/2017 amb IPREM de 14 pagues', () => {
  const sol = avaluaBoSocial({ adults: 1, ingressos: 12000 }, dades, avui);
  assert.equal(sol.llindar, 12600); // 1,5 × 8.400
  assert.equal(sol.llindarSever, 6300);
  assert.equal(sol.categoria, 'vulnerable');
  assert.equal(sol.descompte, 42.5); // RDL 7/2026
  assert.equal(sol.limitKWh, 1587);

  const familia = avaluaBoSocial({ adults: 2, menors: 1, ingressos: 9000 }, dades, avui);
  assert.equal(familia.llindar, 19320); // (1,5 + 0,3 + 0,5) × 8.400
  assert.equal(familia.categoria, 'sever');
  assert.equal(familia.descompte, 57.5);
  assert.equal(familia.limitKWh, 2222);

  const especial = avaluaBoSocial({ adults: 1, ingressos: 20000, especial: true }, dades, avui);
  assert.equal(especial.llindar, 21000); // +1 IPREM
  assert.equal(especial.categoria, 'vulnerable');
});

test('bo social: família nombrosa, pensionistes, potència i percentatges ordinaris', () => {
  const fn = avaluaBoSocial({ adults: 2, menors: 3, familiaNombrosa: true, ingressos: 50000 }, dades, avui);
  assert.equal(fn.categoria, 'vulnerable'); // sense límit d'ingressos
  assert.equal(fn.limitKWh, 4761);
  assert.equal(avaluaBoSocial({ adults: 2, menors: 3, familiaNombrosa: true, ingressos: 16000 }, dades, avui).categoria, 'sever'); // ≤ 2 IPREM
  assert.equal(avaluaBoSocial({ adults: 1, pensionistes: true, ingressos: 8000 }, dades, avui).categoria, 'sever'); // ≤ 1 IPREM
  assert.equal(avaluaBoSocial({ adults: 1, ingressos: 30000 }, dades, avui).categoria, 'no');
  assert.equal(avaluaBoSocial({ adults: 1, ingressos: 5000, potencia: 11 }, dades, avui).categoria, 'potencia');
  // El 2027 (sense pròrroga) tornen el 35 % i el 50 %
  assert.equal(avaluaBoSocial({ adults: 1, ingressos: 5000 }, dades, new Date('2027-02-01')).descompte, 50);
});

test('bo social: estalvi aproximat (potència sencera + energia fins al límit, amb impostos)', () => {
  const r = avaluaBoSocial({ adults: 1, ingressos: 10000, potencia: 3.45, consumAnual: 3000, preuEnergia: 0.13 }, dades, avui);
  assert.equal(r.estalvi.kWhAmbDescompte, 1587);
  const potAny = 3.45 * (23.324952 + 4.379461 + 3.113 + 0.44377 + 0.281653);
  const esperat = (potAny + 1587 * 0.13) * 0.425 * (1 + 5.11269632 / 100) * 1.21;
  assert.ok(Math.abs(r.estalvi.ambImpostos - esperat) < 0.02, `${r.estalvi.ambImpostos} ≠ ${esperat}`);
});

const nomina = (mes, net, irpfPct, brut = 2000) => ({ tipus: 'nomina', mes, resum: { net, irpfPct, brut } });
const factura = (mes, total, kWh, dies = 30, preuMig = total / kWh, potencia = 4.6) => ({ tipus: 'llum', mes, resum: { total, kWh, dies, preuMig, potencia } });

test('historial: avisos de canvis a la nòmina', () => {
  const a = avisosNomina([nomina('2026-09', 1600, 14), nomina('2026-10', 1500, 12)]);
  assert.ok(a.some((x) => x.nivell === 'alerta' && x.text.includes('1.500')));
  assert.ok(a.some((x) => x.text.includes("baixat l'IRPF") || x.text.includes('bajado el IRPF')));
  assert.deepEqual(avisosNomina([nomina('2026-10', 1500, 12)]), []);
});

test('historial: la llum es compara per dia (factures de dies diferents)', () => {
  // 60 € en 30 dies (2 €/dia) → 62 € en 31 dies (2 €/dia): cap avís de preu
  assert.equal(avisosLlum([factura('2026-09', 60, 300, 30, 0.2), factura('2026-10', 62, 310, 31, 0.2)]).length, 0);
  // +30 % al dia
  const a = avisosLlum([factura('2026-09', 60, 300), factura('2026-10', 78, 300)]);
  assert.ok(a.some((x) => x.nivell === 'alerta' && x.text.includes('30 %')));
});

test('OCR: pendent de les línies d\'una foto torta', () => {
  const w = (x, y) => ({ bbox: { x0: x, x1: x + 100, y0: y, y1: y + 30 } });
  const a = pendent([[w(100, 500), w(1600, 470)], [w(100, 600), w(1600, 570)], [w(100, 700), w(1600, 671)]]);
  assert.ok(Math.abs(a - Math.atan2(-30, 1500)) < 0.002);
  assert.equal(pendent([[w(100, 500)]]), 0);
});

test('OCR: errors típics («LR.P.F.», «E/kWh», kWh perdut) es toleren', () => {
  const lin = (textos) => agrupaLinies(textos.map((s, i) => ({ str: s, x: 40, y: 800 - i * 15, w: s.length * 5 })));
  const n = interpretaNomina(lin(['30 SALARIO BASE 1.200,00', '10,80 LR.P.F. 129,60', 'LIQUIDO A PERCIBIR 1.000,00']));
  assert.equal(n.valors.irpfNomina, 10.8);
  const f = interpretaFactura([
    'Potencia P1 punta: 4,6 kW x 31 días x 0,098000 E/kW día 13,97 €',
    'Energía P2 llano: 75 x 0,150000 E/kWh 11,25€',
  ]);
  assert.equal(f.valors.preuPotenciaP1, '0.098');
  assert.equal(f.valors.consumP2, '75');
  assert.equal(f.valors.preuEnergiaP2, '0.15');
});
