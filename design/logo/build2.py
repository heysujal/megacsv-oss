"""Round 2 logo concepts: richer, story-led marks. Writes design/logo/round2/*.svg"""
import math
from pathlib import Path

from build import COMMA, font, text_path

HERE = Path(__file__).parent
OUT = HERE / "round2"
OUT.mkdir(exist_ok=True)

COBALT = "#2449f5"
TINT = "#9db0ff"
MID = "#5b78f8"
NAVY = "#0e1a5c"
INK = "#17181a"


def poly(pts):
    return "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"


def p(d, fill):
    return f'<path fill="{fill}" d="{d}"/>'


def svg(body, w=256, h=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n'


def rbar(x0, x1, y, h):
    r = h / 2
    if x1 - x0 < h:
        x1 = x0 + h
    return (f"M{x0 + r:.2f},{y:.2f}H{x1 - r:.2f}A{r},{r} 0 0 1 {x1 - r:.2f},{y + h:.2f}"
            f"H{x0 + r:.2f}A{r},{r} 0 0 1 {x0 + r:.2f},{y:.2f}Z")


def spans(polygon, y):
    """x-intervals where the horizontal line at y is inside polygon (even-odd)."""
    xs = []
    n = len(polygon)
    for i in range(n):
        (x0, y0), (x1, y1) = polygon[i], polygon[(i + 1) % n]
        if (y0 <= y < y1) or (y1 <= y < y0):
            xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
    xs.sort()
    return list(zip(xs[::2], xs[1::2]))


def inside(polygon, x, y):
    return any(a <= x <= b for a, b in spans(polygon, y))


def bez(p0, p1, p2, p3, n=24):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d
                  for a, b, c, d in zip(p0, p1, p2, p3)) for t in (i / n for i in range(1, n + 1))]


# ---------- A: Fanfold M ----------
# An endless printout folded into an M. Front faces carry alternating bands (rows of
# green-bar paper, in cobalt); back faces are navy, so the folds read in depth.
def band_quad(top, bot, y0, y1):
    """Slice of the quad between y0 and y1; top/bot are ((xl, y), (xr, y)) edges."""
    (tl, ty), (tr, _) = top
    (bl, by), (br, _) = bot
    def at(y):
        k = (y - ty) / (by - ty)
        return tl + (bl - tl) * k, tr + (br - tr) * k
    a0, b0 = at(y0)
    a1, b1 = at(y1)
    return poly([(a0, y0), (b0, y0), (b1, y1), (a1, y1)])


def striped(top, bot, colors, n):
    ty, by = top[0][1], bot[0][1]
    out = ""
    for i in range(n):
        y0 = ty + (by - ty) * i / n
        y1 = ty + (by - ty) * (i + 1) / n
        out += p(band_quad(top, bot, y0, y1), colors[i % 2])
    return out


T, B, V = 40, 216, 180  # top fold, bottom, centre fold
W = 46  # strip width
L0, R0 = 30, 226
fan = ""
fan += p(poly([(L0, T), (L0 + W, T), (L0 + W, B), (L0, B)]), NAVY)                       # left leg (back)
fan += striped(((L0, T), (L0 + W, T)), ((128 - W / 2, V), (128 + W / 2, V)), [COBALT, MID], 7)  # left diagonal (front)
fan += p(poly([(128 - W / 2, V), (128 + W / 2, V), (R0, T), (R0 - W, T)]), NAVY)        # right diagonal (back)
fan += striped(((R0 - W, T), (R0, T)), ((R0 - W, B), (R0, B)), [COBALT, MID], 7)          # right leg (front)
FANFOLD = fan

# ---------- B: Iceberg ----------
# Excel sees the tip. The tip is ink above the waterline; the rest of the file is rows below it.
tip = poly([(116, 30), (134, 56), (146, 50), (170, 82), (188, 100), (64, 100), (88, 72), (102, 68)])
widths = [(70, 192), (50, 210), (40, 226), (54, 232), (46, 214), (64, 204), (88, 208), (104, 182), (126, 166)]
ice = p(tip, INK)
y = 112
for i, (a, b) in enumerate(widths):
    ice += p(rbar(a, b, y, 12), COBALT if i % 2 == 0 else MID)
    y += 16.5
ICEBERG = ice

# ---------- C: Scanline M ----------
# An M rendered as rows of a file; one row is the match you were looking for.
M = [(32, 214), (32, 40), (90, 40), (128, 112), (166, 40), (224, 40), (224, 214), (178, 214), (178, 122),
     (148, 182), (108, 182), (78, 122), (78, 214)]
scan = ""
rows = 9
h = 14
step = (214 - 40 - h) / (rows - 1)
for i in range(rows):
    yy = 40 + i * step
    for a, b in spans(M, yy + h / 2):
        found = i == 5
        scan += p(rbar(a - (10 if found else 0), b + (10 if found else 0), yy, h), INK if found else COBALT)
SCANLINE = scan

# ---------- D: Mosaic comma ----------
# The comma (the C in CSV) built from hundreds of cells: one big file, many small values.
def comma_poly(s=1.18, ox=-22, oy=-14):
    pts = [(92, 26), (164, 26), (178, 40), (178, 126)]
    pts += bez((178, 126), (178, 178), (150, 212), (102, 232))
    pts += [(90.5, 212)]
    pts += bez((90.5, 212), (122, 196), (136, 170), (136, 126))
    pts += [(92, 126), (78, 112), (78, 40)]
    return [(x * s + ox, y * s + oy) for x, y in pts]


CP = comma_poly()
cell, gap = 13, 3.5
mosaic = ""
shades = [COBALT, COBALT, MID, TINT, COBALT, NAVY]
for gy in range(16):
    for gx in range(16):
        x0, y0 = 6 + gx * (cell + gap), 4 + gy * (cell + gap)
        if inside(CP, x0 + cell / 2, y0 + cell / 2):
            k = (gx * 7 + gy * 13 + (gx * gy) % 5) % len(shades)
            mosaic += f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{cell}" height="{cell}" rx="2.5" fill="{shades[k]}"/>'
MOSAIC = mosaic

# ---------- E: Seal ----------
# A round seal for the privacy promise: the cell comma at the centre, the promise around it.
f700 = font(700)


def ring_text(s, r, size, cx=128, cy=128):
    gs = f700.getGlyphSet()
    cmap = f700.getBestCmap()
    k = size / f700["head"].unitsPerEm
    raw = [gs[cmap[ord(c)]].width * k for c in s]
    spare = (2 * math.pi * r - sum(raw)) / len(s)  # spread letters to fill the full circle
    out, a = "", -90.0
    for c, w in zip(s, raw):
        w2 = w + spare
        mid = a + math.degrees((w2 / 2) / r)
        d, _ = text_path(f700, c, size, -w / 2, 0)
        if c != " ":
            out += (f'<path fill="{INK}" transform="translate({cx},{cy}) rotate({mid + 90:.2f}) '
                    f'translate(0,{-r:.2f})" d="{d}"/>')
        a += math.degrees(w2 / r)
    return out


ring = ("M128,4A124,124 0 1 1 127.99,4Z M128,14A114,114 0 1 0 128.01,14Z"
        "M128,64A64,64 0 1 1 127.99,64Z")
seal = f'<path fill="{INK}" fill-rule="evenodd" d="M128,4A124,124 0 1 1 127.99,4Z M128,12A116,116 0 1 0 128.01,12Z"/>'
seal += f'<circle cx="128" cy="128" r="74" fill="{COBALT}"/>'
seal += f'<path fill="#fff" transform="translate(128,128) scale(0.62) translate(-128,-129)" d="{COMMA}"/>'
seal += ring_text("OPEN ANY CSV · NOTHING UPLOADED · FREE FOREVER · ", 91, 16.5)
SEAL = seal


# ---------- lockups ----------
f600 = font(600)


def lockup(name, body, gap=30, size=118):
    d, w = text_path(f600, "MegaCSV", size, 256 + gap, 128 + size * 0.35, tracking=-0.02)
    W = int(256 + gap + w + 16)
    (OUT / f"{name}-lockup.svg").write_text(svg(body + p(d, INK), w=W))


for name, body in [("a-fanfold-m", FANFOLD), ("b-iceberg", ICEBERG), ("d-mosaic-comma", MOSAIC), ("e-seal", SEAL)]:
    (OUT / f"{name}-symbol.svg").write_text(svg(body))
    lockup(name, body)
print("wrote", sorted(x.name for x in OUT.iterdir()))
