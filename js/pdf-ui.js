// Bloc «Tens-ho en PDF?» compartit: tria el fitxer, el llegeix al dispositiu i avisa dels errors
// (contrasenya, PDF escanejat...). Cada mòdul hi passa la seva funció de lectura.
import { t } from './i18n.js';

export function seccioPdf(titol, text) {
  return `
    <section class="llegir-pdf" id="llegir-pdf">
      <h2>${titol}</h2>
      <p class="petit">${text}</p>
      <label class="boto" for="pdf-nomina">${t('Tria el PDF')}</label>
      <input type="file" id="pdf-nomina" accept="application/pdf,.pdf" class="amagat">
      <form id="pdf-contrasenya" class="pdf-contrasenya" hidden onsubmit="return false">
        <label for="pdf-clau">${t('Aquest PDF té contrasenya (sovint és el teu DNI). Escriu-la per obrir-lo:')}</label>
        <div class="fila-clau"><input type="password" id="pdf-clau" autocomplete="off"><button type="submit" class="boto">${t('Obre')}</button></div>
      </form>
      <div id="pdf-estat" aria-live="polite"></div>
    </section>`;
}

/** Connecta el bloc. `llegeix(bytes, contrasenya)` interpreta el PDF; `aplica(lectura)` rep el resultat. */
export function enllacaPdf(el, llegeix, aplica) {
  const input = el.querySelector('#pdf-nomina');
  const formClau = el.querySelector('#pdf-contrasenya');
  const estatEl = el.querySelector('#pdf-estat');
  let bytes = null;
  let nom = '';
  const missatge = (nivell, html) => { estatEl.innerHTML = `<div class="avis ${nivell}">${html}</div>`; };

  const prova = async (contrasenya) => {
    missatge('info', t('Llegint el PDF…'));
    try {
      // pdf.js es queda el buffer: se li passa una còpia per poder tornar-ho a provar amb contrasenya
      const lectura = await llegeix(bytes.slice(), contrasenya);
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
      } else if (codi === 'sense-text') {
        missatge('alerta', t('Aquest PDF és una imatge (escanejat o fotografiat) i no té text per llegir. Aviat es podrà llegir amb la càmera; mentrestant, copia les xifres al formulari.'));
      } else {
        missatge('alerta', t("No s'ha pogut obrir el fitxer. Comprova que sigui un PDF."));
      }
    }
  };

  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (f.size > 15e6) { missatge('alerta', t('El fitxer és massa gran (més de 15 MB).')); return; }
    nom = f.name;
    bytes = new Uint8Array(await f.arrayBuffer());
    formClau.hidden = true;
    formClau.querySelector('input').value = '';
    prova();
  });
  formClau.addEventListener('submit', () => prova(formClau.querySelector('input').value));
}

