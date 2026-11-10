"""Genera les icones de l'app amb l'estil de la família Xoriguer.

- El falcó és l'original (icons/falco.png, extret del logo Xoriguer amb fons transparent).
- A sota, la nòmina dibuixada amb línia taronja, com els objectes de les altres icones.
- Es dibuixa a 4x i es redueix, perquè les vores quedin suaus.

Ús:  python scripts/genera-icones.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ARREL = Path(__file__).resolve().parent.parent
ICONES = ARREL / 'icons'
TARONJA = (252, 136, 16)
CREMA = (245, 239, 230)
FONS_CENTRE = (26, 27, 30)
FONS_VORA = (10, 10, 12)
S = 4  # supermostreig


def fons(mida):
    """Fons negre amb una lluminositat suau al centre, com les altres icones."""
    im = Image.new('RGB', (mida, mida), FONS_VORA)
    px = im.load()
    c = mida / 2
    for y in range(mida):
        for x in range(mida):
            d = min(1.0, ((x - c) ** 2 + (y - c * 0.85) ** 2) ** 0.5 / (mida * 0.62))
            px[x, y] = tuple(int(FONS_CENTRE[i] * (1 - d) + FONS_VORA[i] * d) for i in range(3))
    return im.convert('RGBA')


def arc(cx, cy, r, a0, a1, n=12):
    import math
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def dibuixa_nomina(d, x0, y0, w, h, k):
    """Full de nòmina en línia taronja (coordenades en unitats de 512, escalades per k)."""
    sc = lambda v: v * k
    r, plec, gruix = 16, 46, 18
    x1, y1 = x0 + w, y0 + h
    contorn = (
        [(x0 + r, y0), (x1 - plec, y0), (x1, y0 + plec), (x1, y1 - r)]
        + arc(x1 - r, y1 - r, r, 0, 90)
        + [(x0 + r, y1)]
        + arc(x0 + r, y1 - r, r, 90, 180)
        + [(x0, y0 + r)]
        + arc(x0 + r, y0 + r, r, 180, 270)
        + [(x0 + r, y0)]
    )
    d.line([(sc(x), sc(y)) for x, y in contorn], fill=TARONJA, width=int(sc(gruix)), joint='curve')
    # plec de la cantonada
    plec_pts = [(x1 - plec, y0)] + [(x1 - plec, y0 + plec - 12)] + arc(x1 - plec + 12, y0 + plec - 12, 12, 180, 90) + [(x1, y0 + plec)]
    d.line([(sc(x), sc(y)) for x, y in plec_pts], fill=TARONJA, width=int(sc(14)), joint='curve')
    for x, y in contorn[:1] + [(x1 - plec, y0), (x1, y0 + plec), (x1, y1 - r), (x0 + r, y1), (x0, y0 + r)]:
        rr = sc(gruix) / 2
        d.ellipse([sc(x) - rr, sc(y) - rr, sc(x) + rr, sc(y) + rr], fill=TARONJA)

    def ratlla(xa, xb, y, g, color):
        d.line([(sc(xa), sc(y)), (sc(xb), sc(y))], fill=color, width=int(sc(g)))
        for xx in (xa, xb):
            d.ellipse([sc(xx) - sc(g) / 2, sc(y) - sc(g) / 2, sc(xx) + sc(g) / 2, sc(y) + sc(g) / 2], fill=color)

    lx = x0 + 32
    crema_suau = (*CREMA[:3], 175)
    ratlla(lx, lx + 76, y0 + 62, 13, CREMA)
    ratlla(lx, lx + 36, y0 + 100, 10, crema_suau)
    ratlla(lx + 56, x1 - 34, y0 + 100, 10, crema_suau)
    ratlla(lx, lx + 50, y0 + 134, 10, crema_suau)
    ratlla(lx + 70, x1 - 34, y0 + 134, 10, crema_suau)
    ratlla(lx, lx + 48, y1 - 38, 13, TARONJA)
    font = ImageFont.truetype('C:/Windows/Fonts/seguibl.ttf', int(sc(44))) if Path('C:/Windows/Fonts/seguibl.ttf').exists() \
        else ImageFont.truetype('DejaVuSans-Bold.ttf', int(sc(44)))
    d.text((sc(x1 - 28), sc(y1 - 38)), '€', font=font, fill=TARONJA, anchor='rm')


def icona(mida, escala_contingut=1.0):
    gran = mida * S
    k = gran / 512
    im = fons(gran)
    capa = Image.new('RGBA', (gran, gran), (0, 0, 0, 0))

    # Falcó: 68 % de l'amplada, a dalt (mateixa composició que les altres icones)
    falco = Image.open(ICONES / 'falco.png')
    fw = int(512 * 0.70 * k)
    fh = int(falco.height * fw / falco.width)
    falco = falco.resize((fw, fh), Image.LANCZOS)
    capa.alpha_composite(falco, (int((gran - fw) / 2), int(62 * k)))

    d = ImageDraw.Draw(capa)
    dibuixa_nomina(d, 180, 222, 152, 226, k)

    if escala_contingut != 1.0:  # versió maskable: contingut dins la zona segura
        nova = int(gran * escala_contingut)
        capa = capa.resize((nova, nova), Image.LANCZOS)
        buida = Image.new('RGBA', (gran, gran), (0, 0, 0, 0))
        buida.alpha_composite(capa, ((gran - nova) // 2, (gran - nova) // 2))
        capa = buida
    im.alpha_composite(capa)
    return im.resize((mida, mida), Image.LANCZOS).convert('RGB')


if __name__ == '__main__':
    icona(512).save(ICONES / 'icon-512.png', optimize=True)
    icona(192).save(ICONES / 'icon-192.png', optimize=True)
    icona(64).save(ICONES / 'icon-64.png', optimize=True)
    icona(512, 0.8).save(ICONES / 'icon-maskable-512.png', optimize=True)
    print('Icones generades a', ICONES)
