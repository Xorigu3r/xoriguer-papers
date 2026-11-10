// Comprova que tots els textos de l'app tenen traducció al castellà i que les {variables} coincideixen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ES } from '../js/i18n-es.js';

const arrel = new URL('../', import.meta.url);
const llegeix = (r) => readFileSync(new URL(r, arrel), 'utf8');

export function clausDelCodi() {
  const claus = new Set();
  const fitxers = ['js/app.js', ...readdirSync(new URL('js/nomina/', arrel)).map((f) => `js/nomina/${f}`)];
  const re = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const f of fitxers) {
    for (const m of llegeix(f).matchAll(re)) claus.add((m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
  }
  const html = llegeix('index.html');
  for (const m of html.matchAll(/data-t(?:-title|-aria)?="([^"]*)"/g)) claus.add(m[1]);
  for (const v of Object.values(JSON.parse(llegeix('data/nomina-2026.json')).grupsCotitzacio)) claus.add(v);
  return claus;
}

test('tots els textos tenen traducció al castellà', () => {
  const falten = [...clausDelCodi()].filter((k) => !(k in ES));
  assert.deepEqual(falten, [], `Falten traduccions:\n${falten.join('\n')}`);
});

test('les variables {x} coincideixen entre català i castellà', () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const [ca, es] of Object.entries(ES)) assert.equal(vars(es), vars(ca), ca);
});

test('no hi ha traduccions sobrants', () => {
  const claus = clausDelCodi();
  const sobren = Object.keys(ES).filter((k) => !claus.has(k));
  assert.deepEqual(sobren, []);
});
