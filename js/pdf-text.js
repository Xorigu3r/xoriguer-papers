// Lectura de PDF compartida (nòmina, factura de llum...): pdf.js al dispositiu, sense enviar res.
// pdf.js es carrega només quan cal (és gran) i des de la còpia local de vendor/.
// ---------- Lectura del PDF ----------
let pdfjs = null;
async function carregaPdfjs() {
  if (!pdfjs) {
    const url = new URL('../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
    pdfjs = await import(url);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
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
  const pagines = Math.min(doc.numPages, 6); // una nòmina o una factura no en tenen més; evita PDF enormes
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
export function xDe(linia, idx) {
  for (let i = linia.trossos.length - 1; i >= 0; i--) {
    const t = linia.trossos[i];
    if (idx >= t.ini) return t.x + (t.len ? Math.min(1, (idx - t.ini) / t.len) * t.w : 0);
  }
  return 0;
}

// Minúscules i sense accents, amb la mateixa llargada (per conservar les posicions)
export const pla = (s) => [...s].map((c) => (c.normalize('NFD')[0] ?? c).toLowerCase()).join('');
