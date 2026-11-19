"""Builds the landing-page variants in this folder. Run: python3 design/landing/build.py

Every variant shares the Quiet Office tokens, nav, footer, FAQ (with JSON-LD) and
SEO head; only the body differs. Throwaway mockups: figures marked * are placeholders.
"""

import html
import json
import random
from pathlib import Path

OUT = Path(__file__).parent

# ---------- shared content ----------

FAQ = [
    ("How do I open a CSV file that's too big for Excel?",
     "Open it in MegaCSV. Choose the file or drop it on the page and every row appears in seconds, with no row limit. Find or filter the rows you need, then export them back to Excel."),
    ("What is the maximum number of rows in Excel?",
     "1,048,576 rows per sheet (about 10.5 lakh), and 16,384 columns. Anything past that is cut off when Excel opens a CSV. MegaCSV has no row limit and splits exports so each part fits in one Excel sheet."),
    ("Why does Excel say \"This data set is too large for the Excel grid\"?",
     "The file has more rows than one sheet can hold, so Excel loads only the first 1,048,576 and drops the rest. Open the whole file in MegaCSV, filter it down, and export a part that fits."),
    ("Can I open a large CSV file on a Mac?",
     "Yes. MegaCSV runs in Safari, Chrome, Edge or Firefox on a Mac. You don't need Power Pivot or the Data Model, which Excel for Mac doesn't have."),
    ("Will it change my data?",
     "No. Values show exactly as they are in the file: leading zeros, long account numbers and dates stay as written. Excel exports keep IDs and long numbers as text."),
    ("How do I split a large CSV into smaller files?",
     "Open the file, choose Export, and pick a size: 1,048,575 rows to fit Excel, 50,000 for Salesforce imports, 25,000 for NetSuite, or your own number. Every part gets the header row."),
    ("Do I need to install anything or sign up?",
     "No. It works in your browser, so there's nothing to install and no account to create. That also means no IT ticket on a work laptop."),
    ("How big a file can it open?",
     "Files of tens of gigabytes and hundreds of millions of rows. The practical limit depends on your computer; MegaCSV tells you if a file is larger than it can handle comfortably."),
    ("Is MegaCSV free?",
     "Yes. Opening, finding, filtering and exporting are free, with no row limit and no trial period."),
]

COLS = ["txn_id", "posted_date", "vendor", "account", "amount", "currency", "status", "country"]
random.seed(7)
VENDORS = ["Acme Industrial Supply", "Northwind Traders", "Globex Logistics", "Initech Software", "Umbrella Freight", "Soylent Foods", "Vandelay Imports"]


def sample_rows(n=9):
    rows = []
    for i in range(n):
        rows.append([
            f"TX-{90412000 + i * 37 + random.randint(0, 30):09d}",
            f"2026-0{random.randint(7, 9)}-{random.randint(1, 28):02d}",
            random.choice(VENDORS),
            random.choice(["6100 Materials", "6200 Freight", "6400 Software", "7100 Travel"]),
            f"{random.uniform(12, 48000):,.2f}",
            random.choice(["USD", "EUR", "INR", "GBP"]),
            random.choice(["Posted", "Posted", "Pending", "Reversed"]),
            random.choice(["US", "DE", "IN", "GB", "SG"]),
        ])
    return rows


def grid(rows=None, start=18_402_113, hit=None):
    rows = rows or sample_rows()
    letters = "".join(f"<th>{chr(65 + i)}</th>" for i in range(len(COLS)))
    names = "".join(f"<th>{c}</th>" for c in COLS)
    body = []
    for i, r in enumerate(rows):
        cells = []
        for j, v in enumerate(r):
            cls = ' class="num"' if j == 4 else ""
            if hit and hit in v:
                cls = ' class="hit"'
            cells.append(f"<td{cls}>{html.escape(v)}</td>")
        sel = ' class="sel"' if i == 3 else ""
        body.append(f'<tr{sel}><td class="rn">{start + i:,}</td>{"".join(cells)}</tr>')
    return (f'<div class="scroller"><table class="grid"><thead><tr class="letters"><th class="rn"></th>{letters}</tr>'
            f'<tr class="names"><th class="rn"></th>{names}</tr></thead><tbody>{"".join(body)}</tbody></table></div>')


def preview(caption="transactions_q3.csv · 6.2 GB · 48,273,485 rows*", tab="Acme Q3 · 12,408 rows", hit=None):
    return f'''<figure class="preview">
  <div class="window">
    <div class="fbar"><span class="name">C18,402,116</span><span class="fx">fx</span><span class="val">Acme Industrial Supply</span></div>
    <div class="sheet">{grid(hit=hit)}</div>
    <div class="tabs"><span class="on">{tab}</span><span>All rows · 48,273,485</span></div>
  </div>
  <figcaption>{caption}</figcaption>
</figure>'''


def faq_html():
    items = "".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in FAQ)
    return f'<section id="faq"><h2>Questions</h2><div class="faq">{items}</div></section>'


def faq_jsonld():
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


APP_JSONLD = json.dumps({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MegaCSV",
    "url": "https://megacsv.com/",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Windows, macOS, Linux, ChromeOS",
    "description": "Open CSV files too big for Excel, find and filter rows in plain words, and export them back to Excel.",
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
}, indent=2)

NAV = '''<header class="nav">
  <a class="brand" href="#"><img src="../logo/kit/svg/whale.svg" alt="" width="28" height="28" />MegaCSV</a>
  <nav class="links" aria-label="Main"><a href="#how">How it works</a><a href="#faq">Questions</a><a href="#">Guides</a></nav>
  <span class="sp"></span>
  <button class="iconbtn" type="button" data-theme aria-label="Switch between light and dark">
    <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>
  </button>
  <details class="menu"><summary aria-label="Menu"><svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
    <nav aria-label="Main"><a href="#how">How it works</a><a href="#faq">Questions</a><a href="#">Guides</a></nav></details>
</header>'''

FOOTER = '''<footer class="foot">
  <div><a class="brand" href="#"><img src="../logo/kit/svg/whale.svg" alt="" width="22" height="22" />MegaCSV</a><p>Open CSV files too big for Excel.</p></div>
  <nav aria-label="Footer"><a href="#">About us</a><a href="#">Contact us</a><a href="#">Privacy policy</a><a href="#">Terms and conditions</a></nav>
  <p class="note">* Placeholder figure, to be measured before launch.</p>
</footer>'''

CTAS = '''<div class="ctas"><button class="btn primary" type="button">Choose a CSV file</button><button class="btn" type="button">Try a sample file</button></div>'''

SCRIPT = '''<script>
document.querySelector("[data-theme]").addEventListener("click", () => document.documentElement.classList.toggle("dark"));
</script>'''


def page(slug, title, label, body, description):
    doc = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}" />
<link rel="canonical" href="https://megacsv.com/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{html.escape(title)}" />
<meta property="og:description" content="{html.escape(description)}" />
<meta property="og:url" content="https://megacsv.com/" />
<meta property="og:image" content="https://megacsv.com/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#f3f4f2" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#111214" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="../logo/kit/svg/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="landing.css" />
<script type="application/ld+json">
{APP_JSONLD}
</script>
<script type="application/ld+json">
{faq_jsonld()}
</script>
</head>
<body class="v-{slug}">
<a class="skip" href="#main">Skip to content</a>
<p class="variant">Variant {label} · <a href="index.html">all variants</a></p>
{NAV}
<main id="main">
{body}
{faq_html()}
</main>
{FOOTER}
{SCRIPT}
</body>
</html>
'''
    (OUT / f"{slug}.html").write_text(doc)


# ---------- the six variants ----------

V1 = f'''<div class="col">
  <h1>Open CSV files too big for Excel.</h1>
  <p class="lede">Find the rows you need and take them back to Excel. <span>Free, with no signup.</span></p>
  {CTAS}
</div>
<div class="col wide">{preview()}</div>
<div class="col">
  <section>
    <h2>When Excel says no</h2>
    <blockquote class="error"><small>Microsoft Excel</small>This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded.</blockquote>
    <p>Excel stops at 1,048,576 rows. MegaCSV opens every row, however many there are, and it looks the way you expect: rows, columns, a formula bar, sheet tabs.</p>
  </section>
  <section id="how">
    <h2>Ask for the rows in plain words</h2>
    <p class="sentence">Show rows where <u>vendor</u> contains <u>Acme</u> and <u>posted_date</u> is in <u>Q3 2026</u>.</p>
    <p class="m">No formulas, no code. Each result opens as its own sheet tab. Export it to Excel; results bigger than one sheet are split for you.</p>
  </section>
  <section>
    <h2>At a glance</h2>
    <dl class="facts">
      <div><dt>Largest file</dt><dd>Tens of gigabytes</dd></div>
      <div><dt>Row limit</dt><dd>None</dd></div>
      <div><dt>Signup or install</dt><dd>None</dd></div>
      <div><dt>Works on</dt><dd>Windows, Mac, Linux, ChromeOS</dd></div>
      <div><dt>Price</dt><dd>Free</dd></div>
    </dl>
  </section>
</div>'''

V2 = f'''<div class="col wide">
  <h1 class="small">Open a CSV of any size.</h1>
  <div class="dropzone" role="button" tabindex="0" aria-label="Choose a CSV file">
    <svg viewBox="0 0 24 24" class="icon big" aria-hidden="true"><path d="M12 15V3m0 0 4 4m-4-4-4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>
    <p class="drop-title">Drop a CSV file here</p>
    <p class="m">or <button class="link" type="button">choose one</button> · <button class="link" type="button">try a sample file</button></p>
    <p class="m small">CSV, TSV and text files. Even ones Excel can't open.</p>
  </div>
</div>
<div class="col">
  <section id="how">
    <h2>What you can do with it</h2>
    <ol class="steps">
      <li><b>See every row.</b> No 1,048,576-row cut-off. Scroll, or jump straight to row 18,402,116.</li>
      <li><b>Find anything.</b> Search the whole file at once, like Ctrl F that doesn't give up.</li>
      <li><b>Filter in plain words.</b> "Show rows where country is IN and total is over 2,000."</li>
      <li><b>Export to Excel.</b> Just the rows you need, split into parts that each fit one sheet.</li>
    </ol>
  </section>
  <section>
    <h2>Measured, not promised</h2>
    <table class="numbers">
      <thead><tr><th>Task</th><th>1 GB file, 9.7 million rows</th></tr></thead>
      <tbody>
        <tr><td>Open and count every row</td><td>0.9 s*</td></tr>
        <tr><td>Open it again later</td><td>0.06 s*</td></tr>
        <tr><td>Find a word in every row</td><td>1.1 s*</td></tr>
        <tr><td>Filter to 971,018 rows</td><td>1.1 s*</td></tr>
        <tr><td>Export those rows to CSV</td><td>3.9 s*</td></tr>
      </tbody>
    </table>
  </section>
</div>'''

PROBLEMS = [
    ("Excel", "This data set is too large for the Excel grid."),
    ("Excel", "File not loaded completely."),
    ("Excel for Mac", "No Power Pivot or Data Model, so no way past 1,048,576 rows."),
    ("Google Sheets", "This action would increase the number of cells above the limit of 10,000,000 cells."),
    ("LibreOffice Calc", "The maximum number of rows per sheet was exceeded."),
    ("Notepad++", "File is too big to be opened by Notepad++."),
    ("pandas", "MemoryError: Unable to allocate 51.0 GiB for an array."),
]

V3 = f'''<div class="col">
  <blockquote class="error hero"><small>Microsoft Excel</small>This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded.</blockquote>
  <h1>Open it here instead.</h1>
  <p class="lede">Every row, in seconds. Find what you need and take it back to Excel. <span>Free, with no signup.</span></p>
  {CTAS}
  <section id="how">
    <h2>Three steps, no formulas</h2>
    <ol class="steps numbered">
      <li><b>Choose your file.</b> Rows appear while the rest is still being read.</li>
      <li><b>Say what you're looking for.</b> <span class="sentence inline">Show rows where <u>vendor</u> contains <u>Acme</u>.</span></li>
      <li><b>Export to Excel.</b> 12,408 rows fit in one sheet; bigger results are split for you.</li>
    </ol>
  </section>
</div>
<div class="col wide">{preview()}</div>
<div class="col">
  <section>
    <h2>Other messages it gets you past</h2>
    <ul class="problems">{"".join(f'<li><a href="#"><small>{a}</small>{html.escape(m)}</a></li>' for a, m in PROBLEMS)}</ul>
  </section>
</div>'''

BARS = [("MegaCSV", 1, "about 1 s*"), ("Excel", 90, "90 s or more, then rows are cut off*"), ("Power Query", 240, "several minutes*"), ("Cloud tools", 1980, "33 min to upload 5 GB at 20 Mbps*")]


def bars():
    top = max(b[1] for b in BARS)
    out = []
    for name, secs, label in BARS:
        width = max(1.5, 100 * (secs / top) ** 0.5)
        cls = ' class="us"' if name == "MegaCSV" else ""
        out.append(f'<div{cls}><span class="who">{name}</span><span class="bar"><i style="width:{width:.1f}%"></i></span><span class="lbl">{label}</span></div>')
    return "".join(out)


V4 = f'''<div class="col">
  <h1>See every row in about a second.</h1>
  <p class="lede">A 6 GB file Excel can't finish opening is ready to scroll, search and filter before you'd find the Power Query menu. <span>Free, with no signup.</span></p>
  {CTAS}
  <section>
    <h2>Seconds until you see your data</h2>
    <p class="m">Opening a 5 GB CSV. Scale is compressed so MegaCSV's bar is visible.</p>
    <div class="race">{bars()}</div>
  </section>
</div>
<div class="col wide">{preview(caption="Rows are on screen while the rest of the file is still being read.")}</div>
<div class="col">
  <section id="how">
    <h2>How it compares</h2>
    <div class="tablewrap"><table class="compare">
      <thead><tr><th></th><th>MegaCSV</th><th>Excel</th><th>Google Sheets</th><th>Power Query</th></tr></thead>
      <tbody>
        <tr><td>Rows</td><td>No limit</td><td>1,048,576</td><td>About 330,000 at 30 columns</td><td>No limit, but a preview only</td></tr>
        <tr><td>Works on Mac</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Partly; no Data Model</td></tr>
        <tr><td>Filter without formulas</td><td>Yes, in plain words</td><td>Up to the row limit</td><td>Up to the cell limit</td><td>Menus and steps</td></tr>
        <tr><td>Back to Excel</td><td>One click, split to fit</td><td>—</td><td>Download</td><td>Load to sheet, row limit applies</td></tr>
        <tr><td>Price</td><td>Free</td><td>Microsoft 365</td><td>Free</td><td>Included in Excel for Windows</td></tr>
      </tbody>
    </table></div>
  </section>
</div>'''

V5 = f'''<div class="col">
  <h1>Open it. Find it. Back to Excel.</h1>
  <p class="lede">For the CSV files Excel can't hold: exports, dumps and downloads with millions of rows. <span>Free, with no signup.</span></p>
  {CTAS}
</div>
<div class="col">
  <section id="how" class="jobs">
    <article><h2>Look through all of it</h2><p>Every row, true row numbers, a formula bar with the full value of any cell. Jump to row 18,402,116 if that's where the error said to look.</p></article>
    <article><h2>Pull out the rows you need</h2><p class="sentence">Show rows where <u>account</u> is <u>6200 Freight</u> and <u>amount</u> is over <u>10,000</u>.</p><p class="m">12,408 of 48,273,485 rows · fits in one Excel sheet</p></article>
    <article><h2>Split it for an import</h2><p>Parts of 1,048,575 rows for Excel, 50,000 for Salesforce or 25,000 for NetSuite, each with the header row. Quotes and line breaks inside cells stay intact.</p></article>
    <article><h2>Keep your values as they are</h2><p>Leading zeros, long account numbers and dates stay exactly as written, in the grid and in the Excel file you export.</p></article>
  </section>
</div>
<div class="col wide">{preview(tab="Freight over 10,000 · 12,408 rows")}</div>
<div class="col">
  <section>
    <h2>Made for the people who get the file</h2>
    <dl class="who">
      <div><dt>Finance and audit</dt><dd>General ledger dumps, bank and payment exports, monthly ERP extracts.</dd></div>
      <div><dt>IT and migrations</dt><dd>Old database exports headed for a new system.</dd></div>
      <div><dt>Research and students</dt><dd>Lab and survey data, public datasets, dissertation files, on Windows or Mac.</dd></div>
      <div><dt>Marketing and e-commerce</dt><dd>Orders, ad reports, crawls and Search Console exports.</dd></div>
    </dl>
  </section>
</div>'''

VOICES = [
    ("Excel… just dumps the rest of the data.", "A researcher with 1.4 GB of environmental data", "MegaCSV opens every row and shows the true count."),
    ("Can I use an external program? No. That's my main issue.", "An analyst on Excel 2013", "Nothing to install. It runs in the browser you already have."),
    ("HOW DO WE DO IT ON A MAC", "A student told to use the Data Model", "Works the same in Safari, Chrome, Edge and Firefox on a Mac."),
    ("I don't need probably 85% of it.", "Someone opening a 5.29 GB public health file", "Filter to the rows you need and export just those."),
    ("How do you export the 10 million records to a csv file?", "A comment under a Power Query tutorial", "Export to CSV or Excel in one step, split to fit if needed."),
    ("I have to do this on a monthly basis!", "An analyst with a monthly 10-million-row export", "Files you've opened before open again instantly."),
]

V6 = f'''<div class="col">
  <h1>Excel gave up. Now what?</h1>
  <p class="lede">The same question comes up every day on Reddit and under YouTube tutorials. Here's what people said, and what MegaCSV does about it. <span>Free, with no signup.</span></p>
  {CTAS}
  <section id="how" class="voices">
    {"".join(f'<figure><blockquote>“{html.escape(q)}”</blockquote><figcaption>{html.escape(w)}</figcaption><p>{html.escape(a)}</p></figure>' for q, w, a in VOICES)}
  </section>
</div>
<div class="col wide">{preview()}</div>'''

VARIANTS = [
    ("v1-quiet-column", "1", "Quiet column", "The Quiet Office default: headline, app preview, the Excel error, the plain-words filter, a short facts list.", V1,
     "MegaCSV · Open CSV files too big for Excel", "Open CSV files with millions of rows, find and filter them in plain words, and export the rows you need back to Excel. Free, no signup."),
    ("v2-drop-first", "2", "Tool first", "The drop zone is the hero, so visitors start using it immediately. Measured speeds below.", V2,
     "MegaCSV · Free online CSV viewer for files of any size", "A free online CSV viewer that opens files of any size. See every row, find, filter and export to Excel. No signup."),
    ("v3-excel-error", "3", "The Excel error", "Opens with the exact message people search for, then three steps, then links to the other error pages.", V3,
     "Excel data set too large for the grid? Open it here · MegaCSV", "Excel says the data set is too large for the grid? Open every row here, filter it, and export a part that fits in Excel."),
    ("v4-speed", "4", "Speed", "Leads with time-to-first-row: a race chart against Excel, Power Query and cloud tools, plus a comparison table.", V4,
     "MegaCSV · See every row of a huge CSV in about a second", "Open a multi-gigabyte CSV in about a second. Compare MegaCSV with Excel, Google Sheets and Power Query."),
    ("v5-jobs", "5", "Jobs to be done", "Organised around what people need to do (look, pull out rows, split, keep values) and who they are.", V5,
     "MegaCSV · Open, filter and split large CSV files for Excel", "Look through a huge CSV, pull out the rows you need, split it for Salesforce or NetSuite imports, and keep values exactly as written."),
    ("v6-voices", "6", "In their words", "Real (anonymous) quotes from the Reddit and YouTube research, each answered by a feature.", V6,
     "MegaCSV · When Excel can't open your CSV file", "What people say when Excel gives up on a big CSV, and how MegaCSV opens, filters and exports it."),
]

for slug, label, name, blurb, body, title, desc in VARIANTS:
    page(slug, title, f"{label} · {name}", body, desc)

cards = "".join(
    f'<li><a href="{slug}.html"><img src="shots/{slug}-desktop.png" alt="" loading="lazy" /><b>{label} · {name}</b><span>{blurb}</span></a></li>'
    for slug, label, name, blurb, *_ in VARIANTS
)
(OUT / "index.html").write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MegaCSV · Landing page variants</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="landing.css" /></head>
<body class="gallery"><main class="col wide">
<h1 class="small">Landing page variants</h1>
<p class="lede">Six ways to tell the same story, all in the Quiet Office design. Each has the same nav, FAQ (with FAQPage JSON-LD), footer links and SEO tags. Mix and match sections freely.</p>
<ul class="cards">{cards}</ul>
</main></body></html>
''')
print("built", len(VARIANTS), "variants")
