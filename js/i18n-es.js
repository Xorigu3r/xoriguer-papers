// Traducció al castellà. Clau = text original en català (tal com surt a t('…') del codi).
// Si afegeixes un text nou amb t(), afegeix-lo aquí: `npm test` avisa si en falta algun.

export const ES = {
  // App i marc
  "No s'han pogut carregar les dades": 'No se han podido cargar los datos',
  "Dades de {any} (revisades el {data}).": 'Datos de {any} (revisados el {data}).',
  "Encara fem servir les xifres de {any}. Les de {actual} (cotització, SMI, IRPF) s'actualitzaran quan es publiquin al BOE; mentrestant, els càlculs poden variar una mica.":
    'Todavía usamos las cifras de {any}. Las de {actual} (cotización, SMI, IRPF) se actualizarán cuando se publiquen en el BOE; mientras tanto, los cálculos pueden variar un poco.',
  "Obre l'app des d'un servidor (no amb file://).": 'Abre la app desde un servidor (no con file://).',
  "Instal·lar": 'Instalar',
  "Seccions": 'Secciones',
  "Inici": 'Inicio',
  "Comprovar nòmina": 'Comprobar nómina',
  "Simular": 'Simular',
  "🔒 Tot es calcula al teu dispositiu. No s'envia cap dada a cap servidor.": '🔒 Todo se calcula en tu dispositivo. No se envía ningún dato a ningún servidor.',
  "Resultats orientatius. Si tens dubtes, consulta la gestoria o un sindicat.": 'Resultados orientativos. Si tienes dudas, consulta con la gestoría o un sindicato.',

  // Línies de cotització i passos de l'IRPF
  "Contingències comunes": 'Contingencias comunes',
  "Atur (desocupació)": 'Desempleo',
  "Formació professional": 'Formación profesional',
  "MEI (equitat intergeneracional)": 'MEI (equidad intergeneracional)',
  "Hores extres": 'Horas extra',
  "Cotització de solidaritat": 'Cotización de solidaridad',
  "Retribucions anuals": 'Retribuciones anuales',
  "Cotitzacions a la Seguretat Social": 'Cotizaciones a la Seguridad Social',
  "Altres despeses deduïbles": 'Otros gastos deducibles',
  "Reducció per rendiments del treball": 'Reducción por rendimientos del trabajo',
  "Reducció per més de dos descendents": 'Reducción por más de dos descendientes',
  "Pensió compensatòria al cònjuge": 'Pensión compensatoria al cónyuge',

  // Avisos
  "El líquid de la teva nòmina quadra amb el càlcul (diferència de {dif}).": 'El líquido de tu nómina cuadra con el cálculo (diferencia de {dif}).',
  "El líquid de la nòmina ({nomina}) i el calculat ({calc}) es diferencien en {dif}. Pot ser per conceptes que no has introduït (embargaments, bestretes, espècie, quota sindical...), per un mes de paga extra o per un error. Revisa-ho línia a línia.":
    'El líquido de la nómina ({nomina}) y el calculado ({calc}) se diferencian en {dif}. Puede deberse a conceptos que no has introducido (embargos, anticipos, especie, cuota sindical...), a un mes de paga extra o a un error. Revísalo línea a línea.',
  "El teu IRPF ({teu}) sembla baix respecte al que surt amb el teu model 145 ({est}). Potser et tocarà pagar a la declaració de la renda. Comprova que l'empresa té el model 145 actualitzat.":
    'Tu IRPF ({teu}) parece bajo respecto al que sale con tu modelo 145 ({est}). Quizá te toque pagar en la declaración de la renta. Comprueba que la empresa tiene el modelo 145 actualizado.',
  "El teu IRPF ({teu}) és més alt que el que surt amb el teu model 145 ({est}). Si no hi ha cap motiu (has demanat més retenció, tens altres ingressos, l'empresa no té el 145 al dia...), probablement et tornaran diners a la renda.":
    'Tu IRPF ({teu}) es más alto que el que sale con tu modelo 145 ({est}). Si no hay ningún motivo (has pedido más retención, tienes otros ingresos, la empresa no tiene el 145 al día...), probablemente te devolverán dinero en la renta.',
  "El teu IRPF ({teu}) és coherent amb el que surt amb el teu model 145 ({est}).": 'Tu IRPF ({teu}) es coherente con el que sale con tu modelo 145 ({est}).',
  "La situació familiar 1 exigeix tenir almenys un fill que doni dret a mínim. S'ha calculat com a situació 3.":
    'La situación familiar 1 exige tener al menos un hijo que dé derecho a mínimo. Se ha calculado como situación 3.',
  "Contracte de menys d'un any: la retenció mínima és del 2 %.": 'Contrato de menos de un año: la retención mínima es del 2 %.',
  "Amb un brut anual de {brut} estàs per sota del límit de retenció per a la teva situació ({llindar}): no t'han de retenir IRPF, excepte el 2 % mínim dels contractes de menys d'un any.":
    'Con un bruto anual de {brut} estás por debajo del límite de retención para tu situación ({llindar}): no te tienen que retener IRPF, salvo el 2 % mínimo de los contratos de menos de un año.',
  "Amb un brut anual de {brut} estàs per sota del límit de retenció per a la teva situació ({llindar}): no t'han de retenir IRPF.":
    'Con un bruto anual de {brut} estás por debajo del límite de retención para tu situación ({llindar}): no te tienen que retener IRPF.',
  "Per la hipoteca d'abans del 2013, la retenció es redueix {import} l'any.": 'Por la hipoteca anterior a 2013, la retención se reduce {import} al año.',
  "El brut anual ({brut}) és inferior al salari mínim proporcional a la teva jornada ({smi}). Consulta-ho amb un sindicat o la gestoria.":
    'El bruto anual ({brut}) es inferior al salario mínimo proporcional a tu jornada ({smi}). Consúltalo con un sindicato o la gestoría.',
  "El brut anual ({brut}) és inferior al salari mínim ({smi}). Consulta-ho amb un sindicat o la gestoria.":
    'El bruto anual ({brut}) es inferior al salario mínimo ({smi}). Consúltalo con un sindicato o la gestoría.',
  "Cobres per sobre de la base màxima: cotitzes per la base màxima i, per la resta, la cotització de solidaritat.":
    'Cobras por encima de la base máxima: cotizas por la base máxima y, por el resto, la cotización de solidaridad.',
  "La teva remuneració és inferior a la base mínima del teu grup; es cotitza per la mínima.": 'Tu remuneración es inferior a la base mínima de tu grupo; se cotiza por la mínima.',

  // Model 145
  "Sense discapacitat": 'Sin discapacidad',
  "Entre el 33 % i el 65 %": 'Entre el 33 % y el 65 %',
  "65 % o més": '65 % o más',
  "Situació 1": 'Situación 1',
  "Solter/a, vidu/a, divorciat/da o separat/da legalment, amb fills menors de 18 anys (o incapacitats) que viuen només amb tu.":
    'Soltero/a, viudo/a, divorciado/a o separado/a legalmente, con hijos menores de 18 años (o incapacitados) que viven solo contigo.',
  "Situació 2": 'Situación 2',
  "Casat/da i no separat/da, i el teu cònjuge no té rendes anuals superiors a 1.500 € (sense comptar les exemptes).":
    'Casado/a y no separado/a, y tu cónyuge no tiene rentas anuales superiores a 1.500 € (sin contar las exentas).',
  "Situació 3": 'Situación 3',
  "Qualsevol altre cas: solter/a sense fills, casat/da amb cònjuge que guanya més de 1.500 €, o no ho vols comunicar.":
    'Cualquier otro caso: soltero/a sin hijos, casado/a con cónyuge que gana más de 1.500 €, o no lo quieres comunicar.',
  "Fill/a": 'Hijo/a',
  "Treure": 'Quitar',
  "Any de naixement": 'Año de nacimiento',
  "Any d'adopció o acolliment": 'Año de adopción o acogida',
  "si escau": 'si procede',
  "Discapacitat": 'Discapacidad',
  "Mobilitat reduïda o necessita ajuda de terceres persones": 'Movilidad reducida o necesita ayuda de terceras personas',
  "Viu només amb mi (computa per enter)": 'Vive solo conmigo (computa por entero)',
  "Ascendent": 'Ascendiente',
  "Quants descendents hi conviuen (tu inclòs)": 'Cuántos descendientes conviven con él/ella (tú incluido)',
  "Situació personal i familiar (model 145)": 'Situación personal y familiar (modelo 145)',
  "Són les dades que comuniques a l'empresa amb el <strong>model 145</strong> perquè calculi la retenció d'IRPF. Si no l'has omplert mai, l'empresa et pot estar aplicant la situació general sense fills.":
    'Son los datos que comunicas a la empresa con el <strong>modelo 145</strong> para que calcule la retención de IRPF. Si no lo has rellenado nunca, la empresa te puede estar aplicando la situación general sin hijos.',
  "p. ex. 1985": 'p. ej. 1985',
  "Situació familiar": 'Situación familiar',
  "La teva discapacitat": 'Tu discapacidad',
  "Tinc mobilitat reduïda o necessito ajuda de terceres persones": 'Tengo movilidad reducida o necesito ayuda de terceras personas',
  "Estava a l'atur i he canviat de municipi de residència per aquesta feina (mobilitat geogràfica)":
    'Estaba en el paro y he cambiado de municipio de residencia por este trabajo (movilidad geográfica)',
  "Fills i altres descendents": 'Hijos y otros descendientes',
  "Menors de 25 anys (o de qualsevol edat amb discapacitat) que viuen amb tu i no tenen rendes superiors a 8.000 € l'any.":
    'Menores de 25 años (o de cualquier edad con discapacidad) que viven contigo y no tienen rentas superiores a 8.000 € al año.',
  "+ Afegir fill/a": '+ Añadir hijo/a',
  "Pares o avis a càrrec": 'Padres o abuelos a cargo',
  "De 65 anys o més (o amb discapacitat) que conviuen amb tu almenys mig any i no tenen rendes superiors a 8.000 €.":
    'De 65 años o más (o con discapacidad) que conviven contigo al menos medio año y no tienen rentas superiores a 8.000 €.',
  "+ Afegir ascendent": '+ Añadir ascendiente',
  "Pagaments i préstecs": 'Pagos y préstamos',
  "Pensió compensatòria al cònjuge (per sentència)": 'Pensión compensatoria al cónyuge (por sentencia)',
  "€/any": '€/año',
  "Pensió d'aliments als fills (per sentència)": 'Pensión de alimentos a los hijos (por sentencia)',
  "Pago una hipoteca de l'habitatge habitual comprat abans del 2013 amb dret a deducció":
    'Pago una hipoteca de la vivienda habitual comprada antes de 2013 con derecho a deducción',

  // Inici
  "Entén els teus <span>papers</span>": 'Entiende tus <span>papeles</span>',
  "Explicacions en llenguatge planer dels documents de casa. Sense registre i sense enviar res enlloc: tot es calcula al teu dispositiu.":
    'Explicaciones en lenguaje sencillo de los documentos de casa. Sin registro y sin enviar nada a ningún sitio: todo se calcula en tu dispositivo.',
  "Nòmina": 'Nómina',
  "Comprova si els càlculs quadren i entén cada línia: cotitzacions, IRPF, pagues extres.": 'Comprueba si los cálculos cuadran y entiende cada línea: cotizaciones, IRPF, pagas extra.',
  "Simulador": 'Simulador',
  "Si em pugen 100 €, quant cobro net? I amb reducció de jornada? I amb pagues prorratejades?": 'Si me suben 100 €, ¿cuánto cobro neto? ¿Y con reducción de jornada? ¿Y con pagas prorrateadas?',
  "Glossari": 'Glosario',
  "Què vol dir base de cotització, meritacions, líquid a percebre...": 'Qué significa base de cotización, devengos, líquido a percibir...',
  "Factura de llum": 'Factura de la luz',
  "Properament": 'Próximamente',
  "Potència, energia, peatges i lloguer del comptador explicats.": 'Potencia, energía, peajes y alquiler del contador explicados.',
  "Aigua, gas i IBI": 'Agua, gas e IBI',
  "Més endavant": 'Más adelante',
  "La resta de rebuts de casa.": 'El resto de recibos de casa.',

  // Formulari de la nòmina
  "Què és?": '¿Qué es?',
  "Comprovar la nòmina": 'Comprobar la nómina',
  "Copia les xifres de la teva nòmina d'un mes normal (sense paga extra). Els resultats s'actualitzen mentre escrius.":
    'Copia las cifras de tu nómina de un mes normal (sin paga extra). Los resultados se actualizan mientras escribes.',
  "Meritacions (el que guanyes)": 'Devengos (lo que ganas)',
  "Salari base": 'Salario base',
  "Complements salarials (suma)": 'Complementos salariales (suma)',
  "Conceptes no salarials (dietes, transport...)": 'Conceptos no salariales (dietas, transporte...)',
  "Les hores extres són per força major": 'Las horas extra son por fuerza mayor',
  "Pagues extres": 'Pagas extra',
  "Nombre de pagues a l'any": 'Número de pagas al año',
  "Les pagues extres estan prorratejades (les cobro cada mes)": 'Las pagas extra están prorrateadas (las cobro cada mes)',
  "Import de cada paga extra": 'Importe de cada paga extra',
  "Si no ho saps, deixa-ho en blanc i es farà servir el salari base. Mira el conveni: sovint és salari base + antiguitat.":
    'Si no lo sabes, déjalo en blanco y se usará el salario base. Mira el convenio: a menudo es salario base + antigüedad.',
  "igual al salari base": 'igual al salario base',
  "Contracte": 'Contrato',
  "Tipus de contracte": 'Tipo de contrato',
  "Indefinit": 'Indefinido',
  "Temporal": 'Temporal',
  "Contracte de durada inferior a un any": 'Contrato de duración inferior a un año',
  "Grup de cotització": 'Grupo de cotización',
  "On ho trobo?": '¿Dónde lo encuentro?',
  "Surt a la capçalera de la nòmina com a «grup de cotització» o «grup tarifa». Només afecta la base mínima.":
    'Aparece en la cabecera de la nómina como «grupo de cotización» o «grupo de tarifa». Solo afecta a la base mínima.',
  "Jornada": 'Jornada',
  "100 % si treballes a jornada completa. Si fas mitja jornada, 50 %.": '100 % si trabajas a jornada completa. Si haces media jornada, 50 %.',
  "Percentatge d'IRPF de la nòmina": 'Porcentaje de IRPF de la nómina',
  "Si el deixes en blanc, es farà servir el càlcul amb el teu model 145.": 'Si lo dejas en blanco, se usará el cálculo con tu modelo 145.',
  "calcular": 'calcular',
  "Per comprovar": 'Para comprobar',
  "Líquid a percebre de la nòmina": 'Líquido a percibir de la nómina',
  "opcional": 'opcional',
  "Recordar aquestes dades en aquest dispositiu": 'Recordar estos datos en este dispositivo',
  "Esborrar dades": 'Borrar datos',

  // Resultat
  "Introdueix almenys el <strong>salari base</strong> per veure el càlcul.": 'Introduce al menos el <strong>salario base</strong> para ver el cálculo.',
  "Exemple:": 'Ejemplo:',
  "carrega una nòmina d'exemple": 'carga una nómina de ejemplo',
  "Net": 'Neto',
  "veure detall": 'ver detalle',
  "{pct} de {base}": '{pct} de {base}',
  "sobre {base} d'excés": 'sobre {base} de exceso',
  "Líquid a percebre calculat": 'Líquido a percibir calculado',
  "Net anual aproximat": 'Neto anual aproximado',
  "Brut anual": 'Bruto anual',
  "Línia a línia": 'Línea a línea',
  "Meritacions": 'Devengos',
  "Complements salarials": 'Complementos salariales',
  "Prorrata pagues extres": 'Prorrata pagas extra',
  "Conceptes no salarials": 'Conceptos no salariales',
  "Total meritat": 'Total devengado',
  "Deduccions": 'Deducciones',
  "Total Seguretat Social": 'Total Seguridad Social',
  "(estimat)": '(estimado)',
  "(de la teva nòmina)": '(de tu nómina)',
  "Total deduccions": 'Total deducciones',
  "Líquid a percebre": 'Líquido a percibir',
  "Bases de cotització": 'Bases de cotización',
  "Prorrata de pagues extres": 'Prorrata de pagas extra',
  "Base contingències comunes": 'Base contingencias comunes',
  "Base contingències professionals": 'Base contingencias profesionales',
  "El mes de paga extra": 'El mes de paga extra',
  "A més de la nòmina normal, cobraràs {n} pagues de {brut} bruts. No cotitzen a part (ja s'ha fet cada mes amb la prorrata); només se'n descompta l'IRPF (−{irpf}), així que en cobraràs uns <strong>{net}</strong> nets cadascuna.":
    'Además de la nómina normal, cobrarás {n} pagas de {brut} brutos. No cotizan aparte (ya se ha hecho cada mes con la prorrata); solo se descuenta el IRPF (−{irpf}), así que cobrarás unos <strong>{net}</strong> netos cada una.',

  // Detall de l'IRPF
  "situació 1 (monoparental)": 'situación 1 (monoparental)',
  "situació 2 (cònjuge amb rendes ≤ 1.500 €)": 'situación 2 (cónyuge con rentas ≤ 1.500 €)',
  "situació 3 (altres casos)": 'situación 3 (otros casos)',
  "Com es calcula el teu IRPF? (algoritme de l'AEAT)": '¿Cómo se calcula tu IRPF? (algoritmo de la AEAT)',
  "Base per calcular la retenció": 'Base para calcular la retención',
  "Mínim personal i familiar": 'Mínimo personal y familiar',
  "tu": 'tú',
  "fills": 'hijos',
  "ascendents": 'ascendientes',
  "discapacitat": 'discapacidad',
  "Quota anual (escala sobre la base − escala sobre el mínim)": 'Cuota anual (escala sobre la base − escala sobre el mínimo)',
  "limitada al 43 % de l'excés sobre el límit excloent": 'limitada al 43 % del exceso sobre el límite excluyente',
  "Minoració per hipoteca anterior a 2013": 'Minoración por hipoteca anterior a 2013',
  "Tipus de retenció": 'Tipo de retención',
  "Calculat com a {sit}, {d} descendent(s) i {a} ascendent(s). Límit per sota del qual no hi ha retenció: {llindar}.":
    'Calculado como {sit}, {d} descendiente(s) y {a} ascendiente(s). Límite por debajo del cual no hay retención: {llindar}.',
  "No inclou regularitzacions de mig any, altres pagadors, rendiments irregulars, Ceuta/Melilla/La Palma ni pensionistes o desocupats. El resultat final el dona la declaració de la renda.":
    'No incluye regularizaciones a mitad de año, otros pagadores, rendimientos irregulares, Ceuta/Melilla/La Palma ni pensionistas o desempleados. El resultado final lo da la declaración de la renta.',

  // Simulador
  "Simular situacions": 'Simular situaciones',
  "Partim de les dades de la teva nòmina. Mou els controls per veure què canviaria.": 'Partimos de los datos de tu nómina. Mueve los controles para ver qué cambiaría.',
  'Primer omple la teva nòmina a <a href="#/nomina">Comprovar nòmina</a>. Mentrestant, fem servir un exemple de 1.800 € bruts en 14 pagues.':
    'Primero rellena tu nómina en <a href="#/nomina">Comprobar nómina</a>. Mientras tanto, usamos un ejemplo de 1.800 € brutos en 14 pagas.',
  "Si em pugen 100 € bruts": 'Si me suben 100 € brutos',
  "Reducció de jornada al 80 %": 'Reducción de jornada al 80 %',
  "Pagues prorratejades o no": 'Pagas prorrateadas o no',
  "Tornar a l'inici": 'Volver al inicio',
  "Canvis": 'Cambios',
  "Augment de sou brut mensual": 'Aumento de sueldo bruto mensual',
  "Pagues extres prorratejades": 'Pagas extra prorrateadas',
  "De cada euro brut que puja, te'n queden uns <strong>{c} cèntims</strong> nets cada mes.": 'De cada euro bruto que sube, te quedan unos <strong>{c} céntimos</strong> netos cada mes.',
  "Net mensual simulat": 'Neto mensual simulado',
  "al mes": 'al mes',
  "l'any": 'al año',
  "Prorratejar les pagues no canvia el que cobres a l'any: només com es reparteix. El net mensual puja, però deixes de cobrar les pagues de juny i desembre.":
    'Prorratear las pagas no cambia lo que cobras al año: solo cómo se reparte. El neto mensual sube, pero dejas de cobrar las pagas de junio y diciembre.',
  "En una reducció de jornada per cura de fills o familiars, durant uns anys la Seguretat Social et computa la cotització com si treballessis a jornada completa per a la jubilació i altres prestacions.":
    'En una reducción de jornada por cuidado de hijos o familiares, durante unos años la Seguridad Social te computa la cotización como si trabajaras a jornada completa para la jubilación y otras prestaciones.',
  "Ara": 'Ahora',
  "Simulat": 'Simulado',
  "Diferència": 'Diferencia',
  "Brut del mes": 'Bruto del mes',
  "Seguretat Social": 'Seguridad Social',
  "Net del mes": 'Neto del mes',
  "Net anual": 'Neto anual',
  "L'IRPF simulat és una estimació.": 'El IRPF simulado es una estimación.',
  "Partim del teu percentatge actual i hi sumem la variació estimada.": 'Partimos de tu porcentaje actual y le sumamos la variación estimada.',

  // Glossari
  "Cerca un terme": 'Busca un término',
  "p. ex. base, IRPF, prorrata...": 'p. ej. base, IRPF, prorrata...',

  // Grups de cotització (data/nomina-AAAA.json)
  "Enginyers i llicenciats": 'Ingenieros y licenciados',
  "Enginyers tècnics, perits i ajudants titulats": 'Ingenieros técnicos, peritos y ayudantes titulados',
  "Caps administratius i de taller": 'Jefes administrativos y de taller',
  "Ajudants no titulats": 'Ayudantes no titulados',
  "Oficials administratius": 'Oficiales administrativos',
  "Subalterns": 'Subalternos',
  "Auxiliars administratius": 'Auxiliares administrativos',
  "Oficials de primera i segona": 'Oficiales de primera y segunda',
  "Oficials de tercera i especialistes": 'Oficiales de tercera y especialistas',
  "Peons": 'Peones',
  "Menors de 18 anys": 'Menores de 18 años',
};
