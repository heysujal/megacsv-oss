//! Browser bindings. Byte offsets and counts cross as `f64` (exact below 2^53).

use wasm_bindgen::prelude::*;

use crate::{index, parse, query, rows, scan, sniff, sort, summary};

fn quote_opt(quote: u8) -> Option<u8> {
    (quote != 0).then_some(quote)
}

/// Scans one chunk; returns `ChunkScan::to_flat`. `quote` 0 means none.
#[wasm_bindgen(js_name = scanChunk)]
pub fn scan_chunk(bytes: &[u8], base: f64, quote: u8) -> Vec<f64> {
    scan::scan_chunk(bytes, base as u64, quote_opt(quote), scan::CHECKPOINT_EVERY).to_flat()
}

#[wasm_bindgen]
pub struct Index(index::Index);

#[wasm_bindgen]
impl Index {
    #[wasm_bindgen(constructor)]
    pub fn new(data_start: f64, file_len: f64) -> Index {
        Index(index::Index::new(data_start as u64, file_len as u64))
    }

    /// Adds a chunk result from `scanChunk`. Chunks may arrive in any order.
    #[wasm_bindgen(js_name = pushChunk)]
    pub fn push_chunk(&mut self, flat: &[f64]) -> Result<(), JsError> {
        let chunk = scan::ChunkScan::from_flat(flat).ok_or_else(|| JsError::new("bad chunk"))?;
        self.0.push(chunk);
        Ok(())
    }

    #[wasm_bindgen(js_name = indexedBytes)]
    pub fn indexed_bytes(&self) -> f64 {
        self.0.indexed_bytes() as f64
    }

    #[wasm_bindgen(js_name = isComplete)]
    pub fn is_complete(&self) -> bool {
        self.0.is_complete()
    }

    #[wasm_bindgen(js_name = rowCount)]
    pub fn row_count(&self) -> f64 {
        self.0.row_count() as f64
    }

    #[wasm_bindgen(js_name = endsInsideQuotes)]
    pub fn ends_inside_quotes(&self) -> bool {
        self.0.ends_inside_quotes()
    }

    /// `[byteOffset, rowAtOffset]` of the nearest checkpoint at or before `row`.
    pub fn locate(&self, row: f64) -> Vec<f64> {
        let (off, r) = self.0.locate(row as u64);
        vec![off as f64, r as f64]
    }

    /// Row-aligned work ranges, flat `[start, end, firstRow, ...]`.
    pub fn units(&self, target: f64) -> Vec<f64> {
        self.0.units(target as u64).into_iter().flat_map(|(s, e, r)| [s as f64, e as f64, r as f64]).collect()
    }

    /// Units from checkpoint offset `from` over the part read so far.
    #[wasm_bindgen(js_name = unitsFrom)]
    pub fn units_from(&self, from: f64, target: f64) -> Vec<f64> {
        self.0
            .units_from(from as u64, target as u64)
            .into_iter()
            .flat_map(|(s, e, r)| [s as f64, e as f64, r as f64])
            .collect()
    }

    #[wasm_bindgen(js_name = toBytes)]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_bytes()
    }

    #[wasm_bindgen(js_name = fromBytes)]
    pub fn from_bytes(bytes: &[u8]) -> Option<Index> {
        index::Index::from_bytes(bytes).map(Index)
    }
}

/// Offset just past the first row in `buf` (or its length at end of file); -1 if incomplete.
#[wasm_bindgen(js_name = firstRowEnd)]
pub fn first_row_end(buf: &[u8], quote: u8, at_eof: bool) -> f64 {
    rows::next_row(buf, 0, quote_opt(quote), at_eof).map_or(-1.0, |s| s.next as f64)
}

#[wasm_bindgen]
pub struct Query(query::Query);

#[wasm_bindgen]
pub struct RunOut {
    matches: Vec<f64>,
    #[wasm_bindgen(readonly)]
    pub count: f64,
    #[wasm_bindgen(readonly, js_name = rowsSeen)]
    pub rows_seen: f64,
    #[wasm_bindgen(readonly)]
    pub consumed: f64,
}

#[wasm_bindgen]
impl RunOut {
    /// `[fileRow, start, next, ...]` per stored match.
    #[wasm_bindgen(getter)]
    pub fn matches(&self) -> Vec<f64> {
        self.matches.clone()
    }
}

#[wasm_bindgen]
pub struct ExtractOut {
    #[wasm_bindgen(readonly, js_name = tooManyKeys)]
    pub too_many_keys: bool,
    bytes: Vec<u8>,
    #[wasm_bindgen(readonly, js_name = rowsOut)]
    pub rows_out: u32,
    #[wasm_bindgen(readonly, js_name = rowsSeen)]
    pub rows_seen: f64,
    #[wasm_bindgen(readonly)]
    pub consumed: f64,
}

#[wasm_bindgen]
impl ExtractOut {
    #[wasm_bindgen(getter)]
    pub fn bytes(&self) -> Vec<u8> {
        self.bytes.clone()
    }
}

#[wasm_bindgen]
impl Query {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Query {
        Query(query::Query::new())
    }

    #[wasm_bindgen(js_name = setText)]
    pub fn set_text(&mut self, needle: &[u8], match_case: bool) {
        self.0.set_text(needle, match_case);
    }

    /// Numbers in this file use a decimal comma (`21,5`).
    #[wasm_bindgen(js_name = setDecimalComma)]
    pub fn set_decimal_comma(&mut self, on: bool) {
        self.0.set_decimal_comma(on);
    }

    /// Exports drop duplicates. `key`: -1 none, -2 whole rows, else a column.
    #[wasm_bindgen(js_name = setDedupe)]
    pub fn set_dedupe(&mut self, key: i32, keep_last: bool, max_keys: u32) {
        let key = match key {
            -1 => None,
            -2 => Some(query::DedupeKey::Row),
            c => Some(query::DedupeKey::Column(c.max(0) as usize)),
        };
        self.0.set_dedupe(key, keep_last, max_keys as usize);
    }

    /// First pass for keep-last; returns `[rows seen, bytes consumed]`.
    #[allow(clippy::too_many_arguments)]
    #[wasm_bindgen(js_name = noteLast)]
    pub fn note_last(
        &mut self,
        buf: &[u8],
        first_row: f64,
        min_row: f64,
        at_eof: bool,
        delimiter: u8,
        quote: u8,
    ) -> Result<Vec<f64>, JsError> {
        let (seen, consumed) = self
            .0
            .note_last(buf, first_row as u64, min_row as u64, at_eof, delimiter, quote_opt(quote))
            .map_err(|_| JsError::new("too many different values to remove duplicates"))?;
        Ok(vec![seen as f64, consumed as f64])
    }

    /// Exports keep one matching row in `n`.
    #[wasm_bindgen(js_name = setEvery)]
    pub fn set_every(&mut self, n: f64) {
        self.0.set_every(n as u64);
    }

    /// Exports write only these columns, in this order; empty writes all.
    #[wasm_bindgen(js_name = setColumns)]
    pub fn set_columns(&mut self, cols: &[u32]) {
        let cols: Vec<usize> = cols.iter().map(|&c| c as usize).collect();
        self.0.set_columns(&cols);
    }

    /// `op`: 0 contains, 1 equals, 2 starts with, 3 is empty, 4 not empty, 5 between,
    /// 6 not a number, 7 one of (`value` holds one value per line).
    #[wasm_bindgen(js_name = addFilter)]
    pub fn add_filter(
        &mut self,
        col: u32,
        op: u8,
        value: &[u8],
        min: f64,
        max: f64,
        match_case: bool,
    ) -> Result<(), JsError> {
        let op = query::Op::from_code(op).ok_or_else(|| JsError::new("unknown filter"))?;
        self.0.add_filter(col as usize, op, value, min, max, match_case);
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn run(
        &mut self,
        buf: &[u8],
        base: f64,
        first_row: f64,
        min_row: f64,
        at_eof: bool,
        delimiter: u8,
        quote: u8,
        limit: f64,
    ) -> RunOut {
        let out = self.0.run(
            buf,
            base as u64,
            first_row as u64,
            min_row as u64,
            at_eof,
            delimiter,
            quote_opt(quote),
            limit as usize,
        );
        RunOut {
            matches: out.matches,
            count: out.count as f64,
            rows_seen: out.rows_seen as f64,
            consumed: out.consumed as f64,
        }
    }

    /// `xlsx`: spreadsheet XML instead of CSV bytes.
    #[allow(clippy::too_many_arguments)]
    pub fn extract(
        &mut self,
        buf: &[u8],
        first_row: f64,
        min_row: f64,
        at_eof: bool,
        delimiter: u8,
        quote: u8,
        xlsx: bool,
        max_rows: u32,
        xlsx_row: u32,
        line_ending: &[u8],
        latin1: bool,
    ) -> ExtractOut {
        let spec = query::ExtractSpec {
            format: if xlsx { query::Format::Xlsx } else { query::Format::Csv },
            max_rows,
            xlsx_row,
            line_ending,
            latin1,
        };
        let out = self.0.extract(buf, first_row as u64, min_row as u64, at_eof, delimiter, quote_opt(quote), &spec);
        ExtractOut {
            too_many_keys: out.too_many_keys,
            bytes: out.bytes,
            rows_out: out.rows_out,
            rows_seen: out.rows_seen as f64,
            consumed: out.consumed as f64,
        }
    }
}

impl Default for Query {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
pub struct ParsedRows(parse::ParsedRows);

#[wasm_bindgen]
impl ParsedRows {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.0.data.clone()
    }
    #[wasm_bindgen(getter, js_name = fieldEnds)]
    pub fn field_ends(&self) -> Vec<u32> {
        self.0.field_ends.clone()
    }
    #[wasm_bindgen(getter, js_name = rowFieldCounts)]
    pub fn row_field_counts(&self) -> Vec<u32> {
        self.0.row_field_counts.clone()
    }
    #[wasm_bindgen(getter, js_name = rowsSkipped)]
    pub fn rows_skipped(&self) -> u32 {
        self.0.rows_skipped
    }
    #[wasm_bindgen(getter)]
    pub fn consumed(&self) -> f64 {
        self.0.consumed as f64
    }
}

#[wasm_bindgen(js_name = parseRows)]
pub fn parse_rows(
    buf: &[u8],
    delimiter: u8,
    quote: u8,
    skip: u32,
    max_rows: u32,
    at_eof: bool,
) -> ParsedRows {
    ParsedRows(parse::parse_rows(
        buf,
        delimiter,
        quote_opt(quote),
        skip as usize,
        max_rows as usize,
        at_eof,
    ))
}

#[wasm_bindgen]
pub struct Sniff(sniff::Sniff);

#[wasm_bindgen]
impl Sniff {
    #[wasm_bindgen(getter)]
    pub fn encoding(&self) -> String {
        self.0.encoding.label().into()
    }
    #[wasm_bindgen(getter, js_name = dataStart)]
    pub fn data_start(&self) -> f64 {
        self.0.data_start as f64
    }
    #[wasm_bindgen(getter)]
    pub fn delimiter(&self) -> u8 {
        self.0.delimiter
    }
    #[wasm_bindgen(getter, js_name = lineEndings)]
    pub fn line_endings(&self) -> String {
        format!("{:?}", self.0.line_endings).to_lowercase()
    }
    #[wasm_bindgen(getter, js_name = hasHeader)]
    pub fn has_header(&self) -> bool {
        self.0.has_header
    }
}

#[wasm_bindgen]
pub fn sniff(sample: &[u8], whole_file: bool) -> Sniff {
    Sniff(sniff::sniff(sample, whole_file))
}

#[wasm_bindgen]
pub struct Summary(Option<summary::Summary>);

#[wasm_bindgen]
pub struct SummaryOut {
    keys: Vec<u8>,
    key_ends: Vec<u32>,
    stats: Vec<f64>,
}

#[wasm_bindgen]
impl SummaryOut {
    #[wasm_bindgen(getter)]
    pub fn keys(&self) -> Vec<u8> {
        self.keys.clone()
    }
    #[wasm_bindgen(getter, js_name = keyEnds)]
    pub fn key_ends(&self) -> Vec<u32> {
        self.key_ends.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn stats(&self) -> Vec<f64> {
        self.stats.clone()
    }
}

#[wasm_bindgen]
impl Summary {
    /// `group` and `value`: column numbers, or -1 for none.
    #[wasm_bindgen(constructor)]
    pub fn new(group: i32, value: i32, decimal_comma: bool, max_groups: u32) -> Summary {
        let col = |c: i32| (c >= 0).then_some(c as usize);
        Summary(Some(summary::Summary::new(col(group), col(value), decimal_comma, max_groups as usize)))
    }

    /// Adds matching rows of `buf`; returns `[rows seen, bytes consumed]`.
    #[allow(clippy::too_many_arguments)]
    pub fn add(
        &mut self,
        query: &mut Query,
        buf: &[u8],
        first_row: f64,
        min_row: f64,
        at_eof: bool,
        delimiter: u8,
        quote: u8,
    ) -> Vec<f64> {
        let s = self.0.as_mut().expect("summary already finished");
        let (seen, consumed) = s.add(&mut query.0, buf, first_row as u64, min_row as u64, at_eof, delimiter, quote_opt(quote));
        vec![seen as f64, consumed as f64]
    }

    pub fn finish(&mut self) -> SummaryOut {
        let out = self.0.take().expect("summary already finished").finish();
        SummaryOut { keys: out.keys, key_ends: out.key_ends, stats: out.stats }
    }
}

/// Sort keys for one range of the file, written as one sorted run (see `sort.rs`).
#[wasm_bindgen]
pub struct SortKeys(sort::SortKeys);

#[wasm_bindgen]
impl SortKeys {
    #[wasm_bindgen(constructor)]
    pub fn new(col: u32, descending: bool, decimal_comma: bool, max_text: u32) -> SortKeys {
        SortKeys(sort::SortKeys::new(col as usize, descending, decimal_comma, max_text as usize))
    }

    /// Adds matching rows of `buf`; returns `[rows seen, bytes consumed]`.
    #[allow(clippy::too_many_arguments)]
    pub fn add(
        &mut self,
        query: &mut Query,
        buf: &[u8],
        base: f64,
        first_row: f64,
        min_row: f64,
        at_eof: bool,
        delimiter: u8,
        quote: u8,
    ) -> Vec<f64> {
        let (seen, consumed) =
            self.0.add(&mut query.0, buf, base as u64, first_row as u64, min_row as u64, at_eof, delimiter, quote_opt(quote));
        vec![seen as f64, consumed as f64]
    }

    /// Rows collected so far.
    pub fn count(&self) -> u32 {
        self.0.len() as u32
    }

    /// The collected rows as one sorted run; starts a new one.
    pub fn finish(&mut self) -> Vec<u8> {
        self.0.finish()
    }
}
