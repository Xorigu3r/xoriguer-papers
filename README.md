# Xoriguer Papers — Entén els teus papers

PWA (mòbil i ordinador) que explica els documents de casa en llenguatge planer.
Tot es calcula al dispositiu: no hi ha servidor ni s'envia cap dada.

## Mòduls

| Mòdul | Estat |
|---|---|
| Nòmina: comprovar, explicar línia a línia, simular, glossari, avisos | ✅ v0.1 (formulari o PDF) |
| Nòmina explicada: nòmina d'exemple (model oficial) amb punts clicables | ✅ v0.1 |
| Factura de llum (2.0TD): comprovar, on van els diners, potència, simular i comparar ofertes | ✅ v0.1 (formulari, sense OCR) |
| Aigua, gas, IBI | Més endavant |
| Llegir la nòmina en PDF (pdf.js, al dispositiu) | ✅ v0.1 |
| Foto / PDF escanejat (OCR amb Tesseract.js) | Següent |

Per publicar-la a GitHub: [PUBLICAR.md](PUBLICAR.md).

## Executar

Cal servir-la per HTTP (el service worker i el `fetch` del JSON no funcionen amb `file://`):

```bash
npm start
```

Obre http://localhost:8080. A Chrome/Edge d'ordinador apareix el botó **Instal·lar** (o la icona a la barra d'adreces) per tenir-la com a app d'escriptori.

## Tests

```bash
npm test
```

## Estructura

- `data/nomina-AAAA.json` — percentatges, bases, escala d'IRPF i llindars de l'any. **S'han de revisar cada any** amb el BOE (ordre de cotització, SMI, art. 81 i 85 del RIRPF).
- `js/nomina/calc.js` — motor de càlcul (funcions pures, provades amb `node --test`).
- `js/nomina/textos.js` — explicacions de cada línia i glossari (català i castellà).
- `js/i18n.js` i `js/i18n-es.js` — idiomes. Els textos s'escriuen en català amb `t('…')` i la traducció castellana va a `i18n-es.js`; `npm test` avisa si en falta alguna. L'idioma es tria amb el botó CA/ES (per defecte, el del navegador).
- `js/nomina/vistes.js` — pantalles (comprovar, simular, glossari).
- `js/nomina/llegeix-pdf.js` i `vista-pdf.js` — llegeix la nòmina en PDF al dispositiu: busca els conceptes pel nom (català i castellà), omple el formulari i mostra què ha llegit perquè es revisi. Proves: `tests/llegeix-pdf.test.js` amb els PDF de `tests/fixtures/` (es generen amb `python scripts/genera-pdf-proves.py`).
- `vendor/pdfjs/` — pdf.js 6.4.299 (build legacy, Apache-2.0), còpia local: no es carrega de cap CDN.
- `data/index.json` — anys disponibles. L'app fa servir l'any en curs o, si encara no hi és, l'últim i ho avisa.
- `js/nomina/model145.js` — formulari del model 145.
- `js/nomina/exemple.js` — nòmina explicada: exemple amb el format oficial i punts clicables; les xifres es calculen amb el motor i les dades de l'any.
- `data/llum-AAAA.json` i `js/llum/` — factura de llum: peatges i càrrecs del BOE, impostos per dates, motor de càlcul i pantalles.
- `scripts/vigila-fonts.mjs` — vigila el BOE i l'AEAT i avisa de normes noves (`npm run vigila`).
- `scripts/valida-dades.mjs` — detecta errors als JSON de dades (s'executa amb `npm test`).
- `.github/workflows/` — vigilant diari (obre una incidència a GitHub) i validació a cada canvi.
- `REVISIO-ANUAL.md` — què revisar cada any i on trobar-ho.
- `icons/` — `falco.png` és el falcó original de la família Xoriguer (fons transparent). Les icones de l'app es generen amb `python scripts/genera-icones.py` (falcó a dalt + nòmina en línia taronja).
- `sw.js` — funcionament sense connexió. Puja `VERSIO` en cada publicació.

## IRPF

Segueix l'**algoritme oficial de l'AEAT 2026** (art. 80-87 RIRPF) amb totes les dades del **model 145**:
situació familiar 1/2/3, edat, discapacitat i mobilitat reduïda, mobilitat geogràfica, descendents
(per enter o per meitat, menors de 3 anys, adopcions, discapacitat), ascendents (convivència),
pensió compensatòria, anualitats per aliments i hipoteca anterior a 2013.

No inclou: regularitzacions de mig any, diversos pagadors, rendiments irregulars, Ceuta/Melilla/La Palma,
pensionistes ni desocupats.

## Fonts (revisar cada any)

- Ordre de cotització 2026: Orden PJC/297/2026 (BOE-A-2026-7296)
- SMI 2026: Real Decreto 126/2026 (BOE-A-2026-3815)
- Algoritme de retencions AEAT 2026 (versió del 10/09/2026)
