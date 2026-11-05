"""Original Warm Brown line art. Run with Python + CairoSVG + Pillow.

Every path is drawn for this project; no reference photographs or remote assets
are used. SVG masters live outside the Mini Program package.
"""
from pathlib import Path
from io import BytesIO
import math
import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'miniprogram' / 'assets'
SOURCE = ROOT / 'scripts' / 'asset-sources'
BROWN = '#60371f'
INK = '#56341f'
LIGHT = '#fff7e8'
CREAM = '#f5e4c5'
CARAMEL = '#b78151'
MILK = '#fffaf0'
PINK = '#d3a08b'
GREEN = '#a5a16e'


def path(d, fill='none', stroke=INK, sw=3, **kw):
    attrs = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in kw.items())
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {attrs}/>'


def ellipse(cx, cy, rx, ry=None, fill='none', stroke=INK, sw=3, **kw):
    attrs = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in kw.items())
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry if ry is not None else rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {attrs}/>'


def group(body, transform='', **kw):
    attrs = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in kw.items())
    return f'<g transform="{transform}" {attrs}>{body}</g>'


def text(value, x, y, size=12, rotate=0):
    return f'<text x="{x}" y="{y}" font-family="Georgia,serif" font-size="{size}" font-style="italic" font-weight="bold" fill="{INK}" transform="rotate({rotate} {x} {y})">{value}</text>'


def spark(x, y, s=1):
    return group(path('M0 -8 Q1 -1 7 0 Q1 1 0 8 Q-1 1 -7 0 Q-1 -1 0 -8', fill=CREAM, sw=1.8), f'translate({x} {y}) scale({s})')


def heart(x, y, s=1, fill=CREAM):
    return group(path('M0 7 C-24 -8 -12 -24 0 -11 C12 -26 27 -10 0 7Z', fill=fill, sw=2.5), f'translate({x} {y}) scale({s})')


def dots(points, color=INK, r=1.3):
    return ''.join(ellipse(x, y, r, fill=color, stroke='none') for x, y in points)


def save(name, body, w, h, scale=1):
    doc = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
    source = SOURCE / f'{name}.svg'
    target = OUT / f'{name}.png'
    source.parent.mkdir(parents=True, exist_ok=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(doc, encoding='utf-8')
    blob = cairosvg.svg2png(bytestring=doc.encode(), output_width=round(w*scale), output_height=round(h*scale))
    im = Image.open(BytesIO(blob)).convert('RGBA')
    # Indexed PNG with a full alpha table retains antialiased edges while keeping
    # the complete native package small enough for ordinary developer tools.
    im.quantize(colors=192, method=Image.Quantize.FASTOCTREE).save(target, optimize=True)
    return target


def bean(x, y, s=1, rot=0, fill=CARAMEL):
    return group(ellipse(0, 0, 8, 11, fill, sw=2) + path('M2 -9 C-6 -4 4 3 -3 9', sw=1.7), f'translate({x} {y}) rotate({rot}) scale({s})')


def strawberry(x=0, y=0, s=1):
    b = path('M-16 -3 C-20 -23 19 -27 19 -7 C19 7 4 24 0 25 C-6 21 -15 8 -16 -3Z', '#ce9a7e', sw=2.4)
    b += path('M-1 -14 C-13 -27 -15 -19 -9 -13 C-22 -11 -15 -6 -5 -9 C-5 -1 4 0 5 -10 C17 -4 22 -12 10 -14 C19 -23 9 -24 3 -16 C5 -29 -4 -27 -1 -14Z', GREEN, sw=2)
    b += dots([(-9, -1), (5, -3), (-3, 6), (9, 7), (1, 15)], LIGHT, 1.4)
    return group(b, f'translate({x} {y}) scale({s})')


def cat_puff(x=0, y=0, s=1, hero=False):
    # An irregular choux collar, not a circle: broad baked folds and uneven crust.
    b = path('M-106 36 C-125 24 -126 5 -115 -10 C-131 -31 -115 -55 -100 -62 C-108 -83 -82 -107 -64 -103 C-53 -128 -25 -132 -7 -120 C13 -137 41 -129 49 -116 C74 -122 96 -104 98 -84 C122 -78 126 -56 117 -41 C137 -26 130 -1 118 8 C135 30 112 52 94 55 C81 79 51 76 36 70 C12 83 -12 77 -24 69 C-52 83 -75 71 -82 58 C-95 59 -107 50 -106 36Z', CREAM, sw=4)
    b += path('M-106 -17 C-95 -27 -96 -42 -85 -49 M-79 -83 Q-68 -96 -54 -94 M-16 -110 Q-1 -116 10 -110 M62 -101 Q77 -97 82 -83 M110 -44 Q115 -32 111 -23 M-103 35 Q-91 47 -82 46 M76 57 Q92 51 96 40', sw=2.8)
    b += path('M-87 8 C-88 -20 -73 -46 -54 -55 L-58 -89 Q-56 -100 -44 -95 L-19 -70 C-2 -75 17 -73 31 -68 L57 -94 Q66 -102 72 -88 L72 -49 C93 -27 101 4 87 26 C80 46 48 55 5 57 C-41 57 -76 47 -87 26Z', BROWN, sw=3.3)
    b += path('M-65 -5 C-66 -22 -58 -36 -44 -42 L-44 -71 Q-42 -78 -34 -69 L-17 -49 C-5 -55 18 -52 28 -47 L47 -68 Q53 -76 57 -67 L57 -36 C75 -24 83 -9 77 12 C74 32 44 43 5 44 C-38 44 -65 32 -68 15Z', MILK, sw=2.5)
    b += path('M-39 -60 L-32 -49 L-42 -48Z', '#b78151', sw=1.6) + path('M48 -58 L48 -45 L37 -47Z', '#b78151', sw=1.6)
    b += ellipse(-20, -8, 3, 6, INK, stroke='none') + ellipse(27, -8, 3, 6, INK, stroke='none')
    b += path('M1 6 Q6 1 10 6 L6 12Z', BROWN, sw=1.5) + path('M6 12 Q3 22 -7 15 M6 12 Q9 22 18 15', sw=2.5)
    b += path('M-32 7 L-49 3 M-32 14 L-50 16 M39 6 L56 2 M39 14 L58 16', sw=2.2)
    b += ellipse(-26, 16, 6, 3.5, '#dbbaa0', stroke='none') + ellipse(33, 16, 6, 3.5, '#dbbaa0', stroke='none')
    b += path('M-49 75 C-56 92 -55 115 -45 122 C-24 132 26 132 49 121 C60 108 55 87 49 76', CREAM, sw=3.5)
    b += path('M-40 90 Q-43 109 -33 114 M-16 92 Q-12 107 -19 119 M17 91 Q15 108 23 119 M41 90 Q48 107 39 115', sw=2.2)
    b += path('M-53 99 C-66 87 -77 92 -79 104 C-81 118 -62 126 -48 120 M48 99 C63 88 75 94 76 107 C77 120 58 126 47 120', CREAM, sw=3)
    b += dots([(-68, 103), (-60, 100), (-63, 111), (59, 104), (66, 108), (58, 113)], INK, 2)
    # Baked flecks, with varied rounded quadrilaterals.
    b += path('M-79 -65 l7 -4 5 5 -7 6Z M-34 -104 l15 -2 -1 7 -11 4Z M29 -106 l9 3 -3 7 -9 -3Z M95 -6 l7 5 -3 7 -6 -3Z M-107 5 l8 -3 3 6 -6 3Z M64 48 l8 -2 2 5 -7 4Z', BROWN, sw=1)
    if hero:
        b += path('M-88 136 Q-17 145 70 137', sw=1.5, opacity='.5')
    return group(b, f'translate({x} {y}) scale({s})')


def croissant(x=0, y=0, s=1, almond=False):
    b = path('M-91 19 C-89 -4 -69 -26 -44 -31 C-39 -55 -10 -62 5 -50 C27 -62 48 -42 50 -27 C78 -24 93 -4 92 22 C86 39 67 43 57 29 C43 42 19 48 1 44 C-22 49 -45 41 -58 28 C-69 44 -90 37 -91 19Z', '#d7ad78', sw=3)
    b += path('M-89 20 Q-69 15 -62 -7 Q-61 -20 -45 -28 M-58 29 C-61 4 -49 -18 -35 -29 M-38 39 C-46 10 -31 -24 -20 -43 M-13 43 C-21 13 -13 -19 4 -49 M12 43 C4 19 10 -14 23 -46 M35 38 Q27 8 41 -29 M57 29 Q54 0 70 -16 M91 20 Q73 18 65 6', sw=2.7)
    b += path('M-78 20 Q-72 22 -70 27 M-30 -20 Q-27 -32 -22 -36 M15 -28 L20 -34 M39 4 L41 -4', '#e7c89a', stroke='none')
    if almond:
        b += path('M-45 -16 Q-40 -26 -32 -25 Q-30 -15 -38 -8Z M-18 -27 Q-10 -36 -3 -30 Q-4 -20 -13 -16Z M14 -16 Q17 -28 25 -28 Q30 -18 24 -11Z M36 -6 Q45 -13 49 -7 Q47 3 41 7Z M-18 5 Q-9 -1 -5 5 Q-8 15 -15 16Z', MILK, sw=1.6)
        b += dots([(-58, 5), (-26, -7), (3, -7), (19, 17), (51, 13), (-29, 20)], MILK, 2.2)
    return group(b, f'translate({x} {y}) scale({s})')


def cake_slice(x=0, y=0, s=1):
    b = ellipse(0, 57, 100, 15, LIGHT, sw=2.1)
    b += path('M-81 -2 L34 -48 L82 -9 L77 46 Q7 67 -80 36Z', '#d6b183', sw=2.8)
    b += path('M-80 9 Q-12 32 80 2 L79 15 Q-8 46 -80 24Z', MILK, sw=2)
    b += path('M-80 -2 L33 -50 L83 -10 Q5 14 -80 -2Z', MILK, sw=2.8)
    b += path('M-77 -2 Q-63 13 -52 8 Q-42 5 -38 19 Q-30 28 -21 11 Q-14 5 -6 18 Q4 27 11 5 Q19 -3 29 6 Q40 14 45 -1 Q55 -13 70 -8', MILK, sw=2.4)
    b += strawberry(15, -38, .68)
    b += path('M-38 26 L-29 29 M-5 34 L5 34 M35 31 L43 27 M-55 37 L-47 41 M17 43 L26 42', sw=1.3)
    b += dots([(-45, 17), (17, 22), (57, 15)], '#b47765', 4)
    return group(b, f'translate({x} {y}) scale({s})')


def gift_box(x=0, y=0, s=1):
    b = path('M-47 -8 L46 -11 L46 53 Q1 58 -43 51Z', CREAM, sw=2.8)
    b += path('M-51 -18 Q-1 -22 51 -18 L51 -3 Q-1 1 -51 -2Z', LIGHT, sw=2.8)
    b += path('M-7 -18 L6 -19 L7 55 L-5 55Z', '#b78151', sw=2)
    b += path('M0 -21 C-49 -16 -43 -51 -17 -42 Q-5 -35 0 -21 C10 -58 43 -51 36 -31 Q29 -15 0 -21Z', LIGHT, sw=2.7)
    b += path('M-2 -23 Q-13 -32 -27 -33 M3 -23 Q17 -34 28 -36 M-38 8 L-37 40 M34 3 L34 43', sw=1.5)
    b += heart(23, 23, .42, '#b78151')
    return group(b, f'translate({x} {y}) scale({s})')


def donut(x=0, y=0, s=1):
    b = path('M-43 -24 C-21 -51 19 -50 41 -25 C67 -2 51 36 23 47 C-7 60 -45 47 -53 22 C-59 4 -55 -10 -43 -24Z', '#d3aa79', sw=2.7)
    b += path('M-45 -20 C-28 -43 13 -44 35 -22 C48 -10 48 8 35 8 Q24 5 25 20 Q23 36 7 31 Q-5 23 -11 36 Q-25 48 -32 24 Q-34 15 -44 16 Q-58 8 -45 -20Z', MILK, sw=2.3)
    b += path('M-9 -8 C4 -18 18 -9 15 5 C11 20 -7 18 -12 8 C-15 2 -14 -3 -9 -8Z', CREAM, sw=2.2)
    b += path('M-30 -17 l6 -4 M3 -28 l6 3 M28 -10 l-5 5 M-34 5 l6 2 M-8 29 l4 -5 M26 26 l5 -3', sw=2.3)
    return group(b, f'translate({x} {y}) scale({s})')


def birthday_cake(x=0, y=0, s=1):
    b = ellipse(0, 58, 82, 17, LIGHT, sw=2.2)
    b += path('M-55 -2 L-54 39 C-42 60 42 61 55 39 L56 -3Z', '#d0ab7c', sw=2.8)
    b += ellipse(0, -2, 56, 19, MILK, sw=2.7)
    b += path('M-55 1 C-49 4 -52 23 -41 23 C-30 23 -37 8 -23 13 C-13 17 -17 31 -5 29 C6 27 0 12 14 14 C25 16 18 29 31 26 C41 23 35 12 47 9 L55 3', MILK, sw=2.4)
    for xx, yy in [(-31, -16), (-3, -23), (27, -17)]:
        b += path(f'M{xx-3} {yy} l0 -25 l6 0 l0 25Z', '#bd9b74', sw=1.9)
        b += path(f'M{xx} {yy-31} C{xx-8} {yy-38} {xx+1} {yy-42} {xx} {yy-47} C{xx+11} {yy-37} {xx+7} {yy-31} {xx} {yy-31}Z', CARAMEL, sw=1.6)
    b += path('M-39 38 Q-23 45 -13 41 M4 46 Q20 45 30 41', sw=1.6)
    return group(b, f'translate({x} {y}) scale({s})')


def pouch(x=0, y=0, s=1):
    b = path('M-38 -46 L39 -47 L32 -35 L38 48 L-37 47 L-31 -36Z', LIGHT, sw=2.8)
    b += path('M-38 -46 l5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 M-36 46 l6 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 5 6 5 -6 M-26 -29 L26 -29 M-27 31 L28 32', sw=1.7)
    b += bean(0, 2, 1.5, 23) + text('BAKED', -23, -12, 9)
    b += path('M-26 17 L-19 13 M17 20 L27 14 M-26 -2 L-19 2', sw=1.3)
    return group(b, f'translate({x} {y}) scale({s})')


def puppy_face(x=0, y=0, s=1, rot=0):
    # Long, soft ears sit behind the head; there are no feline whiskers.
    b = path('M-52 -64 C-79 -92 -102 -66 -110 -26 C-121 16 -107 61 -87 62 C-65 64 -65 30 -57 5Z', '#b78151', sw=4.5)
    b += path('M54 -64 C80 -86 104 -66 111 -23 C120 17 108 59 88 62 C68 66 65 31 57 5Z', '#b78151', sw=4.5)
    b += path('M-88 -43 Q-103 -3 -93 36 M90 -42 Q103 -7 94 35', sw=2.2, stroke='#8e603e')
    b += path('M-60 -61 C-49 -84 -29 -91 -7 -82 C14 -92 43 -84 58 -63 C74 -43 77 -14 68 9 C82 25 75 46 55 51 C43 70 -35 73 -55 53 C-77 54 -84 35 -71 18 C-81 -5 -75 -37 -60 -61Z', LIGHT, sw=4.6)
    b += path('M-59 -60 C-47 -78 -28 -83 -13 -74 Q-19 -53 -16 -33 C-13 -13 -28 2 -43 -5 C-61 -12 -61 -40 -59 -60Z', '#c39569', stroke='none')
    b += path('M-10 -71 Q-4 -78 3 -72 M7 -72 Q15 -78 22 -69', sw=1.9, stroke='#a47b55')
    b += ellipse(-28, -19, 4.6, 7.1, INK, stroke='none') + ellipse(30, -18, 4.6, 7.1, INK, stroke='none')
    b += path('M-39 -34 Q-31 -39 -24 -35 M25 -34 Q32 -39 40 -32', sw=2.5)
    b += path('M-42 16 C-44 -3 -23 -11 -7 0 C2 -9 25 -6 39 9 C51 24 39 42 22 46 C9 56 -25 51 -38 39 C-48 34 -48 23 -42 16Z', '#f4e6ce', sw=2.3)
    b += path('M-10 7 C-12 -5 16 -7 18 5 C20 17 8 22 3 20 C-3 19 -9 14 -10 7Z', BROWN, sw=1.6)
    b += path('M4 20 L4 30 Q-8 43 -21 31 M4 30 Q17 42 29 29', sw=2.9)
    b += path('M1 34 Q8 35 15 33 L16 45 C13 55 1 55 -1 46Z', '#d3a08b', sw=2.1)
    b += path('M7 38 L7 46', sw=1.2, stroke='#a87964')
    b += dots([(-21, 17), (-28, 23), (28, 18), (34, 24)], '#bc966f', 1.7)
    return group(b, f'translate({x} {y}) rotate({rot}) scale({s})')


def corgi_face(x=0, y=0, s=1, rot=0):
    # Broad corgi muzzle, small blaze and generous rounded upright ears.
    b = path('M-78 -25 C-92 -51 -92 -97 -75 -107 C-62 -113 -39 -90 -29 -71 C-11 -78 12 -77 28 -70 C42 -94 63 -115 78 -104 C95 -92 94 -49 80 -27 C101 -7 105 18 86 33 C89 53 64 64 44 66 C20 79 -21 76 -42 65 C-66 67 -90 54 -86 36 C-106 24 -102 -6 -78 -25Z', '#bf9364', sw=4.6)
    b += path('M-73 -47 C-81 -66 -79 -88 -70 -91 Q-55 -84 -42 -66Z', '#e3c2a0', sw=2.2)
    b += path('M42 -65 Q63 -92 73 -91 C82 -77 83 -60 75 -43Z', '#e3c2a0', sw=2.2)
    b += path('M-11 -73 C-18 -44 -4 -27 -16 -8 C-29 -2 -48 -7 -56 8 C-75 20 -66 49 -41 55 C-22 72 27 70 44 54 C69 46 76 22 56 7 C45 -6 25 -3 15 -10 C4 -29 15 -48 9 -74Z', LIGHT, sw=2.4)
    b += ellipse(-31, -18, 4.6, 7.4, INK, stroke='none') + ellipse(31, -17, 4.6, 7.4, INK, stroke='none')
    b += path('M-42 -33 Q-34 -38 -26 -34 M26 -33 Q34 -38 42 -32', sw=2.3)
    b += path('M-13 6 C-14 -7 13 -9 17 3 C20 15 6 23 1 21 C-5 19 -12 13 -13 6Z', BROWN, sw=1.6)
    b += path('M2 21 L2 32 M-22 30 Q1 52 25 29', sw=3.1)
    b += path('M-5 42 Q3 44 10 40 L10 51 C8 59 -3 59 -5 51Z', '#d3a08b', sw=2)
    b += path('M2 46 L2 52', sw=1.2, stroke='#a87964')
    b += ellipse(-41, 22, 8, 4, '#e0bfa0', stroke='none') + ellipse(40, 21, 8, 4, '#e0bfa0', stroke='none')
    b += dots([(-25, 15), (-32, 23), (26, 16), (33, 23)], '#bc966f', 1.6)
    return group(b, f'translate({x} {y}) rotate({rot}) scale({s})')


def build_heroes():
    b = cat_puff(310, 288, 1.27, True)
    b += croissant(108, 158, .59) + cake_slice(508, 135, .56)
    b += donut(90, 337, .62) + gift_box(527, 320, .66)
    b += pouch(177, 491, .61) + birthday_cake(466, 483, .65)
    b += text('FRESHLY BAKED', 34, 95, 11, -9) + text('a little sweet', 463, 78, 11, 6)
    b += text('with love', 30, 389, 12, -12) + text('FOR YOU', 514, 402, 10, 8)
    b += path('M93 103 Q105 116 121 120 M487 82 Q482 95 493 99 M61 375 Q56 366 63 360 M548 381 Q554 373 551 367', sw=1.3, stroke_dasharray='3 5')
    b += spark(59, 222, .65) + spark(552, 225, .8) + heart(406, 64, .42) + spark(265, 508, .6)
    save('illustrations/cat-hero', b, 620, 560, 1.1)

    # Cookie-cloud friends with asymmetrical faces and little dancing feet.
    cloud_path = 'M-89 -18 C-103 -34 -91 -57 -73 -61 C-78 -79 -56 -93 -40 -86 C-34 -106 -8 -105 3 -94 C17 -109 43 -99 46 -84 C68 -88 83 -71 79 -55 C100 -49 104 -27 92 -15 C108 -1 96 24 80 27 C86 46 65 61 49 55 C40 77 15 75 3 62 C-12 77 -36 70 -41 55 C-65 64 -81 48 -78 33 C-101 30 -108 3 -89 -18Z'
    def cloud(x, y, flip=False):
        bb = path('M-43 -89 L-9 -208 L35 -91 Q-5 -107 -43 -89Z', CREAM, sw=4.8)
        bb += path('M-9 -209 L-13 -220 M-9 -211 L-21 -215 M-8 -212 L0 -219 M-8 -211 L3 -208', sw=5)
        bb += path('M-21 -163 L-2 -169 M-30 -133 L10 -144', sw=2.2)
        bb += path(cloud_path, LIGHT, sw=4.8)
        bb += ellipse(-26, -22, 4, 6, INK, stroke='none') + ellipse(29, -21, 4.4, 6.1, INK, stroke='none')
        bb += path('M-7 -4 Q0 -10 7 -4 L1 3Z', INK, sw=1.5)
        bb += path('M-16 3 Q0 22 18 2 M-3 13 Q0 7 6 11', sw=3)
        bb += ellipse(-42, 5, 9, 5, '#dfc2a4', stroke='none') + ellipse(41, 5, 9, 5, '#dfc2a4', stroke='none')
        bb += dots([(-58, -42), (55, -44), (-49, 34), (31, 40), (7, -64)], CARAMEL, 4.6)
        bb += path('M-48 62 Q-47 73 -57 77 C-72 82 -74 72 -64 68 M37 65 Q36 78 49 80 C65 82 64 72 53 70', fill=LIGHT, sw=4)
        bb += path('M-87 15 Q-99 25 -108 21 M86 -13 Q113 -26 130 -42', sw=4.4)
        cup = path('M106 -63 L133 -59 L125 -25 Q112 -20 108 -29Z', CREAM, sw=3.5)
        cup += ellipse(120, -62, 14, 5, LIGHT, sw=3.2)
        cup += path('M114 -59 L112 -48 M128 -57 L125 -45', sw=1.8)
        bb += group(cup, 'translate(17 0)')
        return group(bb, f'translate({x} {y}) scale({-1 if flip else 1} 1)')
    b = cloud(171, 283) + cloud(472, 282, True)
    b += heart(321, 143, .5) + spark(310, 211, .65)
    b += path('M296 204 l-7 -7 M324 200 l3 -10 M307 191 l-1 -9 M68 349 Q71 355 84 351 M542 351 Q552 356 564 351', sw=2.1)
    save('illustrations/cloud-hero', b, 640, 392, 1.1)

    b = puppy_face(169, 169, .99, -6) + corgi_face(418, 173, .99, 5)
    b += heart(300, 53, .48) + spark(64, 85, .8) + spark(536, 209, .9)
    b += path('M105 264 Q145 271 186 265 M388 265 Q432 273 477 262', sw=1.8, opacity='.5')
    save('illustrations/dog-hero', b, 600, 300, 1.1)


def iced_coffee(x=0, y=0, s=1, kind='latte'):
    fill = {'latte':'#c89b72', 'americano':'#8f6546', 'orange':'#bd8c51'}[kind]
    b = ellipse(0, 109, 67, 10, '#f1e5d0', stroke='none')
    b += path('M-57 -79 L-43 94 Q-5 113 43 94 L57 -79Z', '#faf2dd', sw=3)
    b += path('M-48 -46 L-37 86 Q1 103 36 86 L48 -47Z', fill, sw=1.6)
    if kind == 'latte':
        b += path('M-45 -21 Q-16 -9 6 -20 Q23 -31 46 -17 L37 86 Q2 102 -37 86Z', '#ddbd95', sw=1.8)
        b += path('M-42 3 Q-19 10 -3 0 Q12 -10 42 1 M-41 23 Q-12 33 7 20 Q26 14 41 21 M-37 62 Q-18 72 4 62', sw=1.3, stroke='#b2825e', opacity='.7')
    if kind == 'orange':
        b += path('M-41 28 Q-14 19 0 30 Q16 37 42 23 L36 86 Q0 100 -37 85Z', '#dcbd79', sw=1.5)
    b += path('M-32 -56 L-7 -61 L-1 -39 L-27 -34Z M10 -57 L34 -54 L31 -32 L8 -35Z M-9 -22 L12 -29 L22 -9 L1 -1Z', '#ead8bb', sw=1.8, opacity='.8')
    b += path('M-4 -86 L14 -141 L24 -139 L8 -81', MILK, sw=2.6)
    b += ellipse(0, -80, 58, 13, '#e5d7bc', sw=2.8)
    b += path('M-40 -78 Q-4 -68 33 -77 M-40 -58 L-32 50', sw=1.9, stroke=MILK)
    b += ellipse(0, 35, 30, 29, LIGHT, sw=2)
    b += bean(0, 29, 1.05, 29) + text('WB', -9, 55, 11)
    if kind == 'orange':
        b += ellipse(49, -42, 28, 29, '#ecd49a', sw=2.2) + ellipse(49, -42, 21, 22, '#d5a765', sw=1.3)
        b += path('M49 -63 L49 -21 M28 -42 L70 -42 M34 -57 L63 -27 M34 -26 L64 -57', sw=1.2, stroke=LIGHT)
    b += spark(-76, -106, .7)
    return group(b, f'translate({x} {y}) scale({s})')


def hot_latte(x=0, y=0, s=1):
    b = ellipse(0, 74, 98, 19, '#eadac1', sw=2.4)
    b += path('M-67 -40 Q-71 22 -43 54 C-18 77 41 72 58 44 Q70 9 65 -41Z', MILK, sw=3.2)
    b += path('M65 -29 C123 -45 122 39 65 38 L70 22 C102 22 103 -13 66 -13', LIGHT, sw=3)
    b += ellipse(-2, -41, 67, 23, '#d4af84', sw=3)
    b += ellipse(-2, -42, 53, 16, '#ac7751', sw=1.7)
    b += path('M-4 -30 C-39 -42 -29 -62 -8 -46 C0 -62 33 -55 26 -43 Q15 -30 -4 -30Z', MILK, sw=1.7)
    b += path('M-8 -43 Q-2 -38 3 -33 M-8 -32 L-9 -26', sw=1.5, stroke='#ac7751')
    b += path('M-36 -79 C-55 -104 -20 -106 -35 -133 M-1 -83 C-18 -106 14 -112 1 -137 M34 -83 C21 -100 49 -105 38 -123', sw=2.4)
    b += heart(-7, 25, .67, CREAM) + bean(81, 81, .6, 51) + bean(-80, 67, .65, -27)
    return group(b, f'translate({x} {y}) scale({s})')


def cloud_cake(x=0, y=0, s=1):
    b = ellipse(0, 78, 104, 19, '#eadbc2', sw=2.1)
    b += path('M-79 -9 L-79 54 C-57 88 59 89 81 53 L81 -9Z', '#e3c39c', sw=2.8)
    b += path('M-79 10 Q-40 33 3 31 Q43 31 81 11 L81 28 Q0 65 -79 29Z', MILK, sw=2.1)
    b += path('M-80 -5 C-91 -20 -78 -40 -63 -40 C-64 -60 -41 -67 -27 -58 C-15 -77 9 -70 17 -58 C37 -69 57 -57 58 -42 C80 -46 95 -26 81 -8 C64 16 -58 19 -80 -5Z', MILK, sw=3)
    b += path('M-77 -1 Q-59 3 -55 18 Q-51 30 -43 23 L-31 8 Q-20 5 -16 22 Q-10 35 -2 18 Q7 1 18 17 Q25 29 31 12 Q36 1 48 12 Q59 20 64 4 Q73 -3 80 -4', MILK, sw=2)
    b += ellipse(-24, -23, 2.5, 4.5, INK, stroke='none') + ellipse(25, -23, 2.5, 4.5, INK, stroke='none')
    b += path('M-7 -11 Q0 -5 8 -12 M0 -11 L0 -6', sw=2.2)
    b += strawberry(-6, -76, .67) + dots([(-51, -27), (48, -28)], '#d7b49c', 5)
    b += spark(92, -66, .7)
    return group(b, f'translate({x} {y}) scale({s})')


def matcha_roll(x=0, y=0, s=1):
    b = ellipse(0, 70, 105, 17, '#eadbc2', sw=2)
    b += path('M-48 -56 L35 -54 C98 -55 108 50 40 65 L-42 64Z', '#a5a16e', sw=3)
    b += path('M-46 -54 C-105 -54 -111 61 -43 66 C29 66 28 -52 -46 -54Z', '#bcb987', sw=2.9)
    b += path('M-44 -37 C-93 -35 -87 51 -44 49 C0 48 1 -33 -41 -34 C-75 -34 -74 29 -43 31 C-19 30 -18 -14 -40 -17 C-54 -19 -59 6 -44 9', MILK, sw=7.8)
    b += path('M-42 -36 C-90 -33 -84 47 -43 47 C-5 47 -2 -29 -41 -30 C-69 -31 -70 25 -43 26 C-22 27 -23 -10 -40 -12', sw=1.4, stroke='#828653')
    b += path('M15 -52 C8 -73 33 -78 36 -61 C35 -82 62 -76 57 -60 C65 -77 86 -61 72 -49 Q40 -42 15 -52Z', MILK, sw=2.7)
    b += strawberry(41, -79, .55)
    b += path('M25 30 L35 27 M62 40 L73 36 M79 3 L87 -2', sw=1.8, stroke='#828653')
    b += path('M-99 28 Q-123 16 -111 -2 Q-90 4 -99 28 M-99 27 Q-104 13 -110 6', GREEN, sw=2)
    return group(b, f'translate({x} {y}) scale({s})')


def tiramisu(x=0, y=0, s=1):
    b = ellipse(0, 78, 105, 17, '#eadbc2', sw=2)
    b += path('M-73 -40 L38 -64 L85 -33 L84 46 L-24 78 L-73 47Z', '#ac7954', sw=2.8)
    b += path('M-72 -19 L-25 7 L85 -20 L85 -4 L-25 24 L-72 -3Z M-73 16 L-25 42 L85 15 L85 31 L-25 60 L-73 32Z', MILK, sw=1.8)
    b += path('M-73 -40 L38 -65 L85 -34 L-25 -6Z', '#a1714d', sw=2.8)
    b += path('M-25 -6 L-25 76', sw=2.1)
    b += dots([(-45, -34), (-31, -29), (-13, -39), (4, -46), (24, -38), (39, -50), (59, -35), (14, -25), (-10, -17), (35, -27)], '#68442c', 1.1)
    b += path('M-13 -45 C-28 -74 16 -78 18 -51 C21 -72 49 -62 38 -45Z', MILK, sw=2.4)
    b += bean(14, -64, .65, 42) + bean(-93, 64, .8, -30) + bean(91, 77, .7, 44)
    return group(b, f'translate({x} {y}) scale({s})')


def chocolate_loaf(x=0, y=0, s=1):
    b = ellipse(0, 77, 107, 17, '#eadbc2', sw=2)
    b += path('M-83 -17 C-89 -52 -57 -79 -31 -57 C-22 -88 21 -91 33 -64 C68 -86 95 -48 83 -16 L79 59 Q0 83 -79 58Z', '#bc936b', sw=3)
    b += path('M-82 -13 C-75 -8 -74 7 -65 6 C-56 6 -59 -9 -46 -6 C-32 -1 -34 15 -21 10 C-12 5 -12 -10 1 -8 C15 -6 15 7 27 3 C40 -2 39 -16 55 -14 C68 -15 71 -2 84 -15 L84 -28 C73 -52 52 -53 31 -49 C11 -62 -12 -63 -32 -47 C-53 -57 -72 -43 -82 -28Z', '#67432f', sw=2.4)
    b += path('M-79 6 L-76 51 Q-25 65 4 60 M-51 -41 Q-67 -29 -62 -20 M-21 -55 Q-34 -42 -30 -28 M16 -58 Q0 -45 4 -30 M49 -51 Q32 -35 36 -25 M70 -34 Q59 -20 63 -13', sw=2.4)
    b += path('M-30 19 l11 -2 4 9 -12 4Z M28 31 l12 -4 5 9 -13 3Z M-8 45 l9 -4 5 7 -10 4Z', '#67432f', sw=1.2)
    b += dots([(-58, 25), (52, 14), (57, 47), (-41, 44)], MILK, 2.1)
    return group(b, f'translate({x} {y}) scale({s})')


def bagel(x=0, y=0, s=1):
    b = ellipse(0, 82, 107, 14, '#eadbc2', sw=2)
    b += path('M-91 2 C-85 -62 -29 -84 25 -68 C75 -59 101 -23 94 18 C86 65 37 85 -14 75 C-61 71 -97 48 -91 2Z', '#d5ad77', sw=3)
    b += path('M-90 5 C-80 39 -54 55 -9 57 C37 61 74 39 94 14 M-71 -20 Q-63 -45 -40 -50 M48 -38 Q68 -24 75 -3', sw=2.2)
    b += path('M-25 -11 C-9 -29 21 -24 32 -5 C43 17 19 35 -5 29 C-28 27 -40 8 -25 -11Z', '#f6e6cc', sw=2.7)
    b += path('M-24 -10 Q-6 1 12 -7 Q26 -15 32 -4', sw=2)
    b += path('M-59 -22 l5 -3 M-37 -44 l5 1 M-5 -48 l4 -5 M24 -43 l4 2 M58 -23 l5 4 M74 6 l-5 3 M46 37 l4 4 M-38 28 l-6 3 M-64 8 l5 1 M2 52 l5 -2', sw=3.1, stroke=MILK)
    b += path('M-74 36 Q-91 47 -93 61 M-89 47 L-100 46 M-89 47 L-86 35', sw=1.6, stroke=GREEN)
    return group(b, f'translate({x} {y}) scale({s})')


def tea_set(x=0, y=0, s=1):
    b = path('M-113 65 Q0 93 116 62 L110 76 Q-1 107 -109 77Z', CREAM, sw=2.7)
    b += group(hot_latte(59, 15, .62), '')
    b += cake_slice(-38, 20, .61)
    b += donut(-74, 65, .36) + bean(22, 87, .55, 22)
    b += gift_box(-84, -61, .48) + spark(97, -76, .7)
    return group(b, f'translate({x} {y}) scale({s})')


def bread_sharing_box(x=0, y=0, s=1):
    # A shelf-stable bakery selection, matching the shippable catalog product.
    b = ellipse(0, 92, 115, 13, '#eadbc2', stroke='none')
    b += path('M-100 -19 L-91 -95 Q-19 -116 71 -96 L102 -24 L89 14 L-89 15Z', '#d2b58c', sw=2.8)
    b += path('M-91 -95 L-78 -27 M72 -96 L88 -27 M-78 -82 Q-3 -95 64 -80', sw=1.5, stroke='#a78059')
    b += path('M-111 6 L-88 -29 Q1 -45 91 -28 L110 7 L99 75 Q1 102 -100 74Z', CREAM, sw=2.9)
    b += path('M-106 5 Q-2 31 106 4 L92 -24 Q1 -42 -86 -25Z', MILK, sw=2.1)
    b += croissant(-49, -13, .59, True)
    b += bagel(50, -16, .48)
    cookie = path('M-25 -12 C-23 -34 13 -36 23 -17 C41 -3 29 22 8 26 C-14 31 -35 12 -25 -12Z', '#c79d6b', sw=2.3)
    cookie += dots([(-12,-8), (7,-19), (16,2), (-10,12), (2,1), (8,17)], '#69452d', 2.5)
    b += group(cookie, 'translate(-9 15) rotate(10)')
    b += group(cookie, 'translate(61 21) rotate(-18) scale(.73)')
    b += path('M-109 10 Q-2 38 108 9 L103 29 Q1 59 -105 28Z', LIGHT, sw=2.5)
    b += path('M-105 28 L-99 74 Q2 102 99 75 L103 29 Q1 59 -105 28Z', '#c9a77b', sw=2.7)
    b += path('M-87 43 L-84 69 M86 44 L82 69', sw=1.6, stroke='#a47b55')
    b += path('M-20 48 L22 48 L21 87 L-20 88Z', LIGHT, sw=2)
    b += path('M-11 62 Q1 52 13 62 M-12 68 L12 68', sw=1.5) + text('BAKED',-15,80,8)
    b += text('a little joy',-39,-60,14,-4)
    b += spark(-112,-71,.6) + heart(104,-77,.35)
    return group(b, f'translate({x} {y}) scale({s})')


def cookie_tin(x=0, y=0, s=1):
    b = ellipse(3, 85, 112, 14, '#eadbc2', stroke='none')
    b += path('M-83 -6 L-81 58 Q-3 101 81 58 L83 -7Z', '#c8aa82', sw=3)
    b += ellipse(0, -5, 84, 28, '#e8d2ad', sw=3)
    b += path('M-79 6 Q-3 43 79 6 M-70 28 L-69 50 M68 28 L68 49', sw=1.7)
    # Separate leaning lid, with a little hand drawn cat seal.
    lid = ellipse(0, 0, 84, 29, CREAM, sw=3) + ellipse(0, 0, 70, 21, 'none', sw=1.5)
    lid += path('M-22 8 Q-29 -2 -20 -9 L-21 -22 L-7 -13 Q1 -16 9 -12 L21 -21 L22 -7 Q31 5 22 12 Q0 25 -22 8Z', LIGHT, sw=2)
    lid += ellipse(-7, 1, 1.8, 2.6, INK, stroke='none') + ellipse(9, 1, 1.8, 2.6, INK, stroke='none') + path('M-3 8 Q1 12 5 8', sw=1.5)
    b += group(lid, 'translate(5 -62) rotate(-16)')
    b += donut(-54, -14, .39)
    b += group(path('M-23 -13 C-20 -33 17 -35 23 -15 C39 -1 24 24 4 25 C-14 29 -31 13 -23 -13Z', '#c69b67', sw=2.6) + dots([(-13,-6),(9,-17),(15,5),(-9,12),(0,1)], '#69452d', 2.7), 'translate(34 -20)')
    b += path('M-14 37 L14 37 L14 80 L-14 81Z', BROWN, sw=1.7) + heart(0, 60, .45, LIGHT)
    return group(b, f'translate({x} {y}) scale({s})')


def coffee_gift(x=0, y=0, s=1):
    b = ellipse(0, 93, 111, 12, '#eadbc2', stroke='none')
    b += path('M-80 -53 L22 -74 L88 -36 L87 63 L-16 94 L-81 56Z', '#cfb38a', sw=3)
    b += path('M-80 -53 L-17 -18 L88 -36 M-17 -18 L-16 94', sw=2.8)
    b += path('M-44 -65 L20 -29 L20 83 L0 88 L0 -26 L-62 -62Z', '#8d6548', sw=2)
    b += path('M36 -48 L-66 -13 L-66 38 L-50 47 L-50 -5 L53 -39Z', '#8d6548', sw=2)
    b += path('M-3 -37 C-55 -35 -51 -75 -21 -67 Q-8 -60 -3 -37 C10 -87 49 -80 39 -56 Q29 -34 -3 -37Z', CREAM, sw=2.8)
    b += path('M-3 -39 Q-15 -53 -32 -55 M0 -39 Q19 -57 30 -61', sw=1.6)
    b += path('M29 2 L70 -7 L70 42 L29 52Z', LIGHT, sw=2) + bean(49, 18, 1, 27)
    b += pouch(-83, 35, .55) + bean(86, 88, .7, 55)
    return group(b, f'translate({x} {y}) scale({s})')


def build_products():
    # Lots of transparent breathing room; every image has a distinct silhouette.
    products = [
        iced_coffee(160, 167, .83),
        cat_puff(160, 141, .83),
        cake_slice(160, 158, 1.05),
        cloud_cake(160, 156, 1.03),
        matcha_roll(161, 151, 1.04),
        tiramisu(158, 151, 1.03),
        iced_coffee(160, 167, .83, 'americano'),
        hot_latte(155, 164, .94),
        iced_coffee(154, 167, .83, 'orange'),
        croissant(160, 158, 1.24, True) + ellipse(160, 226, 115, 10, '#eadbc2', stroke='none'),
        chocolate_loaf(160, 153, 1.02),
        bagel(160, 147, 1.04),
        bread_sharing_box(159, 145, .99),
        cookie_tin(160, 148, 1.04),
        coffee_gift(160, 146, 1.0),
    ]
    for i, body in enumerate(products, 1):
        save(f'products/p{i:02}', body, 320, 280)


# Small coherent icons, designed on a 64-unit square and rendered at 96px.
def icon_body(name, color=INK, fill=LIGHT):
    sw = 2.5
    def p(d, f='none', width=sw):
        return path(d, f, color, width)
    def e(x,y,rx,ry=None,f='none',width=sw):
        return ellipse(x,y,rx,ry,f,color,width)
    lib = {
      'pickup': p('M15 20 L12 51 Q30 59 52 51 L47 20 L40 20 L40 35 L23 35 L23 20Z', fill) + p('M24 20 Q31 7 39 20') + group(heart(32, 45, .35, fill),'') + p('M51 13 l4 -4 M55 21 l5 -1 M47 9 l1 -4', width=1.7),
      'shipping': p('M12 28 L50 28 L49 54 L13 54Z', fill) + p('M9 21 L54 21 L54 30 L9 30Z',fill) + p('M28 22 L35 22 L35 54 L28 54Z',fill) + p('M31 20 C6 21 13 2 25 12 L31 20 C49 -2 61 17 42 20Z', fill) + p('M10 56 Q31 62 53 56',width=1.7),
      'dineIn': e(31,49,24,7,fill) + p('M15 27 L15 42 Q31 51 48 42 L48 27Z',fill) + e(31,27,17,6,fill) + p('M20 25 C17 18 25 17 26 12 C25 5 37 5 36 12 C44 17 41 22 42 25',fill) + p('M10 14 l-4 -3 M9 21 l-5 2',width=1.6),
      'delivery': p('M16 39 L25 27 L38 28 L44 42 L54 42 L50 21 L44 20 M26 39 L32 39 L34 35 M16 39 L9 39 L10 27 L23 27',fill) + e(19,47,6,6,fill) + e(47,47,6,6,fill) + p('M13 26 L10 15 L24 15 L25 26Z',fill) + p('M17 16 L17 8 M17 16 C3 16 9 3 17 12 C24 2 31 16 17 16Z',fill) + p('M4 34 L1 34 M7 44 L2 44',width=1.7),
      'crown': p('M10 21 L21 33 L31 12 L42 33 L55 20 L48 51 Q31 57 16 50Z',fill) + e(10,19,2.7,2.7,fill,1.7) + e(31,10,2.7,2.7,fill,1.7) + e(55,18,2.7,2.7,fill,1.7) + group(heart(32,43,.34,fill),''),
      'coupon': p('M10 16 L54 16 L54 25 C43 26 43 39 54 39 L54 49 L10 49 L10 39 C21 38 21 27 10 26Z',fill) + p('M40 20 L40 24 M40 29 L40 33 M40 38 L40 44',width=1.6) + p('M24 25 L31 39',width=2) + e(24,25,1.8,1.8,fill,1.5) + e(31,39,1.8,1.8,fill,1.5),
      'points': e(24,22,14,6,fill) + p('M10 23 L10 43 C15 51 33 51 38 43 L38 23',fill) + p('M10 31 Q22 39 38 31 M10 39 Q24 47 38 39',width=1.8) + e(45,38,11,5,fill) + p('M34 38 L34 51 Q45 60 56 51 L56 38',fill) + p('M34 45 Q45 53 56 45',width=1.7),
      'address': p('M14 25 C14 1 51 1 51 25 C51 42 32 58 32 58 C32 58 14 42 14 25Z',fill) + e(32,25,8,8,fill) + p('M14 52 Q2 60 31 61 Q61 61 50 52',width=1.7),
      'order': p('M19 13 L12 13 L12 57 L52 57 L52 13 L44 13 M24 8 L40 8 L40 19 L24 19Z',fill) + p('M22 29 L42 29 M22 38 L42 38 M22 47 L36 47',width=1.9),
      'user': p('M12 56 L12 48 C13 30 51 30 52 48 L52 56Z',fill) + p('M21 18 C21 2 45 2 44 18 C45 36 20 37 21 18Z',fill) + p('M21 46 Q31 51 43 46',width=1.7),
      'coffee': p('M16 21 L20 55 Q32 61 44 55 L49 21Z',fill) + e(32,21,19,5,fill) + p('M13 16 L52 16 L52 21 L13 21Z',fill) + p('M20 8 L45 8 L49 16 L16 16Z',fill) + p('M19 31 L46 31 L44 44 L20 44Z',fill) + group(bean(32,37,.55,20,fill),''),
      'cake': e(31,52,25,6,fill) + p('M13 28 L14 46 Q32 55 50 46 L50 28Z',fill) + e(32,28,19,7,fill) + p('M14 31 Q20 29 21 38 Q25 43 27 34 Q31 29 35 37 Q40 42 43 33 Q45 31 50 31',fill,width=1.8) + p('M27 21 L27 10 L33 10 L33 21 M30 5 Q22 0 30 -5 Q38 0 30 5Z',fill,width=1.8),
      'bag': p('M17 22 L11 53 Q31 60 53 53 L47 22Z',fill) + p('M23 25 L23 17 C23 1 42 1 42 17 L42 25 M19 28 L19 32 M46 28 L46 32') + group(heart(32,44,.4,fill),''),
      'arrow': p('M18 15 Q30 28 43 32 Q30 37 18 50',width=2.7),
      'store': p('M10 26 L10 55 L53 55 L53 26 M10 26 Q4 26 7 19 L13 7 L49 7 L57 20 Q59 27 51 27 Q43 29 41 23 Q35 31 29 23 Q21 30 17 23 Q14 27 10 26Z',fill) + p('M23 55 L23 36 L40 36 L40 55 M18 8 L15 22 M29 8 L29 23 M40 8 L43 23',width=1.8),
      'theme': p('M25 9 L16 7 L4 22 L14 32 L21 26 L21 55 L46 55 L46 26 L52 31 L61 21 L49 7 L41 9 Q34 24 25 9Z',fill) + group(heart(34,40,.48,fill),''),
      'info': e(32,32,25,25,fill) + e(32,19,2,2,color,width=1.3) + p('M27 29 L32 29 L32 46 M27 46 L39 46',width=2.7),
      'wallet': p('M13 17 L46 9 L46 19 M11 19 L55 19 L55 53 L10 53 Q6 53 6 48 L6 25 Q6 19 11 19Z',fill) + p('M55 29 L38 29 Q29 37 38 44 L55 44Z',fill) + e(40,36,2,2,color,width=1),
      'logout': p('M29 9 L11 9 L11 55 L29 55 M27 32 L57 32 M45 20 L57 32 L45 44'),
      'check': p('M13 32 L26 45 L52 16',width=3.5),
      'close': p('M17 16 L48 48 M48 16 L17 48',width=3),
      'plus': p('M15 32 L49 32 M32 15 L32 49',width=3),
      'minus': p('M15 32 L49 32',width=3),
    }
    return lib[name]


def build_icons():
    names = ['pickup','shipping','dineIn','delivery','crown','coupon','points','address','order','user','coffee','cake','bag','arrow','store','theme','info','wallet','logout','check','close','plus','minus']
    for name in names:
        save(f'icons/{name}', group(icon_body(name), 'translate(5 5)'), 74, 74, 1.3)
    # Dog-theme entry illustrations have a larger view box than utility icons.
    # Puppy delivery: a little friend peeks out of the take-away coffee bag.
    b = path('M33 62 L29 132 Q75 143 119 131 L114 62Z', CREAM, sw=2.7)
    b += path('M41 68 L41 48 Q42 25 61 30 M99 67 L99 48 Q99 26 82 30', sw=2.5)
    b += puppy_face(73, 52, .29, -6)
    b += path('M32 79 Q72 91 116 78 L118 131 Q74 143 30 132Z', LIGHT, sw=2.6)
    b += path('M32 79 L41 90 L42 131 M106 83 L108 130', sw=1.2, stroke='#ad8966')
    b += ellipse(73,111,27,14,'#e0c69e',sw=1.4) + text('COFFEE',52,115,10)
    b += path('M42 78 C39 68 49 65 54 73 L54 84 M89 83 L89 74 C93 64 103 69 101 78', LIGHT, sw=2.2)
    b += spark(126,46,.5)
    save('icons/dog-delivery',b,148,148,1.3)
    # Dine in: the pup and a sandwich share a hand-thrown café plate.
    b = ellipse(74,126,52,11,CREAM,sw=2.3)
    b += puppy_face(73,58,.33,4)
    b += path('M31 91 Q72 72 113 91 L105 118 Q76 130 41 118Z', '#d6ac76', sw=2.7)
    b += path('M32 96 Q43 98 49 108 L61 100 L77 111 L91 100 L110 99 L107 112 Q78 124 39 111Z', '#b5ac72', sw=1.8)
    b += path('M34 90 Q73 74 112 90 Q106 98 99 96 Q80 101 64 96 Q48 101 34 95Z', MILK, sw=2.2)
    b += path('M39 88 C40 78 49 79 53 86 L54 94 M91 93 L92 86 C97 79 106 82 103 90', LIGHT, sw=2.1)
    b += dots([(49,113),(68,117),(92,113)],MILK,1.6)
    b += spark(18,51,.5)
    save('icons/dog-dineIn',b,148,148,1.3)
    # Pick up: the puppy waves from a warm coffee mug.
    b = puppy_face(67,51,.3,-5)
    b += path('M30 76 Q21 74 19 64 C15 49 7 48 10 63 Q9 78 27 85', LIGHT, sw=2.6)
    b += path('M27 77 L31 121 Q36 136 77 136 Q101 134 104 120 L106 77Z', '#d2b078', sw=2.8)
    b += path('M105 87 C143 75 145 125 106 122 L105 109 C128 112 127 91 106 99', CREAM, sw=2.7)
    b += ellipse(67,77,40,9,CREAM,sw=2.4)
    b += path('M37 74 C36 65 46 62 51 70 L51 81 M82 81 L83 71 C89 61 98 66 96 75', LIGHT, sw=2.1)
    b += text('COFFEE',46,112,10) + path('M34 88 L37 118', sw=1.4, stroke=LIGHT)
    b += text('hi!',112,43,14,-8) + path('M111 50 L107 58',sw=1.4)
    save('icons/dog-pickup',b,148,148,1.3)
    # Crown on dark membership banner uses cream strokes and a transparent fill.
    c = icon_body('crown', LIGHT, 'none').replace(INK, LIGHT)
    save('icons/crown-cream', group(c, 'translate(5 5)'), 74, 74, 1.3)
    for name in ['home','menu','orders','mine']:
        for active in [False, True]:
            color = INK if active else '#ac9c89'
            fill = '#ead7b7' if active else 'none'
            if name == 'home':
                b = path('M10 29 L10 54 L53 54 L53 29 L32 9Z',fill,color,2.5) + path('M24 54 L24 37 L39 37 L39 54', 'none', color,2.2) + path('M6 31 L32 7 L57 31','none',color,2.5)
            else:
                b = icon_body({'menu':'bag','orders':'order','mine':'user'}[name],color,fill)
                # Detail helpers share the icon tint, including the line-art heart.
                b = b.replace(INK,color).replace(BROWN,color)
            save(f'tab/{name}{"-active" if active else ""}', group(b,'translate(5 5)'),74,74,1.3)


def build_empty_states():
    b = pouch(155, 126, 1.34) + path('M93 206 Q156 217 219 206',sw=2,opacity='.45') + spark(224,87,.9) + heart(83,88,.47)
    b += path('M138 122 Q142 115 147 122 M164 122 Q169 114 173 122 M150 142 Q156 135 162 142', sw=2.4)
    save('illustrations/empty-cart',b,310,250)
    b = path('M83 60 L222 60 L222 206 L83 206Z',LIGHT,sw=3.4) + path('M123 43 L181 43 L181 77 L123 77Z',CREAM,sw=3)
    b += path('M107 102 L199 102 M107 118 L185 118 M107 136 L170 136 M107 180 L133 180',sw=2.2,opacity='.6')
    b += cat_puff(200,172,.42) + spark(69,105,.8) + heart(246,69,.5)
    save('illustrations/empty-order',b,310,250)
    b = group(icon_body('coupon'), 'translate(54 38) scale(3)')
    b += spark(247,64,.9) + spark(67,201,.8) + heart(241,204,.5)
    save('illustrations/empty-coupon',b,310,250)


def contact_sheet():
    names = ['illustrations/cat-hero','illustrations/cloud-hero','illustrations/dog-hero'] + [f'products/p{i:02}' for i in range(1,16)]
    width, cellw, cellh = 1440, 240, 240
    sheet = Image.new('RGB',(width, cellh*3 + 420),'#faf3e3')
    d = ImageDraw.Draw(sheet)
    # Full-size hero row first, then a product grid.
    for i,name in enumerate(names[:3]):
        im = Image.open(OUT/f'{name}.png').convert('RGBA')
        im.thumbnail((460,365))
        x = i*480+(480-im.width)//2
        y = 20+(365-im.height)//2
        sheet.paste(im,(x,y),im)
        d.text((i*480+18,390),name,fill=INK)
    for i,name in enumerate(names[3:]):
        im = Image.open(OUT/f'{name}.png').convert('RGBA')
        im.thumbnail((230,208))
        x = (i%6)*cellw + (cellw-im.width)//2
        y = 420+(i//6)*cellh
        sheet.paste(im,(x,y),im)
        d.text(((i%6)*cellw+14,y+211),name,fill=INK)
    target=ROOT/'artifacts'/'artwork-contact-sheet.png'
    target.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(target,optimize=True)
    icons = sorted((OUT/'icons').glob('*.png')) + sorted((OUT/'tab').glob('*.png'))
    rows = math.ceil(len(icons) / 8)
    icon_sheet = Image.new('RGB',(960,rows*120),'#faf3e3')
    draw = ImageDraw.Draw(icon_sheet)
    for i, file in enumerate(icons):
        im = Image.open(file).convert('RGBA')
        im.thumbnail((78,78))
        x = (i%8)*120 + (120-im.width)//2
        y = (i//8)*120 + 8
        icon_sheet.paste(im,(x,y),im)
        draw.text(((i%8)*120+4,y+82),file.stem,fill=INK)
    icon_sheet.save(ROOT/'artifacts'/'icon-contact-sheet.png',optimize=True)


if __name__ == '__main__':
    build_heroes()
    build_products()
    build_icons()
    build_empty_states()
    contact_sheet()
    files=list(OUT.rglob('*.png'))
    total=sum(f.stat().st_size for f in files)
    print(f'Generated {len(files)} transparent PNG assets, {total:,} bytes.')
    print(ROOT/'artifacts'/'artwork-contact-sheet.png')
