"""Round 3: the "m," family (the user's pick from round 1) in four builds. Writes design/logo/round3/*.svg"""
from pathlib import Path

from build import COMMA, MCOMMA as TABLE_M, font, text_path

HERE = Path(__file__).parent
OUT = HERE / "round3"
OUT.mkdir(exist_ok=True)
COBALT, TINT, INK, WHITE = "#2449f5", "#a9b9ff", "#17181a", "#ffffff"
f650 = font(650)
f600 = font(600)

# Hanken Grotesk 650 'm': stems at 63-181, 364-482, 666-783 (units/1000), x-height ~500.
STEM_L, STEM_R = 666, 783


def svg(body, w=256, h=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n'


def comma(x, baseline, k, fill):
    """Cell comma with its head's left edge at x and the head's bottom on the baseline."""
    return f'<path fill="{fill}" transform="translate({x - 78 * k:.2f},{baseline - 126 * k:.2f}) scale({k:.4f})" d="{COMMA}"/>'


def m_classic(m_fill=INK, c_fill=COBALT, size=190):
    """m followed by a cell comma."""
    k = 0.36
    _, mw = text_path(f650, "m", size, 0, 0)
    x = (256 - (mw + 8 + 100 * k)) / 2
    d, _ = text_path(f650, "m", size, x, 186)
    return f'<path fill="{m_fill}" d="{d}"/>' + comma(x + mw + 8, 186, k, c_fill)


def m_joined(m_fill=INK, c_fill=COBALT, size=200, base=170, cx=None):
    """The m's last leg turns into the comma: same width, head on the baseline, tail below."""
    s = size / 1000
    _, mw = text_path(f650, "m", size, 0, 0)
    x = (256 - mw) / 2 if cx is None else cx
    d, _ = text_path(f650, "m", size, x, base)
    k = (STEM_R - STEM_L) * s / 100  # comma head width == stem width
    sx = x + STEM_L * s
    head_top = base - 100 * k
    # cut the bottom of the last stem away so the comma head replaces it cleanly
    clip = (f'<clipPath id="cut"><path clip-rule="evenodd" d="M0,0H256V256H0Z '
            f'M{sx - 1:.2f},{head_top:.2f}H{sx + (STEM_R - STEM_L) * s + 1:.2f}V{base + 2:.2f}H{sx - 1:.2f}Z"/></clipPath>')
    return clip + f'<path fill="{m_fill}" clip-path="url(#cut)" d="{d}"/>' + comma(sx, base, k, c_fill)


def tile(body):
    return f'<rect width="256" height="256" rx="58" fill="{COBALT}"/>' + body


def table_m_comma():
    """The table m from round 1 with a cell comma after it."""
    k = 0.34
    return (f'<path fill="{INK}" transform="translate(-26,0)" d="{TABLE_M}"/>'
            + comma(192, 208, k, COBALT))


def lockup(name, body, word="mega,csv"):
    size, base = 120, 128 + 120 * 0.36
    x = 256 + 24
    if word == "mega,csv":
        mega, w1 = text_path(f650, "mega", size, x, base, tracking=-0.03)
        k = 0.25
        cx = x + w1 + 8
        csv, w2 = text_path(f650, "csv", size, cx + 100 * k + 10, base, tracking=-0.03)
        W = int(cx + 100 * k + 10 + w2 + 16)
        words = f'<path fill="{INK}" d="{mega}{csv}"/>' + comma(cx, base, k, COBALT)
    else:
        d, w = text_path(f600, word, size, x, base, tracking=-0.02)
        W = int(x + w + 16)
        words = f'<path fill="{INK}" d="{d}"/>'
    (OUT / f"{name}-lockup.svg").write_text(svg(body + words, w=W))


variants = {
    "m1-classic": m_classic(),
    "m2-joined": m_joined(),
    "m3-tile": tile(m_joined(m_fill=WHITE, c_fill=TINT, size=178, base=166)),
    "m4-table": table_m_comma(),
}
for name, body in variants.items():
    (OUT / f"{name}-symbol.svg").write_text(svg(body))
    lockup(name, body)
print("wrote", sorted(x.name for x in OUT.iterdir()))
