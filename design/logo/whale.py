"""The MegaCSV whale, v2: one continuous body, both flippers, small dorsal fin, even throat grooves.

Writes design/logo/whale/whale-v2.svg (+ tile and lockup). Every join between curves is tangent-continuous
except the fluke notch and fluke tips, which are meant to be sharp.
"""
from pathlib import Path

from build import font, text_path

HERE = Path(__file__).parent
OUT = HERE / "whale"
OUT.mkdir(exist_ok=True)
COBALT, TINT, NAVY, INK, WHITE = "#2449f5", "#b9c6ff", "#0c1652", "#17181a", "#ffffff"

# Body + tail as one outline, clockwise from the snout.
BODY = (
    "M242,122"
    "C242,100 226,82 196,80"          # forehead
    "C160,78 96,108 70,126"           # back, easing into the tail stock
    "C58,122 45,108 35,88"            # upper fluke leading edge (clean concave join at the stock)
    "C22,101 19,120 30,134"           # rounded upper lobe to the notch
    "C20,149 23,168 36,179"           # rounded lower lobe
    "C44,160 55,148 70,143"           # lower fluke leading edge back to the stock
    "C92,148 112,164 140,167"         # belly, one smooth sweep down
    "C172,172 210,164 228,150"        # throat
    "C238,142 242,134 242,122Z"       # chin to snout
)
# Small dorsal fin far back on the spine, as on a real blue whale (drawn behind the body).
DORSAL = "M106,104C103,98 99,95 93,94C95,99 95,104 94,109Z"
# Far flipper: lighter, shorter, tucked behind the near one.
FAR_FIN = "M192,156C188,172 174,184 154,191C150,192 149,189 152,187C164,178 170,168 172,160C178,155 186,153 192,156Z"
# Near flipper: long and slender with a rounded tip.
NEAR_FIN = "M174,160C168,178 152,192 128,200C124,201 122,198 125,195C140,184 148,172 150,164C158,158 168,156 174,160Z"
EYE = (214, 108, 4.6)
MID = "#6e88fa"


THROAT = ((140, 167), (172, 172), (210, 164), (228, 150))


def split_after(pts, t):
    """The part of a cubic Bezier from parameter t to 1 (de Casteljau)."""
    lerp = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    p0, p1, p2, p3 = pts
    a, b, c = lerp(p0, p1), lerp(p1, p2), lerp(p2, p3)
    d, e = lerp(a, b), lerp(b, c)
    return (lerp(d, e), e, c, p3)


def grooves(color):
    """Three throat pleats: exact copies of the throat curve 8px apart, each starting a little further forward."""
    out = ""
    for i in range(3):
        dy = 10 + i * 8
        seg = split_after([(x, y - dy) for x, y in THROAT], 0.16 + i * 0.12)
        (x0, y0), (x1, y1), (x2, y2), (x3, y3) = seg
        out += (f'<path d="M{x0:.1f},{y0:.1f}C{x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f} {x3 - 4:.1f},{y3 + 3:.1f}" '
                f'fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round"/>')
    return out


def whale(body=COBALT, fin=NAVY, far=MID, groove=TINT, eye=NAVY, uid="w"):
    return (f'<path fill="{far}" d="{FAR_FIN}"/><path fill="{body}" d="{DORSAL}"/>'
            f'<path fill="{body}" d="{BODY}"/>'
            f'{grooves(groove)}'
            f'<circle cx="{EYE[0]}" cy="{EYE[1]}" r="{EYE[2]}" fill="{eye}"/>'
            f'<path fill="{fin}" d="{NEAR_FIN}"/>')


def svg(body, w=256, h=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n'


main = whale()
(OUT / "whale-v2.svg").write_text(svg(main))
tile = (f'<rect width="256" height="256" rx="58" fill="{COBALT}"/>'
        f'<g transform="translate(128,128) scale(0.82) translate(-134,-140)">'
        + whale(body=WHITE, fin=TINT, far="#8ea2ff", groove=COBALT, eye=COBALT, uid="wt") + "</g>")
(OUT / "whale-v2-tile.svg").write_text(svg(tile))
f600 = font(600)
d, w = text_path(f600, "MegaCSV", 112, 256 + 20, 128 + 112 * 0.35, tracking=-0.02)
(OUT / "whale-v2-lockup.svg").write_text(svg(main + f'<path fill="{INK}" d="{d}"/>', w=int(256 + 20 + w + 16)))
print("wrote whale-v2")
