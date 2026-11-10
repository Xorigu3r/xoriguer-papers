// Bloc «Tens la nòmina en PDF?» de la pantalla Comprovar nòmina: tria el fitxer, el llegeix
// al dispositiu i mostra què s'ha trobat perquè es revisi abans de fiar-se del càlcul.
import { llegeixNominaPdf } from './llegeix-pdf.js';
import { fmt } from './calc.js';
import { t } from '../i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pc = (n) => `${String(n).replace('.', ',')} %`;

// Camps de diners que omple el PDF: abans d'aplicar una lectura es buiden, perquè no quedin xifres d'una altra nòmina
export const CAMPS_PDF = ['salariBase', 'complementsSalarials', 'noSalarials', 'horesExtres', 'prorratejades', 'importPagaExtra', 'irpfNomina', 'netNomina'];

const NOMS = () => ({
  salariBase: t('Salari base'), complement: t('Complements salarials'), noSalarials: t('Conceptes no salarials'),
  horesExtres: t('Hores extres'), prorrata: t('Prorrata pagues extres'), cc: t('Contingències comunes'),
  atur: t('Desocupació'), fp: t('Formació professional'), mei: 'MEI', heSS: t('Hores extres'), irpf: 'IRPF',
  totalMeritat: t('Total meritat'), totalDeduir: t('Total a deduir'), net: t('Líquid a percebre'),
  baseIRPF: t("Base subjecta a retenció de l'IRPF"),
});

export function seccioPdf() {
  return `
    <section class="llegir-pdf" id="llegir-pdf">
      <h2>${t('Tens la nòmina en PDF?')}</h2>
      <p class="petit">${t("Tria el fitxer i l'app n'omplirà les xifres. El PDF es llegeix al teu dispositiu: no s'envia enlloc.")}</p>
      <label class="boto" for="pdf-nomina">${t('Tria el PDF')}</label>
      <input type="file" id="pdf-nomina" accept="application/pdf,.pdf" class="amagat">
      <form id="pdf-contrasenya" class="pdf-contrasenya" hidden onsubmit="return false">
        <label for="pdf-clau">${t('Aquest PDF té contrasenya (sovint és el teu DNI). Escriu-la per obrir-lo:')}</label>
        <div class="fila-clau"><input type="password" id="pdf-clau" autocomplete="off"><button type="submit" class="boto">${t('Obre')}</button></div>
      </form>
      <div id="pdf-estat" aria-live="polite"></div>
    </section>`;
}

/** Connecta el bloc. `aplica(lectura)` rep el resultat quan s'ha pogut llegir. */
export function enllacaPdf(el, aplica) {
  const input = el.querySelector('#pdf-nomina');
  const formClau = el.querySelector('#pdf-contrasenya');
  const estatEl = el.querySelector('#pdf-estat');
  let bytes = null;
  let nom = '';
  const missatge = (nivell, html) => { estatEl.innerHTML = `<div class="avis ${nivell}">${html}</div>`; };

  const llegeix = async (contrasenya) => {
    missatge('info', t('Llegint la nòmina…'));
    try {
      // pdf.js es queda el buffer: se li passa una còpia per poder tornar-ho a provar amb contrasenya
      const lectura = await llegeixNominaPdf(bytes.slice(), contrasenya);
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
    if (f.size > 15e6) { missatge('alerta', t('El fitxer és massa gran per ser una nòmina (més de 15 MB).')); return; }
    nom = f.name;
    bytes = new Uint8Array(await f.arrayBuffer());
    formClau.hidden = true;
    formClau.querySelector('input').value = '';
    llegeix();
  });
  formClau.addEventListener('submit', () => llegeix(formClau.querySelector('input').value));
}

/** Resum del que s'ha llegit, amb comprovacions dels percentatges oficials. */
export function resumLectura(l, dades) {
  const noms = NOMS();
  const ct = dades.cotitzacioTreballador;
  const files = l.detall.map((d) => `
    <tr><td>${noms[d.clau] ?? d.clau}<span class="detall">«${esc(d.etiqueta)}»</span></td>
      <td class="num">${d.pct != null ? `${pc(d.pct)} · ` : ''}${fmt(d.import)}</td></tr>`).join('');

  const avisos = [];
  for (const a of l.avisos) {
    if (a.codi === 'paga-extra') avisos.push(['alerta', t("Aquesta nòmina inclou una paga extra ({import}). El comprovador és per a mesos normals: la paga extra no s'ha sumat al sou.", { import: fmt(a.import) })]);
    if (a.codi === 'meritat-no-quadra') avisos.push(['alerta', t('Els conceptes trobats sumen {suma}, però el total meritat de la nòmina és {total}: potser falta algun concepte o n\'hi ha un de més. Revisa el formulari.', { suma: fmt(a.suma), total: fmt(a.total) })]);
    if (a.codi === 'irpf-calculat') avisos.push(['info', t("La nòmina no diu el percentatge d'IRPF; l'he calculat amb l'import i la base: {pct}.", { pct: pc(a.pct) })]);
  }
  // Percentatges de cotització de la nòmina comparats amb els oficials de l'any
  const contracte = l.valors.contracte ?? 'indefinit';
  const oficials = { cc: ct.contingenciesComunes, atur: contracte === 'temporal' ? ct.aturTemporal : ct.aturIndefinit, fp: ct.formacioProfessional, mei: ct.mei };
  for (const [clau, oficial] of Object.entries(oficials)) {
    const c = l.cotitzacio[clau];
    if (c?.pct != null && Math.abs(c.pct - oficial) > 0.001) {
      avisos.push(['alerta', t('La nòmina aplica un {pct} de {concepte}, però el {any} és un {oficial}. Si la nòmina no és d\'aquest any, és normal.', { pct: pc(c.pct), concepte: noms[clau], any: dades.any, oficial: pc(oficial) })]);
    }
  }
  if (!l.cotitzacio.mei && l.cotitzacio.cc) avisos.push(['info', t("No he trobat la línia del MEI. Des del 2023 totes les nòmines l'han de tenir; potser va sumada a contingències comunes o té un altre nom.")]);
  const noTrobats = l.noTrobats.map((c) => noms[c] ?? c);
  if (noTrobats.length) avisos.push(['alerta', t("No he trobat: {llista}. Omple-ho a mà al formulari.", { llista: noTrobats.join(', ') })]);
  if (!l.valors.grup) avisos.push(['info', t('No he trobat el grup de cotització: comprova-ho al formulari.')]);

  return `
    <section class="lectura-pdf">
      <h2>${t('He llegit «{nom}»', { nom: esc(l.nom) })}</h2>
      <p class="petit">${t("He omplert el formulari amb aquestes xifres. Revisa que siguin les de la teva nòmina: cada empresa fa la nòmina d'una manera i em puc equivocar.")}</p>
      <table class="taula compacta"><tbody>${files}</tbody></table>
      ${avisos.map(([n, text]) => `<div class="avis ${n}">${text}</div>`).join('')}
      <p class="petit">${t("El PDF no diu la teva situació familiar (model 145) ni sempre la jornada: si el percentatge d'IRPF surt a la nòmina, el càlcul ja el fa servir.")}</p>
      <details class="ajuda"><summary>${t('Què he llegit del PDF')}</summary><pre class="text-pdf">${esc(l.linies.join('\n'))}</pre></details>
      <button type="button" class="boto secundari" id="treu-lectura">${t('Treure les dades llegides')}</button>
    </section>`;
}
