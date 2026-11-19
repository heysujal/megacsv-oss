//! Sorting by one column, in sorted runs that are merged later.
//!
//! Each value becomes a key whose plain byte order is the sort order, so runs
//! can be merged by comparing bytes (then file row, which keeps ties in file
//! order). The order follows Excel: numbers, then text (ignoring ASCII case),
//! and empty cells last in both directions.
//!
//! Key layout: one class byte, then the value, then for text a 0 terminator.
//! - number: class 1, then the f64 in 8 order-preserving big-endian bytes;
//! - text: class 2, the trimmed text lowercased (ASCII), cut to `max_text`
//!   bytes, then 0;
//! - empty: the single byte 0xFF.
//!
//! Descending inverts every byte of number and text keys (classes become 0xFE
//! and 0xFD), which reverses their order and puts text before numbers, while
//! empty cells keep 0xFF and stay last.
//!
//! A run is a sequence of records: key length (u16, little-endian), key bytes,
//! then file row, start offset and next-row offset as f64 little-endian.

use crate::query::{parse_number_with, Query};
use crate::rows::{field, next_row, split_fields};

pub const EMPTY: u8 = 0xFF;
const NUMBER: u8 = 1;
const TEXT: u8 = 2;
/// Bytes after the key in a record: file row, start, next.
pub const TAIL: usize = 24;

/// Appends the sort key of one raw field to `out`.
pub fn encode_key(raw: &[u8], decimal_comma: bool, descending: bool, max_text: usize, out: &mut Vec<u8>) {
    let v = raw.trim_ascii();
    if v.is_empty() {
        out.push(EMPTY);
        return;
    }
    let from = out.len();
    if let Some(n) = parse_number_with(v, decimal_comma) {
        let n = if n == 0.0 { 0.0 } else { n };
        let bits = n.to_bits();
        let ordered = if bits >> 63 == 1 { !bits } else { bits | (1 << 63) };
        out.push(NUMBER);
        out.extend_from_slice(&ordered.to_be_bytes());
    } else {
        out.push(TEXT);
        let cut = &v[..v.len().min(max_text)];
        out.extend(cut.iter().map(u8::to_ascii_lowercase));
        out.push(0);
    }
    if descending {
        for b in &mut out[from..] {
            *b = !*b;
        }
    }
}

/// Collects keys for the matching rows of a range, then writes them as one sorted run.
pub struct SortKeys {
    col: usize,
    descending: bool,
    decimal_comma: bool,
    max_text: usize,
    keys: Vec<u8>,
    /// Per row: key start in `keys`, key length, file row, start, next.
    recs: Vec<(u32, u16, u64, u64, u64)>,
    data: Vec<u8>,
    ends: Vec<u32>,
}

impl SortKeys {
    pub fn new(col: usize, descending: bool, decimal_comma: bool, max_text: usize) -> Self {
        SortKeys {
            col,
            descending,
            decimal_comma,
            max_text: max_text.clamp(1, 4096),
            keys: Vec::new(),
            recs: Vec::new(),
            data: Vec::new(),
            ends: Vec::new(),
        }
    }

    pub fn len(&self) -> usize {
        self.recs.len()
    }

    pub fn is_empty(&self) -> bool {
        self.recs.is_empty()
    }

    /// Adds the rows of `buf` that match `query`. `buf` starts at a row start at
    /// file offset `base` with file row number `first_row`; rows before
    /// `min_row` are skipped. Returns (rows seen, bytes consumed).
    #[allow(clippy::too_many_arguments)]
    pub fn add(
        &mut self,
        query: &mut Query,
        buf: &[u8],
        base: u64,
        first_row: u64,
        min_row: u64,
        at_eof: bool,
        delim: u8,
        quote: Option<u8>,
    ) -> (u64, usize) {
        let mut pos = 0;
        let mut row = first_row;
        let check = !query.is_empty();
        while let Some(span) = next_row(buf, pos, quote, at_eof) {
            let content = &buf[span.start..span.end];
            if row >= min_row && (!check || query.test_row(content, delim, quote)) {
                split_fields(content, delim, quote, &mut self.data, &mut self.ends);
                let from = self.keys.len();
                encode_key(field(&self.data, &self.ends, self.col), self.decimal_comma, self.descending, self.max_text, &mut self.keys);
                let len = (self.keys.len() - from) as u16;
                self.recs.push((from as u32, len, row, base + span.start as u64, base + span.next as u64));
            }
            row += 1;
            pos = span.next;
        }
        (row - first_row, pos)
    }

    /// The collected rows as one run, sorted by key and then file row.
    pub fn finish(&mut self) -> Vec<u8> {
        let keys = &self.keys;
        let key = |r: &(u32, u16, u64, u64, u64)| &keys[r.0 as usize..r.0 as usize + r.1 as usize];
        self.recs.sort_unstable_by(|a, b| key(a).cmp(key(b)).then(a.2.cmp(&b.2)));
        let mut out = Vec::with_capacity(self.keys.len() + self.recs.len() * (2 + TAIL));
        for r in &self.recs {
            out.extend_from_slice(&r.1.to_le_bytes());
            out.extend_from_slice(key(r));
            out.extend_from_slice(&(r.2 as f64).to_le_bytes());
            out.extend_from_slice(&(r.3 as f64).to_le_bytes());
            out.extend_from_slice(&(r.4 as f64).to_le_bytes());
        }
        self.keys.clear();
        self.recs.clear();
        out
    }
}

/// One record of a run: (key, file row, start, next). For tests and merging.
pub fn read_record(run: &[u8], pos: usize) -> Option<(&[u8], f64, f64, f64, usize)> {
    let len = u16::from_le_bytes(run.get(pos..pos + 2)?.try_into().ok()?) as usize;
    let key = run.get(pos + 2..pos + 2 + len)?;
    let t = pos + 2 + len;
    let f = |i: usize| -> Option<f64> { Some(f64::from_le_bytes(run.get(t + i * 8..t + i * 8 + 8)?.try_into().ok()?)) };
    Some((key, f(0)?, f(1)?, f(2)?, t + TAIL))
}
