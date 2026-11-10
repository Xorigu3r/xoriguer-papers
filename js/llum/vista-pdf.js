// Bloc «Tens la factura en PDF?» de la pantalla de la factura de llum i resum del que s'ha llegit.
import { llegeixFacturaPdf, facturaDeItems } from './llegeix-pdf.js';
import { seccioPdf as seccioPdfComu, enllacaPdf as enllacaPdfComu } from '../pdf-ui.js';
import { t } from '../i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const coma = (s) => String(s).replace(/(\d)\.(\d)/g, '$1,$2');

// Camps que omple el PDF: abans d'aplicar una lectura es tornen als valors per defecte
export const CAMPS_PDF = ['dataInici', 'dataFi', 'dies', 'potenciaP1', 'potenciaP2', 'preuPotenciaP1', 'preuPotenciaP2',
  'unPreu', 'preuEnergia', 'preuEnergiaP1', 'preuEnergiaP2', 'preuEnergiaP3', 'consumP1', 'consumP2', 'consumP3',
  'descompte', 'boSocialDia', 'lloguer', 'lloguerDia', 'altres', 'iva', 'impostElectric', 'totalFactura', 'maximetre'];

export const seccioPdf = () => seccioPdfComu(t('Tens la factura en PDF?'), t("Tria el fitxer i l'app n'omplirà les xifres. El PDF es llegeix al teu dispositiu: no s'envia enlloc."));
export const enllacaPdf = (el, aplica) => enllacaPdfComu(el, { pdf: llegeixFacturaPdf, items: facturaDeItems }, aplica);

const NOMS = () => ({
  periode: t('Període de facturació'), potenciaP1: t('Potència punta (P1)'), potenciaP2: t('Potència vall (P2)'),
  potenciaContractada: t('Potència contractada'), energiaP1: t('Consum punta (P1)'), energiaP2: t('Consum pla (P2)'),
  energiaP3: t('Consum vall (P3)'), energia: t('Energia consumida'), boSocial: t('Finançament del bo social'),
  lloguer: t('Lloguer del comptador'), impostElectric: t('Impost elèctric'), iva: 'IVA', maximetre: t('Maxímetre'),
  total: t('Total de la factura'), descompte: t('Descomptes'), altres: t('Altres serveis (manteniment, assegurances...)'),
});

export function resumLectura(l) {
  const noms = NOMS();
  const files = l.detall.map((d) => `
    <tr><td>${noms[d.clau] ?? d.clau}<span class="detall">«${esc(d.text)}»</span></td>
      <td class="num">${esc(coma(d.valor))}</td></tr>`).join('');
  const AVISOS = {
    tarifa: ['alerta', t("Aquesta factura sembla d'una tarifa 3.0TD o superior (negocis, més de 15 kW). L'app només calcula la 2.0TD: el resultat no serà correcte.")],
    autoconsum: ['alerta', t("La factura té autoconsum o compensació d'excedents. L'app encara no ho calcula: el total no quadrarà.")],
    pvpc: ['info', t("És una factura de PVPC (tarifa regulada): el preu de l'energia canvia cada hora. He fet servir el preu que surt a la factura.")],
    igic: ['alerta', t("La factura té IGIC (Canàries). L'app calcula amb l'IVA: posa el percentatge d'IGIC al camp de l'IVA.")],
    'consum-franges': ['info', t("La factura té un preu únic i no he trobat el consum de cada franja: l'he posat tot a punta. El total no canvia, però revisa-ho per als consells.")],
    'sense-lloguer': ['info', t("No he trobat el lloguer del comptador. Si el comptador és teu, desmarca «Pago lloguer del comptador».")],
    'dos-tipus': ['info', t("La factura té dos tipus d'IVA o d'impost elèctric (perquè agafa dos períodes): l'app els calcula per dates.")],
  };
  const avisos = l.avisos.map((a) => AVISOS[a.codi]).filter(Boolean);
  const NO = { potencia: t('la potència'), energia: t("l'energia consumida"), total: t('el total'), periode: t('el període') };
  if (l.noTrobats.length) avisos.push(['alerta', t('No he trobat: {llista}. Omple-ho a mà al formulari.', { llista: l.noTrobats.map((c) => NO[c]).join(', ') })]);

  return `
    <section class="lectura-pdf">
      <h2>${t('He llegit «{nom}»', { nom: esc(l.nom) })}</h2>
      <p class="petit">${t("He omplert el formulari amb aquestes xifres. Revisa que siguin les de la teva factura: cada comercialitzadora la fa d'una manera i em puc equivocar.")}</p>
      ${l.ocr ? `<div class="avis alerta">${t("L'he llegit d'una foto: revisa bé cada xifra, sobretot les comes i els decimals.")}</div>` : ''}
      <table class="taula compacta"><tbody>${files}</tbody></table>
      ${avisos.map(([n, text]) => `<div class="avis ${n}">${text}</div>`).join('')}
      <details class="ajuda"><summary>${t('Què he llegit del PDF')}</summary><pre class="text-pdf">${esc(l.linies.join('\n'))}</pre></details>
      <button type="button" class="boto secundari" id="treu-lectura">${t('Treure les dades llegides')}</button>
    </section>`;
}
