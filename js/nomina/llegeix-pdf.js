// Llegeix una nòmina en PDF al dispositiu (pdf.js) i en treu les xifres per omplir el formulari.
// No s'envia res enlloc. Cada empresa fa servir un format diferent: per això es busquen els
// conceptes pel nom (en català i castellà) i es mostra sempre el que s'ha llegit perquè es revisi.

// ---------- Lectura del PDF ----------
let pdfjs = null;
async function carregaPdfjs() {
  if (!pdfjs) {
    const url = new URL('../../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
    pdfjs = await import(url);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  }
  return pdfjs;
}

export class ErrorPdf extends Error {
  constructor(codi, missatge) { super(missatge ?? codi); this.codi = codi; }
}

/** Retorna els trossos de text de cada pàgina: [{ str, x, y, w, pagina }]. */
export async function textDelPdf(bytes, contrasenya) {
  const lib = await carregaPdfjs();
  let doc;
  // verbosity 0: només errors (per extreure text no calen les fonts estàndard)
  const tasca = lib.getDocument({ data: bytes, password: contrasenya || undefined, isEvalSupported: false, verbosity: 0 });
  try {
    doc = await tasca.promise;
  } catch (e) {
    await tasca.destroy().catch(() => {});
    if (e?.name === 'PasswordException') throw new ErrorPdf(e.code === 2 ? 'contrasenya-incorrecta' : 'contrasenya');
    throw new ErrorPdf('no-pdf', e?.message);
  }
  const items = [];
  const pagines = Math.min(doc.numPages, 4); // una nòmina no en té més; evita PDF enormes
  for (let p = 1; p <= pagines; p++) {
    const pag = await doc.getPage(p);
    const tc = await pag.getTextContent();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      // Les pàgines següents es posen a sota de l'anterior
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5] - (p - 1) * 10000, w: it.width, pagina: p });
    }
  }
  const total = doc.numPages;
  await tasca.destroy();
  return { items, pagines: total };
}

// ---------- Text → línies ----------
/** Agrupa els trossos de text en línies (mateixa alçada), d'esquerra a dreta. */
export function agrupaLinies(items, tolerancia = 3) {
  const ordenats = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const linies = [];
  for (const it of ordenats) {
    const l = linies.at(-1);
    if (l && Math.abs(l.y - it.y) <= tolerancia) l.items.push(it);
    else linies.push({ y: it.y, items: [it] });
  }
  return linies.map((l) => {
    l.items.sort((a, b) => a.x - b.x);
    let text = '';
    const trossos = [];
    let fi = null;
    for (const it of l.items) {
      if (text && (fi == null || it.x - fi > 1)) text += ' ';
      trossos.push({ ini: text.length, x: it.x, w: it.w ?? 0, len: it.str.length });
      text += it.str;
      fi = it.x + (it.w ?? 0);
    }
    return { y: l.y, text, trossos };
  });
}

// Posició horitzontal aproximada d'un caràcter de la línia
function xDe(linia, idx) {
  for (let i = linia.trossos.length - 1; i >= 0; i--) {
    const t = linia.trossos[i];
    if (idx >= t.ini) return t.x + (t.len ? Math.min(1, (idx - t.ini) / t.len) * t.w : 0);
  }
  return 0;
}

// Minúscules i sense accents, amb la mateixa llargada (per conservar les posicions)
const pla = (s) => [...s].map((c) => (c.normalize('NFD')[0] ?? c).toLowerCase()).join('');

// Imports: 1.234,56 · 1234,56 · 1,234.56 · 1234.56 (també amb el signe menys)
const RE_NUM = /(?<![\d.,])-?(?:\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+,\d{1,2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})(?![\d])/g;
export function llegeixNombre(s) {
  let t = s.trim();
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  return Number(t);
}
function nombres(linia) {
  return [...linia.text.matchAll(RE_NUM)].map((m) => ({ v: llegeixNombre(m[0]), ini: m.index, fi: m.index + m[0].length, x: xDe(linia, m.index) }));
}

// ---------- Conceptes ----------
// L'ordre importa: el primer patró que encaixa en un tros de línia s'emporta aquell tros.
const CONCEPTES = [
  { clau: 'baseIRPF', re: /base\s*(sujeta|subjecta)[^\d]*|base\s*(de\s*)?(retencio|i\.?r\.?p\.?f)/ },
  { clau: 'baseCC', re: /base\s*(de\s*)?(cotizacion|cotitzacio)?\s*(por|per)?\s*(contingencias|contingencies|cont\.)\s*comun[^\d]*|remuneraci[^\d]*|prorrata\s*paga\s*extraord[^\d]*|importe?\s*prorrata[^\d]*/ },
  { clau: 'totalMeritat', re: /total\s*(devengad|meritat|bruto?\b)\w*/ },
  { clau: 'totalDeduir', re: /total\s*(a\s*)?(deduc|dedui)\w*/ },
  { clau: 'net', re: /liquid[oa]?\s*(total\s*)?(a\s*)?(percib|percebr)\w*|neto\s*a\s*(cobrar|percibir)|total\s*a\s*(cobrar|percebre|percibir)/ },
  { clau: 'cc', re: /conting\w*\.?\s*comun|cont\.?\s*comun|c\.\s*comunes/ },
  { clau: 'atur', re: /desemple|desocupaci|\batur\b/ },
  { clau: 'fp', re: /formaci\w*\s*prof|for\.?\s*prof|f\.\s*prof/ },
  { clau: 'mei', re: /\bm\.?e\.?i\b|equidad|equitat/ },
  { clau: 'heSS', re: /cotiz\w*\s*(adicional\s*)?hor|cotitz\w*\s*(addicional\s*)?hor|hor\w*\s*extra\w*\s*(fuerza|forca|estruct)/ },
  { clau: 'irpf', re: /i\.?\s*r\.?\s*p\.?\s*f|retenci/ },
  { clau: 'prorrata', re: /p\.?\s*p\.?\s*(de\s*)?pag|prorr?at|parte\s*prop|part\s*prop/ },
  { clau: 'pagaExtra', re: /paga\s*extra|gratificaci|paga\s*(de\s*)?(junio|juny|navidad|nadal|verano|estiu|beneficios|beneficis|marzo|marc)/ },
  { clau: 'horesExtres', re: /hor\w*\s*extra/ },
  { clau: 'salariBase', re: /salari\w*\s*base|sueldo\s*base|sou\s*base/ },
  { clau: 'noSalarials', re: /transport|dieta|kilomet|quilomet|distancia|desgaste?|extrasalar|indemni[zt]|locomoc|suplid|vestuari|herramient|eines|teletreball|teletrabajo|manutenc/ },
  { clau: 'complement', re: /plus|antig|complement|comp\.|mej\.?\s*vol|mejora|millora|incentiv|dedicac|nocturn|peligros|perillos|productiv|competenc|prima\b|bonus|comisi|comissi|festiv|turnicid|toxic|responsab|idioma|asistencia|assistencia|absorbible|ad\s*personam|voluntari/ },
];
// Percentatges raonables a la nòmina (part del treballador)
const RANG_PCT = { cc: [3, 6.5], atur: [1, 2.5], fp: [0.05, 0.5], mei: [0.05, 0.6], heSS: [1, 6], irpf: [0, 50] };
const TOTALS = new Set(['totalMeritat', 'totalDeduir', 'net']);
const COTITZACIONS = new Set(['cc', 'atur', 'fp', 'mei', 'heSS']);

/** Troba els conceptes de cada línia amb els seus números. */
export function trobaConceptes(linies) {
  const trobats = [];
  linies.forEach((linia, il) => {
    const p = pla(linia.text);
    // Totes les coincidències de la línia, sense solapaments (la primera regla guanya)
    const ocupat = new Array(p.length).fill(false);
    const coincid = [];
    for (const c of CONCEPTES) {
      const re = new RegExp(c.re.source, 'g');
      for (const m of p.matchAll(re)) {
        if (ocupat.slice(m.index, m.index + m[0].length).some(Boolean)) continue;
        for (let i = m.index; i < m.index + m[0].length; i++) ocupat[i] = true;
        coincid.push({ clau: c.clau, ini: m.index, fi: m.index + m[0].length });
      }
    }
    if (!coincid.length) return;
    coincid.sort((a, b) => a.ini - b.ini);
    // «COMP. DEDICACIÓ»: dues paraules del mateix concepte seguides, sense números entre mig → un sol concepte
    for (let i = coincid.length - 1; i > 0; i--) {
      const [a, b] = [coincid[i - 1], coincid[i]];
      if (a.clau === b.clau && !/\d/.test(linia.text.slice(a.fi, b.ini))) { a.fi = b.fi; coincid.splice(i, 1); }
    }
    const nums = nombres(linia);
    coincid.forEach((c, i) => {
      // Els números entre aquest concepte i el següent són seus; els d'abans del primer, també (quantia)
      const finsA = coincid[i + 1]?.ini ?? Infinity;
      const desDe = i === 0 ? -1 : coincid[i - 1].fi;
      const despres = nums.filter((n) => n.ini >= c.fi && n.ini < finsA);
      const abans = nums.filter((n) => n.fi <= c.ini && n.ini > desDe);
      // Text del concepte tal com surt a la nòmina (fins al primer número o el concepte següent)
      const fiText = Math.min(despres[0]?.ini ?? Infinity, finsA, linia.text.length);
      // …i des del número anterior, per no perdre paraules com «P. NO» de «P. NO COMPETENCIA»
      // (un concepte anterior de la línia també fa de límit si és un total o té números propis)
      const ant = coincid[i - 1];
      const limitAnt = ant && (TOTALS.has(ant.clau) || nums.some((n) => n.ini >= ant.fi && n.ini < c.ini)) ? ant.fi : 0;
      const iniText = Math.min(c.ini, Math.max(limitAnt, nums.filter((n) => n.fi <= c.ini).at(-1)?.fi ?? 0));
      const etiqueta = linia.text.slice(iniText, fiText).replace(/^[\d\s.,%]+/, '').replace(/[.\s:%]+$/, '').trim();
      trobats.push({ clau: c.clau, etiqueta, linia: il, x: xDe(linia, c.ini), abans: abans.map((n) => n.v), despres: despres.map((n) => n.v), text: linia.text });
    });
  });
  return trobats;
}

// Si un total no té el número a la mateixa línia, el busca a les línies de sota (columna més propera)
function valorDeSota(linies, t) {
  for (let il = t.linia + 1; il <= t.linia + 2 && il < linies.length; il++) {
    if (Math.abs(linies[il].y - linies[t.linia].y) > 40) break;
    const nums = nombres(linies[il]);
    if (!nums.length) continue;
    const prop = nums.reduce((a, b) => (Math.abs(b.x - t.x) < Math.abs(a.x - t.x) ? b : a));
    if (Math.abs(prop.x - t.x) < 160) return prop.v;
  }
  return null;
}

// Grup de cotització: «Grup de cotització: 5», «Grupo cotiz. 07», «G.C» amb el número a sota...
function trobaGrup(linies) {
  const RE = /grupo?\s*(de\s*)?(cotiz|cotitz|tarifa)\w*\.?|\bg\.\s*c\b\.?|\bgrupo?\b/g;
  for (let il = 0; il < linies.length; il++) {
    const p = pla(linies[il].text);
    for (const m of p.matchAll(RE)) {
      const resta = linies[il].text.slice(m.index + m[0].length);
      const mm = resta.match(/^\s*[:.]?\s*(\d{1,2})\b(?![.,]\d)/);
      if (mm && +mm[1] >= 1 && +mm[1] <= 11) return String(+mm[1]);
      // a la línia de sota, just sota l'etiqueta
      const x = xDe(linies[il], m.index);
      const seg = linies[il + 1];
      if (seg && Math.abs(seg.y - linies[il].y) < 25) {
        for (const n of seg.text.matchAll(/(?<![\d.,/])(\d{1,2})(?![\d.,/])/g)) {
          if (Math.abs(xDe(seg, n.index) - x) < 30 && +n[1] >= 1 && +n[1] <= 11) return String(+n[1]);
        }
      }
    }
  }
  return null;
}

const r2 = (v) => Math.round(v * 100) / 100;
const quasi = (a, b, tol = 0.05) => a != null && b != null && Math.abs(a - b) <= tol;

/**
 * Interpreta les línies d'una nòmina. Retorna:
 *  - valors: camps del formulari de «Comprovar nòmina»
 *  - detall: d'on surt cada valor (per revisar-lo)
 *  - noTrobats, avisos
 */
export function interpretaNomina(linies) {
  const trobats = trobaConceptes(linies);
  const valors = {};
  const detall = [];
  const avisos = [];
  const afegeix = (clau, t, import_, extra = {}) => detall.push({ clau, etiqueta: t.etiqueta, import: import_, ...extra });

  // Imports de meritacions: l'últim número després del concepte
  const imp = (t) => t.despres.at(-1) ?? null;
  const suma = (clau) => {
    const ts = trobats.filter((t) => t.clau === clau && imp(t) != null && imp(t) > 0);
    ts.forEach((t) => afegeix(clau, t, imp(t)));
    return ts.length ? r2(ts.reduce((s, t) => s + imp(t), 0)) : null;
  };
  const sb = suma('salariBase');
  if (sb != null) valors.salariBase = sb;
  const comp = suma('complement');
  if (comp != null) valors.complementsSalarials = comp;
  const noSal = suma('noSalarials');
  if (noSal != null) valors.noSalarials = noSal;
  const he = suma('horesExtres');
  if (he != null) valors.horesExtres = he;
  const prorrata = suma('prorrata');
  if (prorrata != null) {
    valors.prorratejades = true;
    valors.pagues = '14';
    valors.importPagaExtra = r2(prorrata * 6); // 2 pagues: prorrata × 12 ÷ 2
  }
  const pagaExtra = suma('pagaExtra');
  if (pagaExtra != null) avisos.push({ codi: 'paga-extra', import: pagaExtra });

  // Cotitzacions i IRPF: percentatge (dins del rang raonable) i import
  const cotitzacio = {};
  for (const clau of [...COTITZACIONS, 'irpf']) {
    const [min, max] = RANG_PCT[clau];
    for (const t of trobats.filter((x) => x.clau === clau)) {
      const tots = [...t.abans, ...t.despres];
      if (!t.despres.length) continue;
      const import_ = t.despres.at(-1);
      const pct = tots.find((v) => v !== import_ && v >= min && v <= max) ?? null;
      // A la part de bases (aportació de l'empresa) els percentatges queden fora del rang: es descarten
      if (pct == null && clau !== 'irpf') continue;
      if (cotitzacio[clau]) continue;
      cotitzacio[clau] = { pct, import: import_ };
      afegeix(clau, t, import_, { pct });
    }
  }
  if (cotitzacio.atur?.pct != null) valors.contracte = cotitzacio.atur.pct >= 1.58 ? 'temporal' : 'indefinit';

  // Totals (a la mateixa línia o a sota)
  const totals = {};
  for (const clau of TOTALS) {
    const t = trobats.find((x) => x.clau === clau);
    if (!t) continue;
    const v = t.despres.at(-1) ?? valorDeSota(linies, t);
    if (v != null) { totals[clau] = v; afegeix(clau, t, v); }
  }
  if (totals.net != null) valors.netNomina = totals.net;

  // Bases
  const tBase = trobats.find((x) => x.clau === 'baseIRPF' && x.despres.length);
  const baseIRPF = tBase ? tBase.despres.at(-1) : null;
  if (tBase) afegeix('baseIRPF', tBase, baseIRPF);

  // IRPF: el percentatge; si no surt, es dedueix de l'import i la base
  const irpf = cotitzacio.irpf;
  if (irpf?.pct != null) valors.irpfNomina = irpf.pct;
  else if (irpf?.import != null) {
    const base = baseIRPF ?? (totals.totalMeritat != null ? totals.totalMeritat - (valors.noSalarials ?? 0) : null);
    if (base) { valors.irpfNomina = r2(irpf.import / base * 100); avisos.push({ codi: 'irpf-calculat', pct: valors.irpfNomina }); }
  }

  const grup = trobaGrup(linies);
  if (grup) valors.grup = grup;

  // Quadra la suma de meritacions amb el total meritat?
  const sumaMeritat = r2((sb ?? 0) + (comp ?? 0) + (noSal ?? 0) + (he ?? 0) + (prorrata ?? 0) + (pagaExtra ?? 0));
  if (totals.totalMeritat != null && sumaMeritat > 0 && !quasi(sumaMeritat, totals.totalMeritat, 0.02)) {
    avisos.push({ codi: 'meritat-no-quadra', suma: sumaMeritat, total: totals.totalMeritat });
  }
  const noTrobats = ['salariBase', 'cc', 'irpf', 'net'].filter((c) => (c === 'salariBase' ? sb == null : c === 'net' ? totals.net == null : !cotitzacio[c]));
  return { valors, detall, avisos, noTrobats, totals, cotitzacio, grup };
}

/** Tot el procés: bytes del PDF → resultat de interpretaNomina (+ línies llegides). */
export async function llegeixNominaPdf(bytes, contrasenya) {
  const { items, pagines } = await textDelPdf(bytes, contrasenya);
  if (items.length < 5) throw new ErrorPdf('sense-text');
  const linies = agrupaLinies(items);
  return { ...interpretaNomina(linies), linies: linies.map((l) => l.text), pagines };
}
