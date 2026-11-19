"""Build MegaCSV logo concepts as clean SVG paths (black first).

Run: python3 design/logo/build.py   -> writes design/logo/concepts/*.svg
Wordmarks are Hanken Grotesk (SIL OFL) outlines, so no live <text>.
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).parent
OUT = HERE / "concepts"
OUT.mkdir(exist_ok=True)
INK = "#000"


def font(weight):
    f = TTFont(HERE / "fonts" / "HankenGrotesk.ttf")
    return instantiateVariableFont(f, {"wght": weight})


def text_path(f, s, size, x, baseline, tracking=0.0):
    """Outline `s` at `size` px with its baseline at y=baseline. Returns (d, width)."""
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f["head"].unitsPerEm
    k = size / upm
    pen = SVGPathPen(gs)
    cx = 0.0
    for ch in s:
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (k, 0, 0, -k, x + cx * k, baseline))
        gs[g].draw(tp)
        cx += gs[g].width + tracking * upm
    return pen.getCommands(), (cx - tracking * upm) * k


def svg(d, w=256, h=256, fill=INK, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'{extra}<path fill="{fill}" fill-rule="evenodd" d="{d}"/></svg>\n')


def rrect(x0, y0, x1, y1, r):
    return (f"M{x0+r},{y0}H{x1-r}A{r},{r} 0 0 1 {x1},{y0+r}V{y1-r}A{r},{r} 0 0 1 {x1-r},{y1}"
            f"H{x0+r}A{r},{r} 0 0 1 {x0},{y1-r}V{y0+r}A{r},{r} 0 0 1 {x0+r},{y0}Z")


# A: Cell comma. A square cell grows a comma's tail: the separator CSV is named after.
COMMA = ("M92,26H164A14,14 0 0 1 178,40V126"
         "C178,178 150,212 102,232L90.5,212C122,196 136,170 136,126"
         "H92A14,14 0 0 1 78,112V40A14,14 0 0 1 92,26Z")

# B: Overflow. Rows inside a frame, and one more row that doesn't fit.
OVERFLOW = (rrect(40, 24, 216, 152, 22) + rrect(58, 42, 198, 134, 6)
            + rrect(80, 66, 176, 86, 6) + rrect(80, 100, 176, 120, 6)
            # the frame's bottom edge is open where the rows keep going
            + "M80,134H176V152H80Z"
            + rrect(80, 166, 176, 186, 6) + rrect(80, 200, 176, 220, 6) + rrect(80, 234, 176, 254, 6))

# C: Table m. A lowercase m drawn as a table: a header row over two columns.
MCOMMA = ("M40,88A40,40 0 0 1 80,48H176A40,40 0 0 1 216,88V96H40Z"
          "M40,112H76V208H40Z M110,112H146V208H110Z M180,112H216V208H180Z")

# D: Fill handle. Excel's selected cell, with the handle you drag to extend it.
HANDLE = (rrect(36, 36, 204, 204, 10) + rrect(58, 58, 182, 182, 2)
          + "M176,176H236V236H176Z" + "M188,188H224V224H188Z")


def lockup(name, symbol_d, f, gap=34, size=124):
    """Symbol (256 box) + wordmark 'MegaCSV', cap height optically matched."""
    d, w = text_path(f, "MegaCSV", size, 256 + gap, 128 + size * 0.35, tracking=-0.02)
    total = int(256 + gap + w + 16)
    (OUT / f"{name}-lockup.svg").write_text(svg(symbol_d + d, w=total))


f600 = font(600)
for name, d in [("a-cell-comma", COMMA), ("b-overflow", OVERFLOW), ("c-table-m", MCOMMA), ("d-fill-handle", HANDLE)]:
    (OUT / f"{name}-symbol.svg").write_text(svg(d))
    lockup(name, d, f600)

# E: Wordmark. "mega,csv": the name written the way the file is, the comma set as a cell-comma in cobalt.
size, base = 150, 170
f650 = font(650)
mega, w1 = text_path(f650, "mega", size, 12, base, tracking=-0.03)
k = 0.30
cx = 12 + w1 + 10
comma = f'<path fill="#2449f5" transform="translate({cx - 78 * k:.2f},{base - 126 * k:.2f}) scale({k})" d="{COMMA}"/>'
csv_x = cx + 100 * k + 12
csv_d, w2 = text_path(f650, "csv", size, csv_x, base, tracking=-0.03)
W = int(csv_x + w2 + 12)
(OUT / "e-wordmark-lockup.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 256" width="{W}" height="256">'
    f'<path fill="{INK}" d="{mega}{csv_d}"/>{comma}</svg>\n')
# its symbol for small sizes: lowercase m + cell comma
k2 = 0.36
_, mw = text_path(f650, "m", 190, 0, 0)
mx = (256 - (mw + 8 + 100 * k2)) / 2
m_d, _ = text_path(f650, "m", 190, mx, 186)
(OUT / "e-wordmark-symbol.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
    f'<path fill="{INK}" d="{m_d}"/><path fill="#2449f5" transform="translate({mx + mw + 8 - 78 * k2:.2f},{186 - 126 * k2:.2f}) scale({k2})" d="{COMMA}"/></svg>\n')
print("wrote", sorted(p.name for p in OUT.iterdir()))
