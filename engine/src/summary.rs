//! Group-by summaries: rows per value of one column, with the count, sum,
//! smallest and largest number of another. Each worker summarizes its part of
//! the file; the caller merges the parts.

use std::collections::HashMap;

use crate::query::{Query, parse_number_with};
use crate::rows::{field, next_row, split_fields};

/// Totals for one group.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Agg {
    pub rows: u64,
    /// Rows whose value cell is empty.
    pub empty: u64,
    /// Rows whose value cell is a number.
    pub numbers: u64,
    pub sum: f64,
    pub min: f64,
    pub max: f64,
}

impl Default for Agg {
    fn default() -> Self {
        Agg { rows: 0, empty: 0, numbers: 0, sum: 0.0, min: f64::INFINITY, max: f64::NEG_INFINITY }
    }
}

impl Agg {
    fn add(&mut self, value: Option<&[u8]>, decimal_comma: bool) {
        self.rows += 1;
        let Some(v) = value else { return };
        let v = v.trim_ascii();
        if v.is_empty() {
            self.empty += 1;
        } else if let Some(n) = parse_number_with(v, decimal_comma) {
            self.numbers += 1;
            self.sum += n;
            self.min = self.min.min(n);
            self.max = self.max.max(n);
        }
    }
}

pub struct Summary {
    group: Option<usize>,
    value: Option<usize>,
    decimal_comma: bool,
    max_groups: usize,
    groups: HashMap<Vec<u8>, Agg>,
    /// Rows in groups that didn't fit under `max_groups`.
    pub other: Agg,
    data: Vec<u8>,
    ends: Vec<u32>,
}

/// Flat result: group keys back to back, the end of each key, and six
/// numbers per group (rows, empty, numbers, sum, min, max). The last group
/// is the "other" bucket, with an empty key.
pub struct SummaryOut {
    pub keys: Vec<u8>,
    pub key_ends: Vec<u32>,
    pub stats: Vec<f64>,
}

impl Summary {
    /// `group`: column to group by (None: one group for all rows). `value`:
    /// column to total (None: count rows only).
    pub fn new(group: Option<usize>, value: Option<usize>, decimal_comma: bool, max_groups: usize) -> Self {
        Summary {
            group,
            value,
            decimal_comma,
            max_groups: max_groups.max(1),
            groups: HashMap::new(),
            other: Agg::default(),
            data: Vec::new(),
            ends: Vec::new(),
        }
    }

    /// Adds the rows of `buf` that match `query`. `buf` starts at a row start
    /// with file row number `first_row`; rows before `min_row` are skipped.
    /// Returns (rows seen, bytes consumed).
    #[allow(clippy::too_many_arguments)]
    pub fn add(
        &mut self,
        query: &mut Query,
        buf: &[u8],
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
                let value = self.value.map(|c| field(&self.data, &self.ends, c));
                let key = self.group.map_or(&[][..], |c| field(&self.data, &self.ends, c).trim_ascii());
                let dc = self.decimal_comma;
                if let Some(a) = self.groups.get_mut(key) {
                    a.add(value, dc);
                } else if self.groups.len() < self.max_groups {
                    self.groups.entry(key.to_vec()).or_default().add(value, dc);
                } else {
                    self.other.add(value, dc);
                }
            }
            row += 1;
            pos = span.next;
        }
        (row - first_row, pos)
    }

    pub fn finish(self) -> SummaryOut {
        let mut out = SummaryOut { keys: Vec::new(), key_ends: Vec::new(), stats: Vec::with_capacity((self.groups.len() + 1) * 6) };
        let push = |out: &mut SummaryOut, key: &[u8], a: &Agg| {
            out.keys.extend_from_slice(key);
            out.key_ends.push(out.keys.len() as u32);
            out.stats.extend([a.rows as f64, a.empty as f64, a.numbers as f64, a.sum, a.min, a.max]);
        };
        for (k, a) in &self.groups {
            push(&mut out, k, a);
        }
        push(&mut out, &[], &self.other);
        out
    }
}
