# Revisió anual de les dades

L'app no llegeix el BOE directament: un **vigilant** (GitHub Actions, cada dia) avisa amb una
incidència quan surt una norma que pot canviar les xifres. Llavors una persona les revisa i les posa al JSON.

## Calendari habitual

| Quan | Què surt | Què canvia a `data/nomina-AAAA.json` |
|---|---|---|
| Gener–febrer | Reial decret de l'**SMI** | `smi` |
| Gener | **Algoritme de retencions** de l'AEAT (i versions noves si canvia la llei a mig any) | `irpf.*` |
| Gener–abril | **Ordre de cotització** (o RDL de pròrroga) | `basesCotitzacio`, `cotitzacioTreballador`, `cotitzacioSolidaritat` |
| Quan toqui | Canvis al **RIRPF** o a la Llei 35/2006 | `irpf.*` |

| Quan | Què surt | Què canvia a `data/llum-AAAA.json` |
|---|---|---|
| Desembre (secció III) | Resolució de la **CNMC** de peatges de transport i distribució | `peatges` |
| Desembre | **Ordre TED** de càrrecs del sistema elèctric | `carrecs` |
| Quan toqui | Reials decrets llei que canvien l'**IVA** o l'**impost elèctric** de la llum | `periodesFiscals` |
| Rarament | Canvis al lloguer dels comptadors | `lloguerComptador` |

Fins que surt l'ordre de cotització, molts anys es fan servir provisionalment les xifres de l'any anterior.

## Passos per a un any nou

1. Copia el fitxer de l'any anterior: `data/nomina-2027.json`, canvia `"any"` i posa l'any a `data/index.json`.
2. Revisa cada valor amb la font oficial i actualitza `"revisat"` i `"fonts"`:
   - **SMI** → Reial decret de l'any (BOE).
   - **Base màxima, bases mínimes per grup, percentatges, MEI, solidaritat** → Ordre de cotització (BOE), articles de bases i tipus.
   - **IRPF**: escala, mínims, reducció per rendiments del treball, despeses, límits excloents (taula 1), límit del 43 %,
     hipoteca → PDF «Algoritmo de cálculo» a la sede de l'AEAT (Programas de ayuda → Retenciones).
   - Per llegir el PDF: `pdftotext -layout Algoritmo.pdf -`.
3. Executa `npm test`. El validador comprova que no hi hagi errors de tecleig (p. ex. 47 en lloc de 4,7).
4. Comprova 2 o 3 casos amb el **simulador de retencions de l'AEAT** i, si cal, afegeix-los com a tests.
5. Puja `VERSIO` a `sw.js` i publica. Les apps instal·lades descarreguen les dades noves en obrir-se amb connexió.
6. Tanca la incidència del vigilant.

### Factura de llum

1. Copia `data/llum-2026.json` a `data/llum-2027.json`, canvia `"any"`, `"diesAny"` (366 si és de traspàs) i afegeix l'any a `"llum"` de `data/index.json`.
2. `peatges`: annex I de la resolució de la CNMC, taules «transporte y distribución» de la 2.0TD (potència €/kW·any, energia €/kWh).
3. `carrecs`: ordre TED de càrrecs, segment tarifari 1 (és la 2.0TD: 2 períodes de potència i 3 d'energia).
4. `periodesFiscals`: un tram per cada canvi d'IVA o impost elèctric durant l'any, sense forats (el validador ho comprova).
   Si una rebaixa depèn d'una condició (IPC...), no la posis fins que no consti que s'aplica.
5. `npm test` i publica.

## Vigilant

- Local: `npm run vigila` (opció `--des-de=AAAAMMDD` per revisar dies concrets, `--sense-desar` per no tocar l'estat).
- Mira la secció I del BOE (disposicions generals), els peatges de la CNMC a la secció III i la pàgina de retencions de l'AEAT.
- Desa el que ja ha vist a `scripts/estat-vigilancia.json` perquè no avisi dues vegades.
- També avisa si comença un any i no hi ha `data/nomina-AAAA.json` o `data/llum-AAAA.json`.

## Bo social (data/llum-AAAA.json → boSocial)

- **IPREM de 14 pagues** (`iprem14`): surt a la Llei de pressupostos (o es prorroga). El 2026 s'ha fet servir 8.400 € (600 €/mes), el mateix que fa servir el MITECO per als llindars.
- **Descomptes** (`descomptes`): els del 2026 (42,5 % i 57,5 %) són extraordinaris del RDL 7/2026 i s'acaben el 31/12/2026. Si no hi ha pròrroga, el 2027 tornen el 35 % i el 50 % (`descompteOrdinari`). Mira si cap reial decret llei nou els allarga.
- **Llindars i límits de kWh**: art. 3 i annex I del RD 897/2017 (BOE-A-2017-11505, text consolidat).
