---
name: MegaCSV
description: Open CSV files too big for Excel. Calm on the outside, familiar on the inside.
colors:
  ground: "#f3f4f2"
  sheet: "#ffffff"
  ink: "#17181a"
  ink-muted: "#63666b"
  tone-1: "#e8e9e6"
  tone-2: "#dcdedb"
  hairline: "#e2e3e0"
  cobalt: "#2449f5"
  on-cobalt: "#ffffff"
  match: "#dbe2ff"
  warning-text: "#c2410c"
  dark-ground: "#111214"
  dark-sheet: "#17181b"
  dark-ink: "#e9eaec"
  dark-ink-muted: "#9a9da3"
  dark-tone-1: "#1d1e22"
  dark-tone-2: "#27292d"
  dark-hairline: "#24262a"
  dark-cobalt: "#6f8bff"
  dark-on-cobalt: "#0b0c10"
  dark-match: "#1e2a5c"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(40px, 5.2vw, 76px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  sentence:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  body-app:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  grid:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  token: "6px"
  control: "8px"
  panel: "12px"
  window: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  page: "28px"
  section: "140px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-cobalt}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "{colors.tone-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  tool:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  tool-export:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-cobalt}"
    rounded: "{rounded.control}"
    padding: "6px 16px"
  filter-token:
    backgroundColor: "{colors.tone-1}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.token}"
    padding: "2px 8px"
  find-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
  sheet-tab-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    height: "38px"
  grid-row:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    height: "28px"
---

# Design System: MegaCSV

Reference build: [design/explorations/09-quiet-office.html](design/explorations/09-quiet-office.html). Chosen 2026-10-31 from nine directions (gallery at [design/explorations/index.html](design/explorations/index.html)); it combines 05 Quiet instrument (site) with 06 Familiar office (app).

## Overview

**Creative North Star: "The Quiet Office"**

Calm on the outside, familiar on the inside. The website reads like a well-made instrument manual: one narrow column, one typeface, one blue accent, lots of air, short confident sentences. The app, once a file is open, is a spreadsheet an Excel user already knows how to use: a row of labelled tool buttons, a formula bar, column letters, row numbers and sheet tabs. Both halves share the same palette, type and motion, so the hand-off from site to app feels like walking from a quiet lobby into a tidy office.

Hierarchy comes from size, weight and space, never from boxes, badges or colour. Colour is rare so it means something: cobalt marks only what you can act on, plus the current selection. The product proves itself with real content (a real grid with realistic data), never illustrations or decoration.

**Key Characteristics:**
- One typeface (Hanken Grotesk), at most four visible sizes per screen.
- One accent (cobalt) on a cool grey ground; surfaces separated by tone steps.
- Site: single narrow column, centered. App: full-width, dense, familiar.
- Filters are written as a plain sentence: "Show rows where vendor contains Acme and posted_date is in Q3 2026."
- Each filtered result is a sheet tab ("Acme Q3 · 12,408 rows"); "All rows" is always one click away.
- Light and dark are designed separately, both first-class.

## Colors

A cool, nearly neutral grey world with a single saturated cobalt.

### Primary
- **Cobalt** (`#2449f5`, dark `#6f8bff`): primary buttons, Export to Excel, filter tokens' text, the active sheet tab underline, focus rings, text selection, the selected row number. Nothing decorative.

### Neutral
- **Ground** (`#f3f4f2`, dark `#111214`): page and app background; row-number gutter and column-letter bar.
- **Sheet** (`#ffffff`, dark `#17181b`): the spreadsheet surface, formula bar, active sheet tab, find field.
- **Ink** (`#17181a`, dark `#e9eaec`): all running text and grid values. Body text is always full ink.
- **Ink muted** (`#63666b`, dark `#9a9da3`): secondary notes, column names, row numbers, status line. Never for body copy.
- **Tone 1 / Tone 2** (`#e8e9e6` / `#dcdedb`): hover fills, secondary buttons, filter token background, callouts (e.g. the quoted Excel error).
- **Hairline** (`#e2e3e0`): grid lines and the 1px ring around the work area only.

### Signals
- **Match** (`#dbe2ff`, dark `#1e2a5c`): find highlights, with a 2px cobalt underline.
- **Warning text** (`#c2410c`): sparing status text such as "Reversed". No red backgrounds.

### Named Rules
**The One Accent Rule.** Cobalt appears only on actionable elements and the current selection. If something is cobalt, you can click it or it is where you are.

## Typography

**Font:** Hanken Grotesk (400, 500, 600), self-hosted in production (no third-party font requests from the app). Fallback `system-ui, sans-serif`.

**Character:** a quiet, slightly warm grotesk; medium weight at display size instead of bold, so large type stays calm.

### Hierarchy
- **Display** (500, clamp(40px, 5.2vw, 76px), 1.02, -0.04em): one per page, the H1. At most two lines, about 13ch wide.
- **Headline** (500, 30px, 1.15, -0.025em): section headings on the site.
- **Sentence** (400, 22px, 1.7): the plain-language filter sentence, on the site and in the app (17px there).
- **Body** (400, 17px, 1.55): site text, max ~65ch. App chrome uses 15px.
- **Grid** (400, 13px, tabular figures): every cell value and row number. Numbers right-aligned.
- **Label** (500, 12px): tool button labels, status line. Sentence case, never tracked uppercase.

### Named Rules
**The Tabular Rule.** Every number that can sit above another number uses tabular figures: grid, counts, file sizes, row numbers.

## Layout

- **Site:** one centered column, `min(640px, 100% - 48px)`; the app preview breaks wider (up to 960px), also centered. The hero (H1, lede, button) is center-aligned; sections below are left-aligned text inside the centered column. Sections are 140px apart. Nav is a plain bar: wordmark, links, a secondary "Open a CSV file" button (hidden on small phones), theme toggle. (Owner decision Nov 1, 2026: centered, replacing the earlier 22vw left offset.)
- **App:** full viewport, top to bottom: app bar (52px: back, file name, size and rows, find, theme) → tool row (labelled icon buttons; Export to Excel pinned right) → filter sentence with the match count right-aligned → work area (formula bar, grid with column letters and row numbers, sheet tabs) → status line (delimiter, encoding, "Your file stays on this computer").
- Page margins 28px (site nav), 8-16px (app). Equal on both sides.
- Phones are not a target for the app; the site column collapses to a 24px left margin.

## Elevation & Depth

Flat. Depth comes from tone steps (ground → sheet), not shadows. Two exceptions: the 1px hairline ring around the app's work area, and one soft shadow (`0 24px 48px -32px #0003`) on the site's app preview, because it is a window floating on the page. Menus and dialogs, which truly float, may use a similar soft shadow.

## Shapes

- 6px for filter tokens, 8px for buttons, tools and fields, 12px for the work area and callouts, 14px for the preview window.
- Sheet tabs: square top, 8px bottom corners, active tab marked by a 2px cobalt underline.
- Grid cells are square; grid lines are 1px hairlines at 70% strength.

## Components

- **Buttons:** primary (cobalt) and secondary (tone 2). Weight 500. Press: `scale(0.97)` over 160ms. One primary per view.
- **Tool buttons (app):** icon (20px, 1.6 stroke) above a 12px label; transparent until hover (tone 1); press `scale(0.96)`. Export to Excel is the only filled tool.
- **Find field:** sheet background, 1px hairline ring, placeholder "Find in the whole file", ⌘F / Ctrl F hint, match count in cobalt.
- **Filter sentence:** "Show rows where [column] [condition] [value] and …". Column and value are filter tokens (tone 1 fill, cobalt text) that open an editor on click. "+ and…" adds a condition. Match count sits at the right: "12,408 of 48,273,485 rows · fits in one Excel sheet".
- **Formula bar:** name box shows the cell address with the true row number (e.g. "C18,402,116"), then `fx`, then the full raw value.
- **Grid:** canvas-drawn. Column letters (A, B, C…) above column names; row numbers in the ground-coloured gutter; selected row tinted with cobalt at 12%, its row number in cobalt.
- **Sheet tabs:** one per filtered result plus "All rows · N". Active tab: sheet background, cobalt underline.
- **Icons:** Phosphor (`@phosphor-icons/react`), Regular weight, for every app control; one family only, never mixed. Duotone weight (cobalt + tint) only for website illustrations. Later, 2-3 signature icons (e.g. Export to Excel) drawn in-house in the whale's rounded style. Never emoji.

### Motion
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` for everything. Only transform and opacity animate.
- Press feedback 160ms; hover colour 120ms; counters roll up over 700-1100ms when a file opens.
- Nothing animates in response to the keyboard (find, go to row, arrow keys).
- `prefers-reduced-motion`: keep fades, drop movement.

## Do's and Don'ts

**Do**
- Show the real product with realistic data instead of illustrations.
- Write controls and filters in plain words an Excel user would say.
- Keep counts honest and exact: true row numbers, "fits in one Excel sheet".
- Theme the browser's own surfaces: selection, focus ring, caret, scrollbars.

**Don't**
- Add a second accent colour, gradients, glass, glows or decorative shapes.
- Put small uppercase labels or pill badges above headings.
- Use cards with icon-topped headings as layout, or nest cards.
- Use Excel green or copy Microsoft's ribbon visuals; familiar structure, our own look.
- Use monospace outside real code; tabular Hanken figures handle numbers.
- Say "WASM", "index", "parse" or "SIMD" anywhere in the UI.
