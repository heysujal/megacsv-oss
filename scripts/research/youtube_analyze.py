"""Summarizes research-data/youtube.json: demand per search, pain-point themes,
tools people mention, file sizes they report, and top comments per theme.

    python3 scripts/research/youtube_analyze.py > research-data/youtube-summary.txt
"""

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
data = json.loads((ROOT / "research-data" / "youtube.json").read_text())
videos, comments = data["videos"], data["comments"]

THEMES = {
    "row limit (1,048,576)": r"million rows|1,?048,?57[56]|row limit|too many rows|more than (a|1) ?million|max(imum)? rows|rows limit",
    "crash / freeze / slow": r"crash|freez|froze|not responding|hang(s|ing)?\b|stuck|takes? (forever|ages|hours)|so slow|very slow|lag",
    "file size in GB": r"\b\d+(\.\d+)?\s?(gb|gig)\b|gigabyte",
    "Power Query / data model": r"power ?query|data model|power ?pivot|get data|load to",
    "split file": r"\bsplit",
    "code alternative (python/sql/R)": r"python|pandas|\bsql\b|duckdb|\bvba\b|macro|r ?studio|powershell|command line|\bcmd\b",
    "mac / numbers": r"\bmac\b|macbook|\bnumbers app|apple",
    "privacy / upload": r"upload|privacy|confidential|sensitive|company (data|policy)|secure|security",
    "need it back in Excel / export": r"export|back (in)?to excel|save (it|as)|copy (it )?to excel|pivot table",
    "data changed (zeros, dates, e+)": r"leading zero|scientific notation|e\+\d|date format|dates? (changed|converted)|zeros? (disappear|removed|gone|dropped)",
    "one column / delimiter": r"one column|single column|delimiter|semicolon|text to columns|comma separated",
    "can't install / IT restrictions": r"\binstall|admin rights|it department|company laptop|work laptop|not allowed",
    "need to filter / find rows": r"\bfilter|search for|find (a|the|specific)|lookup|vlookup|xlookup",
    "thanks / it worked": r"thank|saved my|life ?saver|worked|you('re| are) (a|the) (legend|hero|best)",
}

TOOLS = [
    "power query", "power pivot", "power bi", "access", "sqlite", "duckdb", "pandas", "python", "emeditor",
    "ultraedit", "notepad++", "sublime", "vs code", "vscode", "glogg", "visidata", "modern csv", "delimit", "tad",
    "gigasheet", "row zero", "csvkit", "tableau", "knime", "alteryx", "google sheets", "libreoffice", "numbers",
    "r studio", "rstudio", "split csv", "csv splitter", "csved", "datasette", "polars", "spark", "mysql", "postgres",
    "ms access", "excel online", "copilot", "chatgpt",
]

all_comments = [(vid, c) for vid, cs in comments.items() for c in cs]
texts = [c["text"].lower() for _, c in all_comments]
print(f"{len(videos)} videos, {len(all_comments)} top-level comments "
      f"(+{sum(len(c['replies']) for _, c in all_comments)} replies)\n")

print("== Demand: top videos per search (views) ==")
for q, ids in data["queries"].items():
    vs = sorted((videos[v] for v in ids if v in videos), key=lambda v: -v["views"])
    total = sum(v["views"] for v in vs)
    print(f"\n[{q}] total views of top {len(vs)}: {total:,}")
    for v in vs[:4]:
        print(f"  {v['views']:>10,}  {v['published']}  {v['title'][:80]}  ({v['channel']})")

print("\n== Themes (share of top-level comments) ==")
theme_hits = {}
for name, pat in THEMES.items():
    rx = re.compile(pat)
    hits = [i for i, t in enumerate(texts) if rx.search(t)]
    theme_hits[name] = hits
    print(f"  {len(hits):>5}  {100 * len(hits) / len(texts):5.1f}%  {name}")

print("\n== Tools mentioned in comments ==")
counts = Counter()
for t in texts:
    for tool in TOOLS:
        if re.search(r"\b" + re.escape(tool) + r"\b", t):
            counts[tool] += 1
for tool, n in counts.most_common(30):
    print(f"  {n:>5}  {tool}")

print("\n== File sizes / row counts people mention ==")
sizes = Counter()
for t in texts:
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s?(gb|mb)\b", t):
        n, unit = float(m.group(1)), m.group(2)
        gb = n if unit == "gb" else n / 1000
        bucket = "<0.1 GB" if gb < 0.1 else "0.1-1 GB" if gb < 1 else "1-5 GB" if gb < 5 else "5-20 GB" if gb < 20 else "20-100 GB" if gb < 100 else "100+ GB"
        sizes[bucket] += 1
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s?(million|mil|m)\s?(rows|records|lines)", t):
        n = float(m.group(1))
        bucket = "rows 1-5M" if n < 5 else "rows 5-20M" if n < 20 else "rows 20-100M" if n < 100 else "rows 100M+"
        sizes[bucket] += 1
for b, n in sorted(sizes.items()):
    print(f"  {n:>5}  {b}")

def show(name, k=10):
    idx = sorted(theme_hits[name], key=lambda i: -all_comments[i][1]["likes"])[:k]
    print(f"\n== Top comments: {name} ==")
    for i in idx:
        vid, c = all_comments[i]
        text = " ".join(c["text"].split())[:260]
        print(f"  [{c['likes']} likes, {c['date']}, on: {videos.get(vid, {}).get('title', '')[:45]}] {text}")

for name in THEMES:
    if name != "thanks / it worked":
        show(name, 8)
