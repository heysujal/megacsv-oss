//! Find and filter: decides which rows match, for the grid's filtered view
//! (`run`) and for exports (`extract`). A query with no conditions matches
//! every row.

use std::collections::{HashMap, HashSet};
use std::hash::{DefaultHasher, Hash, Hasher};

use memchr::memmem::Finder;

use crate::rows::{field, next_row, raw_field_spans, split_fields};
use crate::xlsx;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Op {
    Contains,
    Equals,
    StartsWith,
    IsEmpty,
    NotEmpty,
    Between,
    /// Has a value that isn't a number (text in a number column).
    NotNumber,
    /// Equals any value in a list (one per line).
    OneOf,
}

impl Op {
    pub fn from_code(code: u8) -> Option<Op> {
        Some(match code {
            0 => Op::Contains,
            1 => Op::Equals,
            2 => Op::StartsWith,
            3 => Op::IsEmpty,
            4 => Op::NotEmpty,
            5 => Op::Between,
            6 => Op::NotNumber,
            7 => Op::OneOf,
            _ => return None,
        })
    }
}

struct Filter {
    col: usize,
    op: Op,
    /// Lowercased unless `match_case`.
    value: Vec<u8>,
    finder: Finder<'static>,
    min: f64,
    max: f64,
    match_case: bool,
    /// `OneOf` values, trimmed and lowercased unless `match_case`.
    set: HashSet<Vec<u8>>,
}

#[derive(Default)]
struct Scratch {
    lower: Vec<u8>,
    data: Vec<u8>,
    ends: Vec<u32>,
    spans: Vec<(u32, u32)>,
    sub_data: Vec<u8>,
    sub_ends: Vec<u32>,
}

#[derive(Default)]
pub struct Query {
    /// Text anywhere in the row; the needle is lowercased unless matching case.
    text: Option<(Finder<'static>, bool)>,
    filters: Vec<Filter>,
    /// Numbers use a decimal comma (`21,5`, `1.234,5`), as in most semicolon files.
    decimal_comma: bool,
    /// `extract` keeps every `every`-th matching row (1 keeps all).
    every: u64,
    /// Matching rows `extract` has seen so far, for `every`.
    sampled: u64,
    /// `extract` writes only these columns, in this order.
    columns: Option<Vec<usize>>,
    dedupe: Option<Dedupe>,
    scratch: Scratch,
}

/// Which rows count as duplicates, and which one an export keeps.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DedupeKey {
    /// The whole row, byte for byte (ignoring a CR before the newline).
    Row,
    /// One column's value, trimmed and compared without regard to capital letters.
    Column(usize),
}

struct Dedupe {
    key: DedupeKey,
    keep_last: bool,
    /// Keys seen so far (keep first), as 64-bit hashes.
    seen: HashSet<u64>,
    /// Last file row of each key (keep last), filled by `note_last`.
    last: HashMap<u64, u64>,
    max_keys: usize,
}

/// Too many distinct values to remove duplicates in memory.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TooManyKeys;

pub struct RunOut {
    /// `[file row, start offset, next row offset]` per stored match.
    pub matches: Vec<f64>,
    /// All matches, including those beyond `limit`.
    pub count: u64,
    pub rows_seen: u64,
    pub consumed: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Csv,
    Xlsx,
}

pub struct ExtractOut {
    /// Set if removing duplicates ran out of room; the export should stop.
    pub too_many_keys: bool,
    pub bytes: Vec<u8>,
    pub rows_out: u32,
    pub rows_seen: u64,
    pub consumed: usize,
}

/// Output settings for `extract`.
pub struct ExtractSpec<'a> {
    pub format: Format,
    /// Stop after this many output rows (one export part is full).
    pub max_rows: u32,
    /// Spreadsheet row number of the first output row.
    pub xlsx_row: u32,
    /// Appended to a CSV row that has none (the file's last row).
    pub line_ending: &'a [u8],
    /// Source bytes are Windows-1252, not UTF-8.
    pub latin1: bool,
}

impl Query {
    pub fn new() -> Self {
        Self { every: 1, ..Self::default() }
    }

    pub fn set_decimal_comma(&mut self, on: bool) {
        self.decimal_comma = on;
    }

    /// Exports keep one matching row in `n`, starting with the first.
    pub fn set_every(&mut self, n: u64) {
        self.every = n.max(1);
        self.sampled = 0;
    }

    /// Exports drop duplicate rows by `key`, keeping the first (or, with
    /// `keep_last`, the last, after a `note_last` pass over the same rows).
    /// At most `max_keys` distinct keys are held in memory.
    pub fn set_dedupe(&mut self, key: Option<DedupeKey>, keep_last: bool, max_keys: usize) {
        self.dedupe = key.map(|key| Dedupe { key, keep_last, seen: HashSet::new(), last: HashMap::new(), max_keys });
    }

    /// First pass for keep-last: records the last row of each key among the
    /// matching rows of `buf`. Returns (rows seen, bytes consumed).
    #[allow(clippy::too_many_arguments)]
    pub fn note_last(
        &mut self,
        buf: &[u8],
        first_row: u64,
        min_row: u64,
        at_eof: bool,
        delim: u8,
        quote: Option<u8>,
    ) -> Result<(u64, usize), TooManyKeys> {
        let mut pos = 0;
        let mut row = first_row;
        while let Some(span) = next_row(buf, pos, quote, at_eof) {
            let content = &buf[span.start..span.end];
            if row >= min_row && self.test_row(content, delim, quote) {
                let h = self.key_hash(content, delim, quote);
                let d = self.dedupe.as_mut().expect("note_last needs set_dedupe");
                if d.last.len() >= d.max_keys && !d.last.contains_key(&h) {
                    return Err(TooManyKeys);
                }
                d.last.insert(h, row);
            }
            row += 1;
            pos = span.next;
        }
        Ok((row - first_row, pos))
    }

    fn key_hash(&mut self, content: &[u8], delim: u8, quote: Option<u8>) -> u64 {
        let mut h = DefaultHasher::new();
        match self.dedupe.as_ref().map(|d| d.key) {
            Some(DedupeKey::Column(c)) => {
                let Scratch { data, ends, lower, .. } = &mut self.scratch;
                split_fields(content, delim, quote, data, ends);
                lower_into(lower, trim(field(data, ends, c)));
                lower.hash(&mut h);
            }
            _ => content.strip_suffix(b"\r").unwrap_or(content).hash(&mut h),
        }
        h.finish()
    }

    /// For an export with duplicates removed: is this matching row the one to keep?
    fn keep_unique(&mut self, content: &[u8], row: u64, delim: u8, quote: Option<u8>) -> Result<bool, TooManyKeys> {
        if self.dedupe.is_none() {
            return Ok(true);
        }
        let h = self.key_hash(content, delim, quote);
        let d = self.dedupe.as_mut().unwrap();
        if d.keep_last {
            return Ok(d.last.get(&h) == Some(&row));
        }
        if d.seen.len() >= d.max_keys && !d.seen.contains(&h) {
            return Err(TooManyKeys);
        }
        Ok(d.seen.insert(h))
    }

    /// Exports write only these columns, in this order; empty writes them all.
    pub fn set_columns(&mut self, cols: &[usize]) {
        self.columns = (!cols.is_empty()).then(|| cols.to_vec());
    }

    pub fn set_text(&mut self, needle: &[u8], match_case: bool) {
        self.text = (!needle.is_empty()).then(|| {
            let n = if match_case { needle.to_vec() } else { needle.to_ascii_lowercase() };
            (Finder::new(&n).into_owned(), match_case)
        });
    }

    pub fn add_filter(&mut self, col: usize, op: Op, value: &[u8], min: f64, max: f64, match_case: bool) {
        let value = if match_case { value.to_vec() } else { value.to_ascii_lowercase() };
        let value = trim(&value).to_vec();
        let finder = Finder::new(&value).into_owned();
        let set = match op {
            Op::OneOf => value.split(|&b| b == b'\n').map(|v| trim(v).to_vec()).filter(|v| !v.is_empty()).collect(),
            _ => HashSet::new(),
        };
        self.filters.push(Filter { col, op, value, finder, min, max, match_case, set });
    }

    pub fn is_empty(&self) -> bool {
        self.text.is_none() && self.filters.is_empty()
    }

    /// Finds matching rows in `buf`, which starts at a row start at file offset
    /// `base` with file row number `first_row`. Rows before `min_row` (the
    /// header) never match. Stores at most `limit` matches but counts all.
    #[allow(clippy::too_many_arguments)]
    pub fn run(
        &mut self,
        buf: &[u8],
        base: u64,
        first_row: u64,
        min_row: u64,
        at_eof: bool,
        delim: u8,
        quote: Option<u8>,
        limit: usize,
    ) -> RunOut {
        let mut out = RunOut { matches: Vec::new(), count: 0, rows_seen: 0, consumed: 0 };
        let record = |row: u64, start: usize, next: usize, out: &mut RunOut| {
            out.count += 1;
            if out.matches.len() / 3 < limit {
                out.matches.extend([row as f64, (base + start as u64) as f64, (base + next as u64) as f64]);
            }
        };
        let mut pos = 0;
        let mut row = first_row;

        if let (Some((finder, match_case)), true) = (&self.text, self.filters.is_empty()) {
            // Fast path: search the whole buffer once, then map hits to rows.
            let hay: &[u8] = if *match_case {
                buf
            } else {
                lower_into(&mut self.scratch.lower, buf);
                &self.scratch.lower
            };
            let nlen = finder.needle().len();
            let mut hits = finder.find_iter(hay).peekable();
            while let Some(span) = next_row(buf, pos, quote, at_eof) {
                while hits.next_if(|&p| p < span.start).is_some() {}
                let mut hit = false;
                while let Some(&p) = hits.peek() {
                    if p >= span.end {
                        break;
                    }
                    if p + nlen <= span.end {
                        hit = true;
                        break;
                    }
                    hits.next();
                }
                if hit && row >= min_row {
                    record(row, span.start, span.next, &mut out);
                }
                row += 1;
                pos = span.next;
            }
        } else {
            while let Some(span) = next_row(buf, pos, quote, at_eof) {
                if row >= min_row && self.test_row(&buf[span.start..span.end], delim, quote) {
                    record(row, span.start, span.next, &mut out);
                }
                row += 1;
                pos = span.next;
            }
        }
        out.rows_seen = row - first_row;
        out.consumed = pos;
        out
    }

    /// Writes matching rows as CSV (original bytes) or spreadsheet XML, until
    /// `spec.max_rows` rows are written or the buffer runs out.
    #[allow(clippy::too_many_arguments)]
    pub fn extract(
        &mut self,
        buf: &[u8],
        first_row: u64,
        min_row: u64,
        at_eof: bool,
        delim: u8,
        quote: Option<u8>,
        spec: &ExtractSpec,
    ) -> ExtractOut {
        let mut out = ExtractOut { too_many_keys: false, bytes: Vec::new(), rows_out: 0, rows_seen: 0, consumed: 0 };
        let mut pos = 0;
        let mut row = first_row;
        while out.rows_out < spec.max_rows {
            let Some(span) = next_row(buf, pos, quote, at_eof) else { break };
            let content = &buf[span.start..span.end];
            let unique = row >= min_row && self.test_row(content, delim, quote) && {
                match self.keep_unique(content, row, delim, quote) {
                    Ok(keep) => keep,
                    Err(TooManyKeys) => {
                        out.too_many_keys = true;
                        break;
                    }
                }
            };
            if unique && self.take_sample() {
                let Scratch { data, ends, spans, sub_data, sub_ends, .. } = &mut self.scratch;
                match (spec.format, &self.columns) {
                    (Format::Csv, None) => {
                        out.bytes.extend_from_slice(&buf[span.start..span.next]);
                        if span.next == span.end {
                            out.bytes.extend_from_slice(spec.line_ending);
                        }
                    }
                    (Format::Csv, Some(cols)) => {
                        // Chosen fields byte for byte, joined with the file's delimiter,
                        // then the row's own line ending.
                        let core = content.strip_suffix(b"\r").unwrap_or(content);
                        raw_field_spans(core, delim, quote, spans);
                        for (i, &c) in cols.iter().enumerate() {
                            if i > 0 {
                                out.bytes.push(delim);
                            }
                            if let Some(&(s, e)) = spans.get(c) {
                                out.bytes.extend_from_slice(&core[s as usize..e as usize]);
                            }
                        }
                        if span.next == span.end {
                            out.bytes.extend_from_slice(spec.line_ending);
                        } else {
                            out.bytes.extend_from_slice(&buf[span.start + core.len()..span.next]);
                        }
                    }
                    (Format::Xlsx, cols) => {
                        split_fields(content, delim, quote, data, ends);
                        let (d, e): (&[u8], &[u32]) = match cols {
                            None => (data, ends),
                            Some(cols) => {
                                sub_data.clear();
                                sub_ends.clear();
                                for &c in cols {
                                    sub_data.extend_from_slice(field(data, ends, c));
                                    sub_ends.push(sub_data.len() as u32);
                                }
                                (sub_data, sub_ends)
                            }
                        };
                        xlsx::write_row(&mut out.bytes, spec.xlsx_row + out.rows_out, d, e, spec.latin1);
                    }
                }
                out.rows_out += 1;
            }
            row += 1;
            pos = span.next;
        }
        out.rows_seen = row - first_row;
        out.consumed = pos;
        out
    }

    /// Counts a matching row for `every`; true if the export keeps it.
    fn take_sample(&mut self) -> bool {
        let keep = self.sampled.is_multiple_of(self.every);
        self.sampled += 1;
        keep
    }

    /// Does one row's content (without its newline) match?
    pub fn test_row(&mut self, row: &[u8], delim: u8, quote: Option<u8>) -> bool {
        let Query { text, filters, scratch, decimal_comma, .. } = self;
        if let Some((finder, match_case)) = text {
            let hay: &[u8] = if *match_case {
                row
            } else {
                lower_into(&mut scratch.lower, row);
                &scratch.lower
            };
            if finder.find(hay).is_none() {
                return false;
            }
        }
        if filters.is_empty() {
            return true;
        }
        split_fields(row, delim, quote, &mut scratch.data, &mut scratch.ends);
        filters.iter().all(|f| {
            let v = field(&scratch.data, &scratch.ends, f.col);
            f.test(v, &mut scratch.lower, *decimal_comma)
        })
    }
}

impl Filter {
    fn test(&self, raw: &[u8], lower: &mut Vec<u8>, decimal_comma: bool) -> bool {
        match self.op {
            Op::IsEmpty => return trim(raw).is_empty(),
            Op::NotEmpty => return !trim(raw).is_empty(),
            Op::Between => {
                return parse_number_with(raw, decimal_comma).is_some_and(|n| n >= self.min && n <= self.max);
            }
            Op::NotNumber => {
                return !trim(raw).is_empty() && parse_number_with(raw, decimal_comma).is_none();
            }
            _ => {}
        }
        let v: &[u8] = if self.match_case {
            raw
        } else {
            lower_into(lower, raw);
            lower
        };
        match self.op {
            Op::Contains => self.finder.find(v).is_some(),
            Op::Equals => trim(v) == self.value.as_slice(),
            Op::StartsWith => trim(v).starts_with(&self.value),
            Op::OneOf => self.set.contains(trim(v)),
            _ => unreachable!(),
        }
    }
}

fn lower_into(out: &mut Vec<u8>, src: &[u8]) {
    out.clear();
    out.extend(src.iter().map(u8::to_ascii_lowercase));
}

fn trim(v: &[u8]) -> &[u8] {
    v.trim_ascii()
}

/// Parses `1234`, `-12.5`, `1,234,567.89`. Anything else (currency symbols,
/// European `1,5`, text) is not a number.
pub fn parse_number(raw: &[u8]) -> Option<f64> {
    parse_number_with(raw, false)
}

/// Like `parse_number`; with `decimal_comma`, the comma is the decimal point and
/// dots group thousands (`21,5`, `1.234.567,89`). A dot that can't be a thousands
/// separator is read as a decimal point (`21.5`), since such files mix both.
pub fn parse_number_with(raw: &[u8], decimal_comma: bool) -> Option<f64> {
    let s = trim(raw);
    let first = *s.first()?;
    if !(first.is_ascii_digit() || matches!(first, b'-' | b'+' | b'.' | b',')) || s.len() > 64 {
        return None;
    }
    let (group, point) = if decimal_comma { (b'.', b',') } else { (b',', b'.') };
    let unsigned = s.strip_prefix(b"-").or_else(|| s.strip_prefix(b"+")).unwrap_or(s);
    let int_end = unsigned.iter().position(|&b| b == point).unwrap_or(unsigned.len());
    let int_part = &unsigned[..int_end];
    let mut grouped = false;
    if int_part.contains(&group) {
        let mut groups = int_part.split(|&b| b == group);
        let head_ok = groups.next().is_some_and(|g| (1..=3).contains(&g.len()));
        if head_ok && groups.all(|g| g.len() == 3) {
            grouped = true;
        } else if !(decimal_comma && !s.contains(&b',')) {
            return None;
        }
    }
    let mut buf = [0u8; 64];
    let mut n = 0;
    for &b in s {
        if grouped && b == group {
            continue;
        }
        buf[n] = if b == point { b'.' } else { b };
        n += 1;
    }
    let v: f64 = std::str::from_utf8(&buf[..n]).ok()?.parse().ok()?;
    v.is_finite().then_some(v)
}
