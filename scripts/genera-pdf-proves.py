"""Genera nòmines PDF de prova (dades inventades) per als tests del lector de PDF.

    python scripts/genera-pdf-proves.py

Crea a tests/fixtures/:
  - nomina-columna.pdf      format clàssic en castellà (una columna: cuantía, concepto, importe, deducción, totales)
  - nomina-dues-columnes.pdf format en català amb meritacions i deduccions en paral·lel
  - nomina-escanejada.pdf   sense text (com un escaneig)
  - nomina-contrasenya.pdf  protegida amb la contrasenya 1234
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.pdfencrypt import StandardEncryption

DIR = Path(__file__).resolve().parent.parent / 'tests' / 'fixtures'
DIR.mkdir(parents=True, exist_ok=True)
W, H = A4


def dreta(c, x, y, text):
    c.drawRightString(x, y, text)


def columna(nom, encrypt=None):
    c = canvas.Canvas(str(DIR / nom), pagesize=A4, encrypt=encrypt)
    c.setFont('Courier-Bold', 10)
    c.rect(40, 720, 250, 90); c.rect(300, 720, 255, 90)
    c.drawString(48, 795, 'EMPRESA'); c.drawString(308, 795, 'TRABAJADOR')
    c.drawString(48, 760, 'Domicilio'); c.drawString(308, 760, 'Categoría'); c.drawString(470, 760, 'Antigüedad')
    c.drawString(48, 730, 'C.I.F.'); c.drawString(130, 730, 'Nº Inscrip. S.S.')
    c.drawString(308, 730, 'Nº Afiliación'); c.drawString(420, 730, 'G.C'); c.drawString(460, 730, 'N.I.F.')
    c.setFont('Courier', 10)
    c.drawString(422, 722, '07')
    c.setFont('Courier-Bold', 10)
    c.drawString(48, 700, 'Periodo de Liquidación'); c.drawString(300, 700, 'Total Días'); c.drawString(450, 700, 'Importe Total')
    c.setFont('Courier', 10)
    c.drawString(48, 688, 'Del 1  al 31 de AGOSTO     2018'); c.drawString(320, 688, '30'); dreta(c, 540, 688, '1.250,00')
    c.setFont('Courier-Bold', 7)
    for x, t in [(60, 'Cuantía'), (180, 'Conceptos'), (300, 'Importe'), (370, 'Deducción'), (480, 'TOTALES')]:
        c.drawString(x, 660, t)
    c.setFont('Courier', 10)
    files = [
        ('30', 'SALARIO BASE', '26,12', '', '783,74'),
        ('30', 'COMP. DEDICACION', '3,52', '', '105,70'),
        ('30', 'MEJ VOLUNTARIA', '13,29', '', '398,70'),
        ('30', 'P. NO COMPETENCIA', '3,00', '', '90,00'),
        ('30', 'P.P.Paga Extra', '4,35', '', '130,62'),
        ('4,70', 'Cont.Comunes', '', '70,91', ''),
        ('1,55', 'Desempleo', '', '23,39', ''),
        ('0,10', 'For.Profesional', '', '1,51', ''),
        ('10,80', 'I.R.P.F.', '', '162,95', ''),
    ]
    y = 640
    for q, con, imp, ded, tot in files:
        dreta(c, 95, y, q); c.drawString(120, y, con); dreta(c, 340, y, imp); dreta(c, 420, y, ded); dreta(c, 540, y, tot)
        y -= 15
    c.setFont('Courier-Bold', 10)
    c.drawString(48, 400, 'Total Devengado'); c.drawString(230, 400, 'Total Deducir'); c.drawString(380, 400, 'LÍQUIDO A PERCIBIR')
    c.setFont('Courier', 10)
    c.drawString(80, 385, '1.508,76'); c.drawString(250, 385, '258,76'); c.drawString(410, 385, '1.250,00')
    c.setFont('Courier', 6.5)
    c.drawString(48, 360, 'DETERMINACIÓN DE LAS BASES DE COTIZACIÓN A LA SEGURIDAD SOCIAL Y CONCEPTOS RECAUDACIÓN CONJUNTA Y DE LA BASE')
    c.drawString(48, 352, 'SUJETA A RETENCIÓN DEL IRPF Y APORTACIÓN DE EMPRESA')
    c.drawString(120, 344, 'CONCEPTO'); c.drawString(330, 344, 'BASE'); c.drawString(400, 344, 'TIPO'); c.drawString(450, 344, 'APORTACIÓN EMPRESA')
    c.drawString(48, 336, '1. Contingencias comunes')
    c.drawString(56, 328, 'Importe remuneración mensual'); dreta(c, 250, 328, '1.378,14')
    c.drawString(56, 320, 'Importe prorrata paga extraordinarias'); dreta(c, 250, 320, '130,62')
    c.drawString(200, 312, 'TOTAL..........'); dreta(c, 360, 312, '1.508,76'); dreta(c, 420, 312, '23,60'); dreta(c, 520, 312, '356,07')
    c.drawString(200, 304, 'AT Y EP........'); dreta(c, 420, 304, '1,70'); dreta(c, 520, 304, '25,65')
    c.drawString(48, 296, '2. Conting. profesionales   Desempleo......'); dreta(c, 360, 296, '1.508,76'); dreta(c, 420, 296, '5,50'); dreta(c, 520, 296, '82,98')
    c.drawString(160, 288, 'Formación Profesional...'); dreta(c, 420, 288, '0,60'); dreta(c, 520, 288, '9,05')
    c.drawString(160, 280, 'Fondo Garantía Salarial.'); dreta(c, 420, 280, '0,20'); dreta(c, 520, 280, '3,02')
    c.drawString(48, 272, '3. Cotización adicional horas extraordinarias.........')
    c.drawString(48, 264, '4. Base sujeta a retención de I.R.P.F.........'); dreta(c, 360, 264, '1.508,76')
    c.setFont('Courier', 11)
    c.drawString(60, 200, 'Firma y sello Empresa:'); c.drawString(320, 200, 'Recibí Trabajador:AGOSTO   2018')
    c.save()


def dues_columnes():
    c = canvas.Canvas(str(DIR / 'nomina-dues-columnes.pdf'), pagesize=A4)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(40, 800, 'REBUT DE SALARIS'); c.setFont('Helvetica', 9)
    c.drawString(40, 785, 'Empresa: Empresa Prova, SL    CIF: B00000000    CCC: 08 0000000000')
    c.drawString(40, 772, 'Treballador/a: Persona Prova    NIF: 00000000T    Categoria: Auxiliar')
    c.drawString(40, 759, 'Grup de cotització: 5     Període: 01/10/2026 - 31/10/2026     Dies: 30')
    c.setFont('Helvetica-Bold', 9)
    c.drawString(40, 735, 'MERITACIONS'); c.drawString(310, 735, 'DEDUCCIONS')
    c.setFont('Helvetica', 9)
    esq = [('Salari base', '1.500,00'), ('Antiguitat', '60,00'), ('Plus conveni', '120,00'), ('Plus transport', '60,00'), ('Prorrata pagues extres', '250,00')]
    dre = [('Contingències comunes 4,70 %', '90,71'), ('Desocupació 1,60 %', '30,88'), ('Formació professional 0,10 %', '1,93'),
           ('MEI 0,15 %', '2,90'), ('Retenció IRPF 12,50 %', '241,25')]
    y = 718
    for (a, b), (cc, d) in zip(esq, dre):
        c.drawString(40, y, a); dreta(c, 280, y, b); c.drawString(310, y, cc); dreta(c, 550, y, d)
        y -= 14
    c.setFont('Helvetica-Bold', 9)
    c.drawString(40, 630, 'Total meritat'); dreta(c, 280, 630, '1.990,00'); c.drawString(310, 630, 'Total a deduir'); dreta(c, 550, 630, '367,67')
    c.drawString(310, 610, 'Líquid a percebre'); dreta(c, 550, 610, '1.622,33')
    c.setFont('Helvetica', 8)
    c.drawString(40, 580, 'Base de cotització per contingències comunes: 1.930,00    Base subjecta a retenció de l\'IRPF: 1.930,00')
    c.save()


def escanejada():
    c = canvas.Canvas(str(DIR / 'nomina-escanejada.pdf'), pagesize=A4)
    c.setFillGray(0.85); c.rect(40, 400, 515, 400, fill=1, stroke=0)
    c.setFillGray(0.4)
    for i in range(20):
        c.rect(60, 780 - i * 18, 200 + (i * 37) % 250, 6, fill=1, stroke=0)
    c.save()


def factura(nom, files, titol):
    """Factura de llum amb el format habitual: dades, resum, detall amb fórmules i informació de consum."""
    c = canvas.Canvas(str(DIR / nom), pagesize=A4)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(40, 805, titol)
    y = 780
    for f in files:
        if f is None:
            y -= 8
            continue
        if isinstance(f, str):
            c.setFont('Helvetica-Bold', 10); c.drawString(40, y, f); c.setFont('Helvetica', 9)
        else:
            c.setFont('Helvetica', 9)
            c.drawString(40, y, f[0])
            if len(f) > 1: dreta(c, 550, y, f[1])
        y -= 14
        if y < 60:
            c.showPage(); y = 800
    c.save()


def factures():
    # Mercat lliure, en català, 3 preus d'energia, descompte i maxímetre (octubre del 2026, 31 dies)
    factura('factura-llum-ca.pdf', [
        'DADES DE LA FACTURA',
        ('Núm. factura: FE26-000001    Data d\'emissió: 05/11/2026',),
        ('Període de facturació: del 01/10/2026 al 31/10/2026 (31 dies)',),
        ('Data de càrrec: 20/11/2026',),
        None, 'RESUM DE LA FACTURA',
        ('Per potència contractada', '15,68 €'), ('Per energia consumida', '36,86 €'), ('Descomptes', '-3,69 €'),
        ('Impost elèctric', '2,53 €'), ('Lloguer d\'equips de mesura', '0,83 €'), ('IVA', '11,09 €'),
        ('TOTAL FACTURA', '63,89 €'),
        None, 'DADES DEL CONTRACTE',
        ('Titular: Persona Prova    CUPS: ES0000000000000000AA0F',),
        ('Potències contractades: punta 4,6 kW  vall 4,6 kW    Peatge d\'accés: 2.0TD',),
        None, 'DETALL DE LA FACTURA',
        ('Potència P1 punta: 4,6 kW x 31 dies x 0,098000 €/kW dia', '13,97 €'),
        ('Potència P2 vall: 4,6 kW x 31 dies x 0,012000 €/kW dia', '1,71 €'),
        ('Energia P1 punta: 62 kWh x 0,220000 €/kWh', '13,64 €'),
        ('Energia P2 pla: 75 kWh x 0,150000 €/kWh', '11,25 €'),
        ('Energia P3 vall: 133 kWh x 0,090000 €/kWh', '11,97 €'),
        ('Descompte 10 % sobre l\'energia', '-3,69 €'),
        ('Finançament del bo social: 31 dies x 0,019000 €/dia', '0,59 €'),
        ('Impost sobre l\'electricitat 5,11269632 % s/ 49,44 €', '2,53 €'),
        ('Lloguer del comptador: 31 dies x 0,026630 €/dia', '0,83 €'),
        ('IVA 21 % s/ 52,80 €', '11,09 €'),
        None, 'INFORMACIÓ DEL CONSUM',
        ('Consum punta (P1): 62 kWh    Consum pla (P2): 75 kWh    Consum vall (P3): 133 kWh',),
        ('Maxímetre (potència màxima demandada): 3,1 kW',),
        ('Averies: 900 000 000 (distribuïdora)    Atenció al client: 900 000 001',),
    ], 'Comercialitzadora Prova, SA')

    # PVPC en castellà: peatges, càrrecs i marge separats, potència en €/kW año x (30/365)
    factura('factura-llum-pvpc.pdf', [
        'DATOS DE LA FACTURA',
        ('Periodo de facturación: 12/09/2026 - 11/10/2026 (30 días)',),
        ('Precio voluntario para el pequeño consumidor (PVPC)',),
        None, 'RESUMEN DE LA FACTURA',
        ('Por potencia contratada', '8,94 €'), ('Por energía consumida', '28,18 €'), ('Impuesto electricidad', '1,92 €'),
        ('Alquiler de equipos', '0,80 €'), ('IVA', '8,45 €'), ('TOTAL IMPORTE FACTURA', '48,67 €'),
        None, 'DATOS DEL CONTRATO',
        ('Potencia contratada P1: 3,45 kW  P2: 3,45 kW    Peaje de acceso 2.0TD',),
        None, 'DETALLE DE LA FACTURA',
        ('Peajes de transporte y distribución P1 3,45 kW x 23,324952 €/kW año x (30/365) días', '6,61 €'),
        ('Cargos P1 3,45 kW x 4,379461 €/kW año x (30/365) días', '1,24 €'),
        ('Margen de comercialización fijo 3,45 kW x 3,113000 €/kW año x (30/365) días', '0,88 €'),
        ('Peajes de transporte y distribución P2 3,45 kW x 0,443770 €/kW año x (30/365) días', '0,13 €'),
        ('Cargos P2 3,45 kW x 0,281653 €/kW año x (30/365) días', '0,08 €'),
        ('Peajes y cargos energía P1 41 kWh x 0,097553 €/kWh', '4,00 €'),
        ('Peajes y cargos energía P2 52 kWh x 0,029267 €/kWh', '1,52 €'),
        ('Peajes y cargos energía P3 96 kWh x 0,003292 €/kWh', '0,32 €'),
        ('Coste de la energía 189 kWh x 0,118200 €/kWh', '22,34 €'),
        ('Financiación bono social fijo 30 días x 0,012742 €/día', '0,38 €'),
        ('Impuesto sobre la electricidad 5,11269632% s/ 37,50 €', '1,92 €'),
        ('Alquiler de equipos de medida y control 30 días x 0,026630 €/día', '0,80 €'),
        ('IVA 21% s/ 40,22 €', '8,45 €'),
        None, 'INFORMACIÓN DEL CONSUMO',
        ('Máxima potencia demandada (maxímetro): P1 2,87 kW  P2 1,92 kW',),
    ], 'Comercializadora de Referencia Prueba, SA')


columna('nomina-columna.pdf')
factures()
dues_columnes()
escanejada()
columna('nomina-contrasenya.pdf', encrypt=StandardEncryption('1234', canPrint=1))
print('PDF de prova creats a', DIR)
