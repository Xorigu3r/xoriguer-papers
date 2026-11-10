// Lectura de fotos i PDF escanejats amb OCR (Tesseract.js), al dispositiu.
// El resultat són trossos de text amb posició, en «punts» d'una pàgina A4 (595 d'amplada),
// igual que els que dona pdf.js: així els lectors de nòmina i factura funcionen igual.
import { carregaPdfjs, ErrorPdf } from './pdf-text.js';

const AMPLE_A4 = 595;
const base = (p) => new URL(`../vendor/tesseract/${p}`, import.meta.url).href;
let treballador = null;

async function obreTesseract(progres) {
  if (treballador) return treballador;
  const mod = await import(base('tesseract.esm.min.js'));
  const { createWorker } = mod.default ?? mod;
  progres?.({ fase: 'preparant', pct: 0 });
  treballador = await createWorker(['spa', 'cat'], 1, {
    workerPath: base('worker.min.js'),
    corePath: base('core'),
    langPath: base('lang'),
    gzip: true,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') progres?.({ fase: 'llegint', pct: Math.round((m.progress ?? 0) * 100) });
    },
  });
  return treballador;
}

// Imatge → llenç en gris d'uns 2000 px d'amplada (Tesseract hi llegeix millor)
async function preparaImatge(font) {
  const img = font instanceof HTMLCanvasElement ? font : await createImageBitmap(font, { imageOrientation: 'from-image' });
  const escala = Math.min(2.5, Math.max(0.5, 2000 / img.width));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * escala);
  c.height = Math.round(img.height * escala);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  // Fons blanc: les zones transparents (PNG, pàgines de PDF) es veurien negres
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.filter = 'grayscale(1) contrast(1.15)';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Reconeix el text d'una imatge (llenç). Retorna paraules amb posició en punts A4. */
async function paraules(canvas, progres, desplacamentY = 0) {
  const w = await obreTesseract(progres);
  const { data } = await w.recognize(canvas, {}, { blocks: true });
  const f = AMPLE_A4 / canvas.width;
  const linies = [];
  for (const b of data.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) {
    linies.push((l.words ?? []).filter((w) => w.text?.trim() && w.confidence >= 15));
  }
  // Foto torta: el pendent mitjà de les línies (Tesseract les segueix encara que estiguin girades)
  // serveix per redreçar les posicions, i així els imports de la dreta queden a la mateixa línia.
  const angle = pendent(linies);
  const [cos, sin] = [Math.cos(-angle), Math.sin(-angle)];
  const items = [];
  for (const l of linies) for (const w of l) {
    const { x0, y0, x1, y1 } = w.bbox;
    const cx = x0; const cy = (y0 + y1) / 2;
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    // y cap amunt, com al PDF; es fa servir el centre de la paraula
    items.push({ str: w.text.trim(), x: rx * f, y: desplacamentY - ry * f, w: (x1 - x0) * f, h: (y1 - y0) * f });
  }
  return items;
}

/** Angle (radians) mitjà de les línies de text: mediana dels pendents de les línies llargues. */
export function pendent(linies) {
  const pendents = [];
  for (const l of linies) {
    if (l.length < 2) continue;
    const a = l[0].bbox; const b = l.at(-1).bbox;
    const dx = (b.x0 + b.x1) / 2 - (a.x0 + a.x1) / 2;
    if (dx < 150) continue;
    pendents.push(Math.atan2((b.y0 + b.y1) / 2 - (a.y0 + a.y1) / 2, dx));
  }
  if (!pendents.length) return 0;
  pendents.sort((x, y) => x - y);
  const m = pendents[Math.floor(pendents.length / 2)];
  return Math.abs(m) < 0.2 ? m : 0; // més de ~11°: millor no tocar res
}

/** Tolerància per agrupar paraules en línies: mitja alçada de lletra típica. */
export function tolerancia(items) {
  const hs = items.map((i) => i.h).filter(Boolean).sort((a, b) => a - b);
  return hs.length ? Math.max(2, hs[Math.floor(hs.length / 2)] * 0.55) : 3;
}

export async function textDeImatge(fitxer, progres) {
  let canvas;
  try { canvas = await preparaImatge(fitxer); } catch { throw new ErrorPdf('no-imatge'); }
  const items = await paraules(canvas, progres);
  if (items.length < 5) throw new ErrorPdf('ocr-buit');
  return items;
}

/** PDF escanejat: es dibuixa cada pàgina (fins a 2) i es llegeix amb OCR. */
export async function textDePdfEscanejat(bytes, contrasenya, progres) {
  const lib = await carregaPdfjs();
  const tasca = lib.getDocument({ data: bytes, password: contrasenya || undefined, isEvalSupported: false, verbosity: 0 });
  const doc = await tasca.promise;
  const items = [];
  for (let p = 1; p <= Math.min(doc.numPages, 2); p++) {
    const pag = await doc.getPage(p);
    const vp0 = pag.getViewport({ scale: 1 });
    const vp = pag.getViewport({ scale: 2000 / vp0.width });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    // intent 'print': dibuixa d'una tirada, sense esperar animacions (si l'app passa a segon pla, no s'atura)
    await pag.render({ canvasContext: c.getContext('2d'), viewport: vp, intent: 'print' }).promise;
    items.push(...await paraules(await preparaImatge(c), progres, -(p - 1) * 10000));
  }
  await tasca.destroy();
  if (items.length < 5) throw new ErrorPdf('ocr-buit');
  return items;
}
