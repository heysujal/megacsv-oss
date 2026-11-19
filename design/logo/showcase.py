"""Identity showcase for round 3: each direction in real contexts. Writes design/logo/showcase.html"""
import re
from pathlib import Path

import build4 as B

HERE = Path(__file__).parent


def inner(name):
    s = (HERE / "round4" / f"{name}-symbol.svg").read_text()
    return re.sub(r"^<svg[^>]*>|</svg>\s*$", "", s.strip())


def mark(body, size, uid, extra=""):
    # make clipPath ids unique per instance so many copies can live on one page
    for cid in re.findall(r'id="([^"]+)"', body):
        body = body.replace(f'id="{cid}"', f'id="{cid}-{uid}"').replace(f"url(#{cid})", f"url(#{cid}-{uid})")
    return f'<svg viewBox="0 0 256 256" width="{size}" height="{size}" {extra}>{body}</svg>'


def recolor(body, mapping):
    for a, b in mapping.items():
        body = body.replace(f'"{a}"', f'"{b}"')
    return body


ON_COBALT = {B.COBALT: "#ffffff", B.MID: "#dfe5ff", B.TINT: "#9fb2ff", B.NAVY: "#0c1652"}
ON_DARK = {B.NAVY: "#9fb2ff", B.INK: "#ffffff"}

DIRECTIONS = [
    ("a-blue-whale", "a2-whale-tile", "1 · The blue whale",
     "The largest animal on earth, in our cobalt. Its throat grooves are rows of data. Calm, big, friendly: the "
     "thing that swallows files Excel can't. A real character the brand can use everywhere: loading states, empty "
     "states, stickers, the 404 page.",
     "Recommended. Most identity of the four; a mascot people remember and talk about."),
    ("f-fluke", None, "2 · The tail",
     "The whale's tail rising out of rows of data: the big one surfacing. Works alone or as the whale's small "
     "sibling (favicon, loading spinner, footer).",
     "Simpler and calmer than the whale; very strong as a small icon."),
    ("b-slab", None, "3 · The slab",
     "A huge block of rows; one slab slides out like a drawer: the rows you need, pulled out for Excel. "
     "Dimensional, technical, premium.",
     "Most 'serious software' feel; less personality than the whale."),
    ("c-halftone-m", None, "4 · Halftone M",
     "An M printed in halftone dots: one big file made of many small values. The dots give the brand a "
     "texture for backgrounds and loading animations.",
     "Stylish and typographic; the dot texture risks feeling decorative."),
]


def card(sym, tile, title, idea, verdict, k):
    body = inner(sym)
    on_cobalt = {**ON_COBALT, B.NAVY: "#ffffff"} if sym == "f-fluke" else ON_COBALT
    tile_body = inner(tile) if tile else f'<rect width="256" height="256" rx="58" fill="{B.COBALT}"/>' + \
        f'<g transform="translate(128,128) scale(.72) translate(-128,-128)">{recolor(body, on_cobalt)}</g>'
    sizes = "".join(f'<div class="sz">{mark(tile_body, s, f"{k}s{s}")}<span>{s}px</span></div>' for s in (64, 32, 16))
    return f"""
<section class="dir">
  <header><h2>{title}</h2><p>{idea}</p><p class="verdict">{verdict}</p></header>
  <div class="row3">
    <div class="panel light">{mark(body, 220, f"{k}a")}</div>
    <div class="panel cobalt">{mark(recolor(body, {**ON_COBALT, B.NAVY: "#ffffff"} if sym == "f-fluke" else ON_COBALT), 220, f"{k}b")}</div>
    <div class="panel dark">{mark(recolor(body, ON_DARK), 220, f"{k}c")}</div>
  </div>
  <div class="row4">
    <div class="ctx site">
      <div class="tab">{mark(tile_body, 16, f"{k}t")}<span>MegaCSV · Open CSV files too big for Excel</span></div>
      <div class="nav">{mark(body, 30, f"{k}n")}<b>MegaCSV</b><i>How it works</i><i>Questions</i><i>Guides</i></div>
      <div class="hero"><h3>Open CSV files too big for Excel.</h3><button>Choose a CSV file</button></div>
    </div>
    <div class="ctx icons"><div class="dock">{mark(tile_body, 76, f"{k}d")}<span>MegaCSV</span></div><div class="sizes">{sizes}</div></div>
    <div class="ctx sticker"><div class="stk">{mark(body, 120, f"{k}k")}<span>nothing uploaded</span></div></div>
  </div>
</section>"""


html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MegaCSV identity directions</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
body {{ margin:0; font-family:"Hanken Grotesk",system-ui,sans-serif; background:#f3f4f2; color:#17181a; }}
.top {{ padding:56px 64px 8px; }} .top h1 {{ font-size:44px; letter-spacing:-.035em; font-weight:500; margin:0; }}
.top p {{ color:#63666b; font-size:18px; max-width:70ch; line-height:1.5; }}
.dir {{ padding:56px 64px; }} .dir + .dir {{ border-top:1px solid #e2e3e0; }}
.dir header {{ max-width:80ch; }} .dir h2 {{ font-size:30px; font-weight:500; letter-spacing:-.025em; margin:0 0 10px; }}
.dir p {{ margin:0 0 6px; line-height:1.55; font-size:17px; }} .verdict {{ color:#2449f5; }}
.row3 {{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:24px; }}
.panel {{ border-radius:16px; height:300px; display:grid; place-items:center; }}
.light {{ background:#fff; }} .cobalt {{ background:#2449f5; }} .dark {{ background:#111214; }}
.row4 {{ display:grid; grid-template-columns:1.6fr 1fr 1fr; gap:14px; margin-top:14px; }}
.ctx {{ border-radius:16px; background:#fff; min-height:250px; overflow:hidden; }}
.site .tab {{ display:flex; gap:8px; align-items:center; background:#e8e9e6; padding:10px 14px; font-size:13px; color:#63666b; }}
.site .nav {{ display:flex; gap:18px; align-items:center; padding:14px 22px; font-size:14px; }} .site .nav b {{ font-weight:600; font-size:16px; margin-right:10px; }} .site .nav i {{ font-style:normal; color:#63666b; }}
.site .hero {{ padding:18px 22px 24px; }} .site h3 {{ font-weight:500; font-size:32px; letter-spacing:-.04em; margin:0 0 16px; max-width:14ch; line-height:1.05; }}
.site button {{ border:0; background:#2449f5; color:#fff; padding:10px 16px; border-radius:8px; font:inherit; }}
.icons {{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; background:linear-gradient(#cfd6e6,#cfd6e6); }}
.dock {{ display:flex; flex-direction:column; align-items:center; gap:6px; font-size:13px; }}
.dock svg {{ filter:drop-shadow(0 8px 14px #0c165233); }}
.sizes {{ display:flex; gap:18px; align-items:flex-end; }} .sz {{ display:flex; flex-direction:column; align-items:center; gap:4px; font-size:11px; color:#45474c; }}
.sticker {{ display:grid; place-items:center; background:#e8e9e6; }}
.stk {{ width:190px; height:190px; border-radius:50%; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; box-shadow:0 0 0 6px #fff, 0 10px 24px #0002; }}
.stk span {{ font-size:13px; font-weight:600; color:#2449f5; }}
</style></head><body>
<div class="top"><h1>MegaCSV identity directions</h1>
<p>Brand idea: MegaCSV is the biggest thing in the ocean of data, and it's calm. Each direction is shown the way people will meet it: on light, cobalt and dark, in the browser tab and site header, as an app icon at true sizes, and as a sticker.</p></div>
{"".join(card(*d, k=i) for i, d in enumerate(DIRECTIONS))}
</body></html>"""
(HERE / "showcase.html").write_text(html)
print("wrote showcase.html")
