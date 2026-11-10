import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculaNomina, estimaIRPF } from '../js/nomina/calc.js';

const dades = JSON.parse(readFileSync(new URL('../data/nomina-2026.json', import.meta.url)));

test('nòmina típica 14 pagues no prorratejades', () => {
  const r = calculaNomina({ salariBase: 1800, pagues: 14, irpfNomina: 12 }, dades);
  assert.equal(r.prorrata, 300);
  assert.equal(r.bccc, 2100);
  assert.equal(r.totalMeritat, 1800);
  const cc = r.linies.find((l) => l.clau === 'cc');
  assert.equal(cc.import, 98.7); // 4,70 % de 2.100
  assert.equal(r.totalSS, 136.5); // 6,50 % de 2.100
  assert.equal(r.irpf.import, 216);
  assert.equal(r.net, 1447.5);
  assert.equal(r.pagaExtra.net, 1584);
});

test('prorratejades: la prorrata entra a meritacions i IRPF', () => {
  const r = calculaNomina({ salariBase: 1800, pagues: 14, prorratejades: true, irpfNomina: 12 }, dades);
  assert.equal(r.totalMeritat, 2100);
  assert.equal(r.irpf.import, 252);
  assert.equal(r.pagaExtra, null);
});

test('contracte temporal cotitza 1,60 % d\'atur', () => {
  const r = calculaNomina({ salariBase: 1500, pagues: 12, contracte: 'temporal' }, dades);
  assert.equal(r.linies.find((l) => l.clau === 'atur').tipus, 1.6);
});

test('base mínima i màxima', () => {
  const baix = calculaNomina({ salariBase: 600, pagues: 12, jornada: 100 }, dades);
  assert.equal(baix.bccc, dades.basesCotitzacio.minimaPerGrup['7']);
  const alt = calculaNomina({ salariBase: 7000, pagues: 12 }, dades);
  assert.equal(alt.bccc, dades.basesCotitzacio.maximaMensual);
  assert.ok(alt.linies.some((l) => l.clau === 'solidaritat'));
});

test('IRPF: per sota del límit excloent no hi ha retenció (situació 3, sense fills)', () => {
  const r = calculaNomina({ salariBase: 1100, pagues: 14 }, dades); // 15.400 € < 15.876 €
  assert.equal(r.estimacioIRPF.exempt, true);
  assert.equal(r.estimacioIRPF.tipus, 0);
});

test('IRPF: contracte < 1 any té mínim del 2 % encara que estigui exempt', () => {
  const r = calculaNomina({ salariBase: 1100, pagues: 14, contracteMenysUnAny: true }, dades);
  assert.equal(r.estimacioIRPF.tipus, 2);
});

test('IRPF: 30.000 € bruts, solter sense fills = 16,42 % (càlcul manual amb l\'algoritme AEAT)', () => {
  // SS 1.950; base 30.000-1.950-2.000 = 26.050; quota 5.980,50 - 1.054,50 = 4.926 → 16,42 %
  const r = calculaNomina({ salariBase: 30000 / 14, pagues: 14 }, dades);
  assert.equal(r.estimacioIRPF.baseRetencio, 26050);
  assert.equal(r.estimacioIRPF.tipus, 16.42);
});

test('IRPF: fills computats per enter redueixen més que per meitat', () => {
  const base = { salariBase: 2500, pagues: 14 };
  const sense = calculaNomina(base, dades).estimacioIRPF;
  const meitat = calculaNomina({ ...base, descendents: [{ anyNaixement: 2015 }, { anyNaixement: 2025 }] }, dades).estimacioIRPF;
  const enter = calculaNomina({ ...base, descendents: [{ anyNaixement: 2015, perEnter: true }, { anyNaixement: 2025, perEnter: true }] }, dades).estimacioIRPF;
  assert.equal(meitat.detallMinim.descendents, (2400 + 2700 + 2800) / 2);
  assert.equal(enter.detallMinim.descendents, 2400 + 2700 + 2800);
  assert.ok(enter.tipus < meitat.tipus && meitat.tipus < sense.tipus);
});

test('IRPF: fills de 25 anys o més sense discapacitat no compten', () => {
  const r = calculaNomina({ salariBase: 2500, pagues: 14, descendents: [{ anyNaixement: 1999 }] }, dades);
  assert.equal(r.estimacioIRPF.numDescendents, 0);
});

test('IRPF: límits excloents de la taula oficial', () => {
  const ll = (sit, n) => calculaNomina({ salariBase: 3000, pagues: 14, situacioFamiliar: sit,
    descendents: Array.from({ length: n }, () => ({ anyNaixement: 2015 })) }, dades).estimacioIRPF.llindar;
  assert.equal(ll('3', 0), 15876); assert.equal(ll('3', 1), 16342); assert.equal(ll('3', 2), 16867);
  assert.equal(ll('2', 0), 17197); assert.equal(ll('2', 3), 19262);
  assert.equal(ll('1', 1), 17644); assert.equal(ll('1', 2), 18694);
});

test('IRPF: discapacitat del treballador, ascendents i hipoteca rebaixen la retenció', () => {
  const base = { salariBase: 2200, pagues: 14 };
  const t0 = calculaNomina(base, dades).estimacioIRPF.tipus;
  assert.ok(calculaNomina({ ...base, discapacitat: '33a65' }, dades).estimacioIRPF.tipus < t0);
  const ambAsc = calculaNomina({ ...base, ascendents: [{ anyNaixement: 1945, convivencia: 2 }] }, dades).estimacioIRPF;
  assert.equal(ambAsc.detallMinim.ascendents, (1150 + 1400) / 2);
  assert.ok(calculaNomina({ ...base, prestecHabitatge: true }, dades).estimacioIRPF.tipus < t0);
});

test('IRPF: pensió compensatòria i anualitats per aliments', () => {
  const base = { salariBase: 3000, pagues: 14 };
  const t0 = calculaNomina(base, dades).estimacioIRPF.tipus;
  assert.ok(calculaNomina({ ...base, pensioCompensatoria: 3000 }, dades).estimacioIRPF.tipus < t0);
  assert.ok(calculaNomina({ ...base, anualitatsAliments: 4000 }, dades).estimacioIRPF.tipus < t0);
});

test('base mínima segons grup de cotització', () => {
  const r = calculaNomina({ salariBase: 1500, pagues: 12, grup: '1' }, dades);
  assert.equal(r.bccc, 1989.3);
});

test('avís si el net no quadra', () => {
  const r = calculaNomina({ salariBase: 1800, pagues: 14, irpfNomina: 12, netNomina: 1400 }, dades);
  assert.ok(r.avisos.some((a) => a.nivell === 'alerta' && a.text.includes('líquid')));
});
