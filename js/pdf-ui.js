// Bloc «Tens-ho en PDF?» compartit: tria el fitxer, el llegeix al dispositiu i avisa dels errors
// (contrasenya, PDF escanejat...). Cada mòdul hi passa la seva funció de lectura.
import { t } from './i18n.js';

// L'OCR (Tesseract) és gran: només es carrega si cal llegir una foto o un PDF escanejat
const ocr = () => import('./ocr.js');

export function seccioPdf(titol, text) {
  return `
    <section class="llegir-pdf" id="llegir-pdf">
      <h2>${titol}</h2>
      <p class="petit">${text}</p>
      <div class="botons-pdf">
        <label class="boto" for="pdf-nomina">${t('Tria el PDF o la imatge')}</label>
        <input type="file" id="pdf-nomina" accept="application/pdf,.pdf,image/*" class="amagat">
        <label class="boto secundari" for="foto-doc">📷 ${t('Fes una foto')}</label>
        <input type="file" id="foto-doc" accept="image/*" capture="environment" class="amagat">
      </div>
      <p class="petit">${t('Per a la foto: el paper ben pla, amb llum i sense ombres, i que surti sencer. Llegir-la pot tardar uns segons.')}</p>
      <form id="pdf-contrasenya" class="pdf-contrasenya" hidden onsubmit="return false">
        <label for="pdf-clau">${t('Aquest PDF té contrasenya (sovint és el teu DNI). Escriu-la per obrir-lo:')}</label>
        <div class="fila-clau"><input type="password" id="pdf-clau" autocomplete="off"><button type="submit" class="boto">${t('Obre')}</button></div>
      </form>
      <div id="pdf-estat" aria-live="polite"></div>
    </section>`;
}

/**
 * Connecta el bloc. `llegeix.pdf(bytes, contrasenya)` interpreta un PDF amb text;
 * `llegeix.items(items, tolerancia)` interpreta el text que surt de l'OCR. `aplica(lectura)` rep el resultat.
 */
export function enllacaPdf(el, llegeix, aplica) {
  const input = el.querySelector('#pdf-nomina');
  const formClau = el.querySelector('#pdf-contrasenya');
  const estatEl = el.querySelector('#pdf-estat');
  let bytes = null;
  let nom = '';
  const missatge = (nivell, html) => { estatEl.innerHTML = `<div class="avis ${nivell}">${html}</div>`; };
  const progres = ({ fase, pct }) => missatge('info', fase === 'preparant'
    ? t('Preparant el lector de text (el primer cop tarda una mica més)…')
    : t('Llegint el text… {pct} %', { pct }));

  const llegeixImatge = async (f) => {
    nom = f.name || t('foto');
    missatge('info', t('Preparant el lector de text (el primer cop tarda una mica més)…'));
    try {
      const o = await ocr();
      const items = await o.textDeImatge(f, progres);
      estatEl.innerHTML = '';
      aplica({ ...llegeix.items(items, o.tolerancia(items)), nom, ocr: true });
    } catch (e) {
      if (e?.codi === 'no-imatge') missatge('alerta', t("No s'ha pogut obrir aquesta imatge. Prova-ho amb una foto en JPG o PNG."));
      else if (e?.codi === 'ocr-buit') missatge('alerta', t("No s'hi ha pogut llegir prou text. Torna-ho a provar amb més llum, el paper pla i la càmera recta, o copia les xifres al formulari."));
      else missatge('alerta', t("No s'ha pogut llegir la imatge. Copia les xifres al formulari."));
    }
  };

  const prova = async (contrasenya) => {
    missatge('info', t('Llegint el PDF…'));
    try {
      // pdf.js es queda el buffer: se li passa una còpia per poder tornar-ho a provar amb contrasenya
      const lectura = await llegeix.pdf(bytes.slice(), contrasenya).catch(async (e) => {
        if (e?.codi !== 'sense-text') throw e;
        // PDF escanejat: es llegeix amb OCR
        const o = await ocr();
        const items = await o.textDePdfEscanejat(bytes.slice(), contrasenya, progres);
        return { ...llegeix.items(items, o.tolerancia(items)), ocr: true };
      });
      formClau.hidden = true;
      estatEl.innerHTML = '';
      aplica({ ...lectura, nom });
    } catch (e) {
      const codi = e?.codi;
      if (codi === 'contrasenya' || codi === 'contrasenya-incorrecta') {
        formClau.hidden = false;
        if (codi === 'contrasenya-incorrecta') missatge('alerta', t('La contrasenya no és correcta.'));
        else estatEl.innerHTML = '';
        formClau.querySelector('input').focus();
      } else if (codi === 'ocr-buit') {
        missatge('alerta', t("No s'hi ha pogut llegir prou text. Torna-ho a provar amb més llum, el paper pla i la càmera recta, o copia les xifres al formulari."));
      } else {
        missatge('alerta', t("No s'ha pogut obrir el fitxer. Comprova que sigui un PDF."));
      }
    }
  };

  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (f.size > 25e6) { missatge('alerta', t('El fitxer és massa gran (més de 25 MB).')); return; }
    if (f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(f.name)) { llegeixImatge(f); return; }
    nom = f.name;
    bytes = new Uint8Array(await f.arrayBuffer());
    formClau.hidden = true;
    formClau.querySelector('input').value = '';
    prova();
  });
  formClau.addEventListener('submit', () => prova(formClau.querySelector('input').value));
  const foto = el.querySelector('#foto-doc');
  foto.addEventListener('change', () => {
    const f = foto.files?.[0];
    foto.value = '';
    if (f) llegeixImatge(f);
  });
}

