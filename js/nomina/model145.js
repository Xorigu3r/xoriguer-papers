// Secció del formulari amb les dades del model 145 (comunicació de dades al pagador).

const DISC_OPCIONS = [
  ['cap', 'Sense discapacitat'],
  ['33a65', 'Entre el 33 % i el 65 %'],
  ['65', '65 % o més'],
];
const selectDisc = (valor, attrs) => `<select ${attrs}>${DISC_OPCIONS.map(([v, t]) => `<option value="${v}" ${valor === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
const chk = (on) => (on ? 'checked' : '');
const val = (v) => (v == null ? '' : v);

const SITUACIONS = [
  ['1', 'Situació 1', 'Solter/a, vidu/a, divorciat/da o separat/da legalment, amb fills menors de 18 anys (o incapacitats) que viuen només amb tu.'],
  ['2', 'Situació 2', 'Casat/da i no separat/da, i el teu cònjuge no té rendes anuals superiors a 1.500 € (sense comptar les exemptes).'],
  ['3', 'Situació 3', 'Qualsevol altre cas: solter/a sense fills, casat/da amb cònjuge que guanya més de 1.500 €, o no ho vols comunicar.'],
];

function filaDescendent(d, i) {
  return `
    <div class="fila-llista" data-fila>
      <div class="fila-cap"><strong>Fill/a ${i + 1}</strong><button type="button" class="enllac" data-treu="descendents" data-i="${i}">Treure</button></div>
      <div class="graella">
        <div class="camp"><label for="d-any-${i}">Any de naixement</label><input id="d-any-${i}" data-camp="anyNaixement" type="number" inputmode="numeric" min="1900" max="2100" value="${val(d.anyNaixement)}"></div>
        <div class="camp"><label for="d-adop-${i}">Any d'adopció o acolliment</label><input id="d-adop-${i}" data-camp="anyAdopcio" type="number" inputmode="numeric" placeholder="si escau" value="${val(d.anyAdopcio)}"></div>
        <div class="camp"><label for="d-disc-${i}">Discapacitat</label>${selectDisc(d.discapacitat, `id="d-disc-${i}" data-camp="discapacitat"`)}</div>
      </div>
      <label class="casella"><input type="checkbox" data-camp="mobilitatReduida" ${chk(d.mobilitatReduida)}> Mobilitat reduïda o necessita ajuda de terceres persones</label>
      <label class="casella"><input type="checkbox" data-camp="perEnter" ${chk(d.perEnter)}> Viu només amb mi (computa per enter)</label>
    </div>`;
}

function filaAscendent(a, i) {
  return `
    <div class="fila-llista" data-fila>
      <div class="fila-cap"><strong>Ascendent ${i + 1}</strong><button type="button" class="enllac" data-treu="ascendents" data-i="${i}">Treure</button></div>
      <div class="graella">
        <div class="camp"><label for="a-any-${i}">Any de naixement</label><input id="a-any-${i}" data-camp="anyNaixement" type="number" inputmode="numeric" min="1900" max="2100" value="${val(a.anyNaixement)}"></div>
        <div class="camp"><label for="a-conv-${i}">Quants descendents hi conviuen (tu inclòs)</label><input id="a-conv-${i}" data-camp="convivencia" type="number" inputmode="numeric" min="1" step="1" value="${val(a.convivencia) || 1}"></div>
        <div class="camp"><label for="a-disc-${i}">Discapacitat</label>${selectDisc(a.discapacitat, `id="a-disc-${i}" data-camp="discapacitat"`)}</div>
      </div>
      <label class="casella"><input type="checkbox" data-camp="mobilitatReduida" ${chk(a.mobilitatReduida)}> Mobilitat reduïda o necessita ajuda de terceres persones</label>
    </div>`;
}

export function seccioModel145(estat) {
  return `
    <fieldset class="model145">
      <legend>Situació personal i familiar (model 145)</legend>
      <p class="petit">Són les dades que comuniques a l'empresa amb el <strong>model 145</strong> perquè calculi la retenció d'IRPF. Si no l'has omplert mai, l'empresa et pot estar aplicant la situació general sense fills.</p>

      <div class="camp">
        <label for="f-anyNaixement">Any de naixement</label>
        <div class="entrada"><input id="f-anyNaixement" name="anyNaixement" type="number" inputmode="numeric" min="1900" max="2100" placeholder="p. ex. 1985" value="${val(estat.anyNaixement)}"></div>
      </div>

      <div class="camp" role="radiogroup" aria-labelledby="sit-tit">
        <span class="etiqueta-camp" id="sit-tit">Situació familiar</span>
        ${SITUACIONS.map(([v, t, desc]) => `
          <label class="opcio"><input type="radio" name="situacioFamiliar" value="${v}" ${String(estat.situacioFamiliar) === v ? 'checked' : ''}><span><strong>${t}</strong><br><span class="petit">${desc}</span></span></label>`).join('')}
      </div>

      <div class="camp">
        <label for="f-discapacitat">La teva discapacitat</label>
        ${selectDisc(estat.discapacitat, 'id="f-discapacitat" name="discapacitat"')}
      </div>
      <label class="casella"><input type="checkbox" name="mobilitatReduida" ${chk(estat.mobilitatReduida)}> Tinc mobilitat reduïda o necessito ajuda de terceres persones</label>
      <label class="casella"><input type="checkbox" name="mobilitatGeografica" ${chk(estat.mobilitatGeografica)}> Estava a l'atur i he canviat de municipi de residència per aquesta feina (mobilitat geogràfica)</label>

      <h3>Fills i altres descendents</h3>
      <p class="petit">Menors de 25 anys (o de qualsevol edat amb discapacitat) que viuen amb tu i no tenen rendes superiors a 8.000 € l'any.</p>
      <div data-llista="descendents">${(estat.descendents ?? []).map(filaDescendent).join('')}</div>
      <button type="button" class="boto secundari petit-boto" data-afegeix="descendents">+ Afegir fill/a</button>

      <h3>Pares o avis a càrrec</h3>
      <p class="petit">De 65 anys o més (o amb discapacitat) que conviuen amb tu almenys mig any i no tenen rendes superiors a 8.000 €.</p>
      <div data-llista="ascendents">${(estat.ascendents ?? []).map(filaAscendent).join('')}</div>
      <button type="button" class="boto secundari petit-boto" data-afegeix="ascendents">+ Afegir ascendent</button>

      <h3>Pagaments i préstecs</h3>
      <div class="camp">
        <label for="f-pensioCompensatoria">Pensió compensatòria al cònjuge (per sentència)</label>
        <div class="entrada"><input id="f-pensioCompensatoria" name="pensioCompensatoria" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" value="${val(estat.pensioCompensatoria)}"><span class="sufix">€/any</span></div>
      </div>
      <div class="camp">
        <label for="f-anualitatsAliments">Pensió d'aliments als fills (per sentència)</label>
        <div class="entrada"><input id="f-anualitatsAliments" name="anualitatsAliments" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" value="${val(estat.anualitatsAliments)}"><span class="sufix">€/any</span></div>
      </div>
      <label class="casella"><input type="checkbox" name="prestecHabitatge" ${chk(estat.prestecHabitatge)}> Pago una hipoteca de l'habitatge habitual comprat abans del 2013 amb dret a deducció</label>
    </fieldset>`;
}

/** Llegeix les llistes de descendents i ascendents del DOM. */
export function llegeixLlistes145(form) {
  const res = {};
  for (const llista of form.querySelectorAll('[data-llista]')) {
    res[llista.dataset.llista] = [...llista.querySelectorAll('[data-fila]')].map((fila) => {
      const o = {};
      for (const inp of fila.querySelectorAll('[data-camp]')) o[inp.dataset.camp] = inp.type === 'checkbox' ? inp.checked : inp.value;
      return o;
    });
  }
  return res;
}

/** Botons d'afegir i treure files. */
export function enllacaModel145(form, actualitza) {
  form.addEventListener('click', (ev) => {
    const afegeix = ev.target.closest('[data-afegeix]');
    const treu = ev.target.closest('[data-treu]');
    if (!afegeix && !treu) return;
    const nom = (afegeix ?? treu).dataset.afegeix ?? treu.dataset.treu;
    const llista = form.querySelector(`[data-llista="${nom}"]`);
    const files = llegeixLlistes145(form)[nom];
    if (afegeix) files.push(nom === 'descendents' ? { discapacitat: 'cap' } : { discapacitat: 'cap', convivencia: 1 });
    else files.splice(Number(treu.dataset.i), 1);
    const pinta = nom === 'descendents' ? filaDescendent : filaAscendent;
    llista.innerHTML = files.map(pinta).join('');
    if (afegeix) llista.querySelector('[data-fila]:last-child input')?.focus();
    actualitza();
  });
}
