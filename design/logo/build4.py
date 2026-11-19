"""Round 3 logo concepts: identity-led. Writes design/logo/round4/*.svg

Brand idea: MegaCSV is the biggest thing in the ocean of data, and it is calm.
"""
import math
from pathlib import Path

from build import font, text_path

HERE = Path(__file__).parent
OUT = HERE / "round4"
OUT.mkdir(exist_ok=True)

COBALT, MID, TINT, NAVY, INK, WHITE = "#2449f5", "#5b78f8", "#b9c6ff", "#0c1652", "#17181a", "#ffffff"


def svg(body, w=256, h=256, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'{"<defs>" + defs + "</defs>" if defs else ""}{body}</svg>\n')


def poly(pts):
    return "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"


# ---------------------------------------------------------------- A: Blue whale
# The largest animal alive, in cobalt. Its throat grooves are rows of data.
WHALE_BODY = ("M58,130C92,102 140,84 190,86C218,87 236,99 242,116C246,129 238,141 222,147"
              "C196,158 150,164 112,157C90,153 72,146 60,140Z")
WHALE_TAIL = "M66,128C52,120 40,106 33,88C20,101 18,120 29,134C19,149 22,168 35,179C42,160 54,147 66,140Z"
WHALE_FIN = "M150,156C147,171 137,183 121,190C141,189 160,179 170,160Z"
grooves = "".join(
    f'<path d="M{132 + i * 9},{163 - i * 7.2}C{170 + i * 6},{163 - i * 7.6} {206 + i * 3},{155 - i * 7.4} {236},{138 - i * 7.6}" '
    f'fill="none" stroke="{TINT}" stroke-width="4.2" stroke-linecap="round"/>' for i in range(4))
WHALE_DEFS = f'<clipPath id="wb"><path d="{WHALE_BODY}"/></clipPath>'
WHALE = (f'<path fill="{COBALT}" d="{WHALE_TAIL}"/><path fill="{COBALT}" d="{WHALE_BODY}"/>'
         f'<g clip-path="url(#wb)">{grooves}</g>'
         f'<path fill="{NAVY}" d="{WHALE_FIN}"/><circle cx="213" cy="113" r="5" fill="{NAVY}"/>')

# ---------------------------------------------------------------- B: Slab
# A huge block of rows seen in isometric; one slab slides out: the rows you need, exported.
def iso(x, y, z, ox=106, oy=70, s=1.0):
    return (ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s)


def slab(x0, y0, z0, a, b, t, top, left, right):
    p = lambda x, y, z: iso(x, y, z)
    T = [p(x0, y0, z0 + t), p(x0 + a, y0, z0 + t), p(x0 + a, y0 + b, z0 + t), p(x0, y0 + b, z0 + t)]
    L = [p(x0, y0 + b, z0 + t), p(x0 + a, y0 + b, z0 + t), p(x0 + a, y0 + b, z0), p(x0, y0 + b, z0)]
    R = [p(x0 + a, y0, z0 + t), p(x0 + a, y0 + b, z0 + t), p(x0 + a, y0 + b, z0), p(x0 + a, y0, z0)]
    return (f'<path fill="{left}" d="{poly(L)}"/><path fill="{right}" d="{poly(R)}"/>'
            f'<path fill="{top}" d="{poly(T)}"/>')


SIDE = 92
SLAB = ""
for i in range(6):
    z = -78 + i * 22
    out = 46 if i == 3 else 0
    if i == 3:
        SLAB += slab(out, 0, z, SIDE, SIDE, 14, COBALT, NAVY, NAVY)
    else:
        SLAB += slab(0, 0, z, SIDE, SIDE, 14, TINT, MID, COBALT)

# ---------------------------------------------------------------- C: Halftone M
# An M printed in halftone dots: big file, made of many small values; dots fade at the edges.
M_POLY = [(40, 210), (40, 46), (88, 46), (128, 116), (168, 46), (216, 46), (216, 210), (176, 210), (176, 124),
          (146, 176), (110, 176), (80, 124), (80, 210)]


def seg_dist(px, py, a, b):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def inside(poly_, x, y):
    c = False
    n = len(poly_)
    for i in range(n):
        (x0, y0), (x1, y1) = poly_[i], poly_[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


HALF = ""
step = 16
for gy in range(15):
    for gx in range(15):
        x, y = 16 + gx * step, 16 + gy * step
        d = min(seg_dist(x, y, M_POLY[i], M_POLY[(i + 1) % len(M_POLY)]) for i in range(len(M_POLY)))
        d = d if not inside(M_POLY, x, y) else -d
        r = 7.2 if d < -4 else max(0, 6.2 - (d + 4) * 0.33)
        if r > 0.9:
            HALF += f'<circle cx="{x}" cy="{y}" r="{r:.2f}" fill="{COBALT if d < 2 else MID}"/>'

# ---------------------------------------------------------------- D: Lens
# A round window of rows; inside the lens the rows swell: find any row in a giant file.
LENS_DEFS = ('<clipPath id="disc"><circle cx="128" cy="128" r="112"/></clipPath>'
             '<clipPath id="lens"><circle cx="150" cy="140" r="58"/></clipPath>'
             '<clipPath id="notlens"><path clip-rule="evenodd" d="M0,0H256V256H0Z M150,82A58,58 0 1 0 150.01,82Z"/></clipPath>')
rows = "".join(f'<rect x="0" y="{22 + i * 16}" width="256" height="7" rx="3.5" fill="{COBALT}"/>' for i in range(14))
lens_rows = ""
for i in range(14):
    y = 22 + i * 16 + 3.5
    yy = 140 + (y - 140) * 1.55  # magnified around the lens centre
    lens_rows += f'<rect x="80" y="{yy - 6.5:.2f}" width="140" height="13" rx="6.5" fill="{NAVY if i == 7 else COBALT}"/>'
LENS = (f'<g clip-path="url(#disc)"><g clip-path="url(#notlens)">{rows}</g></g>'
        f'<circle cx="150" cy="140" r="58" fill="{TINT}"/>'
        f'<g clip-path="url(#lens)">{lens_rows}</g>'
        f'<path fill="none" stroke="{NAVY}" stroke-width="8" d="M150,82A58,58 0 1 0 150.01,82Z"/>')

# ---------------------------------------------------------------- E: Ribbon M
# One continuous ribbon folded into an M; the inner faces are shaded so the folds have depth.
W_ = 44
RIB = (f'<path fill="{COBALT}" d="M36,212V64A22,22 0 0 1 76,52L128,128L180,52A22,22 0 0 1 220,64V212H176V126L146,170H110L80,126V212Z"/>'
       f'<path fill="{NAVY}" d="M76,52L128,128L110,170L80,126Z"/>'
       f'<path fill="{MID}" d="M180,52L128,128L146,170L176,126Z"/>')

# ---------------------------------------------------------------- F: Fluke
# The whale's tail rising out of the rows: the big one surfacing from your data.
FLUKE = ("M128,138C116,124 92,114 62,110C46,108 34,102 24,92C32,118 56,138 92,146"
         "C106,149 116,156 119,168V196H137V168C140,156 150,149 164,146"
         "C200,138 224,118 232,92C222,102 210,108 194,110C164,114 140,124 128,138Z")
waves = "".join(f'<rect x="{x0}" y="{y}" width="{w}" height="9" rx="4.5" fill="{c}"/>' for x0, y, w, c in [
    (34, 196, 188, COBALT), (58, 214, 140, MID), (86, 232, 84, TINT)])
FLUKE_MARK = f'<path fill="{NAVY}" d="{FLUKE}"/>' + waves

G2 = grooves.replace(TINT, COBALT)
WHALE_TILE_DEFS = '<clipPath id="wb2"><path d="' + WHALE_BODY + '"/></clipPath>'
WHALE_TILE = (f'<rect width="256" height="256" rx="58" fill="{COBALT}"/>'
              f'<g transform="translate(128,128) scale(0.78) translate(-132,-134)">'
              f'<path fill="{WHITE}" d="{WHALE_TAIL}"/><path fill="{WHITE}" d="{WHALE_BODY}"/>'
              f'<g clip-path="url(#wb2)">{G2}</g>'
              f'<path fill="{TINT}" d="{WHALE_FIN}"/><circle cx="213" cy="113" r="5" fill="{COBALT}"/></g>')

CONCEPTS = {
    "a-blue-whale": (WHALE, WHALE_DEFS),
    "a2-whale-tile": (WHALE_TILE, WHALE_TILE_DEFS),
    "b-slab": (SLAB, ""),
    "c-halftone-m": (HALF, ""),
    "f-fluke": (FLUKE_MARK, ""),
}

f600 = font(600)
for name, (body, defs) in CONCEPTS.items():
    (OUT / f"{name}-symbol.svg").write_text(svg(body, defs=defs))
    d, w = text_path(f600, "MegaCSV", 118, 256 + 26, 128 + 118 * 0.35, tracking=-0.02)
    (OUT / f"{name}-lockup.svg").write_text(svg(body + f'<path fill="{INK}" d="{d}"/>', w=int(256 + 26 + w + 16), defs=defs))
print("wrote", len(CONCEPTS), "concepts")
