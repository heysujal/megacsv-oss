"""Build the MegaCSV whale logo kit: final SVG masters, colour variants, lockups and the web icon set.

Run: python3 design/logo/kit.py   -> design/logo/kit/
Rasters are rendered by the logo-design skill's render_png.py (Chrome backend on this machine).
"""
import json
import math
import shutil
import subprocess
from pathlib import Path

from build import font, text_path
from whale import BODY, DORSAL, EYE, FAR_FIN, NEAR_FIN, THROAT, split_after

HERE = Path(__file__).parent
KIT = HERE / "kit"
SVG, PNG, WEB = KIT / "svg", KIT / "png", KIT / "web"
for d in (SVG, PNG, WEB):
    d.mkdir(parents=True, exist_ok=True)
RENDER = Path.home() / ".claude/skills/logo-design/scripts/render_png.py"

COBALT, NAVY, MID, TINT, INK, WHITE, GROUND = "#2449f5", "#0c1652", "#6e88fa", "#b9c6ff", "#17181a", "#ffffff", "#f3f4f2"
FAR_ON_COBALT = "#8ea2ff"


# ---------------------------------------------------------------- geometry
def bez_point(p, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p
    m = 1 - t
    return (m**3 * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t**3 * x3,
            m**3 * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t**3 * y3)


def groove_curves():
    """The three throat pleats as cubic Beziers (same construction as whale.py)."""
    out = []
    for i in range(3):
        dy = 10 + i * 8
        a, b, c, d = split_after([(x, y - dy) for x, y in THROAT], 0.16 + i * 0.12)
        out.append((a, b, c, (d[0] - 4, d[1] + 3)))
    return out


def stroke_outline(curve, w=4.0, n=40):
    """A filled outline of a round-capped stroke along a cubic, so masters contain no strokes."""
    pts = [bez_point(curve, i / n) for i in range(n + 1)]
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        ax, ay = pts[max(i - 1, 0)]
        bx, by = pts[min(i + 1, n)]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L * w / 2, dx / L * w / 2
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    r = w / 2
    d = f"M{left[0][0]:.2f},{left[0][1]:.2f}"
    d += "".join(f"L{x:.2f},{y:.2f}" for x, y in left[1:])
    d += f"A{r},{r} 0 0 1 {right[-1][0]:.2f},{right[-1][1]:.2f}"
    d += "".join(f"L{x:.2f},{y:.2f}" for x, y in reversed(right[:-1]))
    d += f"A{r},{r} 0 0 1 {left[0][0]:.2f},{left[0][1]:.2f}Z"
    return d


GROOVES = "".join(stroke_outline(c) for c in groove_curves())
ex, ey, er = EYE
EYE_D = f"M{ex - er},{ey}A{er},{er} 0 1 0 {ex + er},{ey}A{er},{er} 0 1 0 {ex - er},{ey}Z"


# ---------------------------------------------------------------- artwork
def whale(body, near, far, groove, eye):
    return (f'<path fill="{far}" d="{FAR_FIN}"/><path fill="{body}" d="{DORSAL}"/><path fill="{body}" d="{BODY}"/>'
            f'<path fill="{groove}" d="{GROOVES}"/><path fill="{eye}" d="{EYE_D}"/><path fill="{near}" d="{NEAR_FIN}"/>')


def whale_one_color(color, uid):
    """Single colour: grooves and eye knocked out, near flipper separated from the body by a gap."""
    return (f'<defs><mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">'
            f'<path fill="#fff" d="{BODY}"/><path fill="#fff" d="{DORSAL}"/><path fill="#fff" d="{FAR_FIN}"/>'
            f'<path fill="#000" d="{GROOVES}"/><path fill="#000" d="{EYE_D}"/>'
            f'<path fill="#000" stroke="#000" stroke-width="7" stroke-linejoin="round" d="{NEAR_FIN}"/>'
            f'<path fill="#fff" d="{NEAR_FIN}"/></mask></defs>'
            f'<rect width="256" height="256" fill="{color}" mask="url(#{uid})"/>')


def whale_small(fg, eye):
    """Simplified silhouette for 16-48 px: body, tail and near flipper; no grooves, back fin or far flipper."""
    return f'<path fill="{fg}" d="{BODY}"/><path fill="{fg}" d="{NEAR_FIN}"/><path fill="{eye}" d="{EYE_D}"/>'


def place(body, scale, rotate=0.0, cx=128, cy=128, src=(140, 128)):
    return (f'<g transform="translate({cx},{cy}) rotate({rotate}) scale({scale}) '
            f'translate({-src[0]},{-src[1]})">{body}</g>')


def svg(body, w=256, h=256, title="MegaCSV"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
            f'<title>{title}</title>{body}</svg>\n')


def write(name, body, **kw):
    (SVG / name).write_text(svg(body, **kw))
    return SVG / name


FULL = whale(COBALT, NAVY, MID, TINT, NAVY)
ON_COBALT = whale(WHITE, TINT, FAR_ON_COBALT, COBALT, COBALT)
ON_DARK = whale(COBALT, TINT, MID, TINT, NAVY)

write("whale.svg", FULL)
write("whale-on-cobalt.svg", f'<rect width="256" height="256" fill="{COBALT}"/>' + ON_COBALT)
write("whale-on-dark.svg", f'<rect width="256" height="256" fill="#111214"/>' + ON_DARK)
write("whale-reversed.svg", ON_COBALT)  # white whale with cobalt details, for cobalt backgrounds
write("whale-one-color-cobalt.svg", whale_one_color(COBALT, "m1"))
write("whale-one-color-black.svg", whale_one_color("#000000", "m2"))
write("whale-one-color-white.svg", whale_one_color(WHITE, "m3"))
write("whale-small.svg", whale_small(COBALT, WHITE))

# Tiles. Small sizes use the simplified whale, tilted so it fills the square; large sizes the full whale.
SMALL_TILE = f'<rect width="256" height="256" rx="56" fill="{COBALT}"/>' + place(whale_small(WHITE, COBALT), 1.0, -16)
APP_TILE = f'<rect width="256" height="256" rx="56" fill="{COBALT}"/>' + place(ON_COBALT, 0.84, -10)
FULL_BLEED = f'<rect width="256" height="256" fill="{COBALT}"/>' + place(ON_COBALT, 0.8, -10)  # iOS masks it
MASKABLE = f'<rect width="256" height="256" fill="{COBALT}"/>' + place(ON_COBALT, 0.66, -10)  # inside 80% safe zone
write("favicon.svg", SMALL_TILE)
write("app-icon.svg", APP_TILE)
write("app-icon-full-bleed.svg", FULL_BLEED)
write("app-icon-maskable.svg", MASKABLE)

# Lockups. The wordmark is Hanken Grotesk SemiBold outlines (SIL Open Font License).
f600 = font(600)


def wordmark(fill, size, x, baseline):
    d, w = text_path(f600, "MegaCSV", size, x, baseline, tracking=-0.02)
    return f'<path fill="{fill}" d="{d}"/>', w


def horizontal(art, word_fill):
    # whale occupies roughly x 19-246, y 80-200; crop the symbol box to it and size the cap height to the body
    # after the shift the body spans y 20-107; centre the cap height on it, 24 px after the snout
    word, w = wordmark(word_fill, 84, 256, 93)
    return f'<g transform="translate(-14,-60)">{art}</g>' + word, int(256 + w + 8)


h_body, h_w = horizontal(FULL, INK)
write("lockup-horizontal.svg", h_body, w=h_w, h=150)
h_body_w, _ = horizontal(ON_COBALT.replace(f'"{COBALT}"', f'"{COBALT}"'), WHITE)
d_body, _ = horizontal(ON_DARK, WHITE)
write("lockup-horizontal-on-dark.svg", d_body, w=h_w, h=150)
write("lockup-horizontal-on-cobalt.svg", f'<rect x="-40" y="-40" width="{h_w + 80}" height="230" fill="{COBALT}"/>' + h_body_w,
      w=h_w, h=150)
word_s, ws = wordmark(INK, 72, 0, 0)
sw = int(max(ws, 230))
stacked = (f'<g transform="translate({(sw - 230) / 2 - 18},-74)">{FULL}</g>'
           + wordmark(INK, 72, (sw - ws) / 2, 214)[0])
write("lockup-stacked.svg", stacked, w=sw, h=236)
wm, wmw = wordmark(INK, 120, 0, 104)
write("wordmark.svg", wm, w=int(wmw), h=134)


# ---------------------------------------------------------------- rasters
def render(src, out, size=None, w=None, h=None, bg=None):
    cmd = ["python3", str(RENDER), str(src), "-o", str(out)]
    cmd += ["--size", str(size)] if size else ["--width", str(w), "--height", str(h)]
    if bg:
        cmd += ["--bg", bg]
    subprocess.run(cmd, check=True, capture_output=True)


for s in (16, 32, 48):
    render(SVG / "favicon.svg", WEB / f"favicon-{s}.png", size=s)
render(SVG / "favicon.svg", WEB / "favicon-32.png", size=32)
render(SVG / "app-icon-full-bleed.svg", WEB / "apple-touch-icon.png", size=180, bg=COBALT)
render(SVG / "app-icon.svg", WEB / "icon-192.png", size=192)
render(SVG / "app-icon.svg", WEB / "icon-512.png", size=512)
render(SVG / "app-icon-maskable.svg", WEB / "icon-maskable-512.png", size=512, bg=COBALT)
subprocess.run(["python3", str(RENDER), str(SVG / "favicon.svg"), "--ico", str(WEB / "favicon.ico"),
                "--ico-sizes", "16", "32", "48"], check=True, capture_output=True)
shutil.copy(SVG / "favicon.svg", WEB / "favicon.svg")
(WEB / "site.webmanifest").write_text(json.dumps({
    "name": "MegaCSV",
    "short_name": "MegaCSV",
    "description": "Open CSV files too big for Excel. Nothing leaves your computer.",
    "start_url": "/",
    "display": "standalone",
    "background_color": GROUND,
    "theme_color": GROUND,
    "icons": [
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}, indent=2) + "\n")
(WEB / "head-snippet.html").write_text(
    '<link rel="icon" href="/favicon.ico" sizes="48x48" />\n'
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />\n'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />\n'
    '<link rel="manifest" href="/site.webmanifest" />\n'
    '<meta name="theme-color" content="#f3f4f2" media="(prefers-color-scheme: light)" />\n'
    '<meta name="theme-color" content="#111214" media="(prefers-color-scheme: dark)" />\n')

for name, size in [("whale", 1024), ("whale-on-cobalt", 1024), ("whale-one-color-black", 1024), ("app-icon", 1024)]:
    render(SVG / f"{name}.svg", PNG / f"{name}-{size}.png", size=size)
render(SVG / "lockup-horizontal.svg", PNG / "lockup-horizontal-1600.png", w=1600, h=int(1600 * 150 / h_w))
render(SVG / "lockup-stacked.svg", PNG / "lockup-stacked-1000.png", w=1000, h=int(1000 * 236 / sw))
print("kit written to", KIT)
