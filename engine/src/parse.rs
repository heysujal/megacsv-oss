//! Row parser for viewport reads.
//!
//! Uses the same quote-parity model as the scanner (a quote byte always
//! toggles the state) so parsed rows line up with indexed row numbers even on
//! malformed files. A doubled quote inside a quoted field yields one quote.

#[derive(Debug, Default, PartialEq)]
pub struct ParsedRows {
    /// Unescaped field bytes, back to back.
    pub data: Vec<u8>,
    /// End offset in `data` of each field.
    pub field_ends: Vec<u32>,
    /// Number of fields in each emitted row.
    pub row_field_counts: Vec<u32>,
    /// Rows skipped before emitting began.
    pub rows_skipped: u32,
    /// Bytes of `buf` consumed through the last complete row.
    pub consumed: usize,
}

impl ParsedRows {
    pub fn rows(&self) -> usize {
        self.row_field_counts.len()
    }

    /// Fields of every row as byte slices (for tests and native tools).
    pub fn to_vecs(&self) -> Vec<Vec<&[u8]>> {
        let mut out = Vec::with_capacity(self.rows());
        let mut f = 0;
        let mut start = 0usize;
        for &n in &self.row_field_counts {
            let mut row = Vec::with_capacity(n as usize);
            for _ in 0..n {
                let end = self.field_ends[f] as usize;
                row.push(&self.data[start..end]);
                start = end;
                f += 1;
            }
            out.push(row);
        }
        out
    }
}

/// Parse rows from `buf`, which must begin at a row start. Skips `skip` rows,
/// then emits up to `max_rows`. A final row with no newline is only accepted
/// when `at_eof` (the buffer reaches the end of the file).
pub fn parse_rows(
    buf: &[u8],
    delim: u8,
    quote: Option<u8>,
    skip: usize,
    max_rows: usize,
    at_eof: bool,
) -> ParsedRows {
    let mut out = ParsedRows::default();
    let q = quote.unwrap_or(0);
    let has_quote = quote.is_some();

    let mut row_index = 0usize; // rows seen, including skipped ones
    let mut inside = false;
    let mut pending_cr = false;
    // Row state, rolled back if the buffer ends mid-row.
    let mut row_data_start = 0usize;
    let mut row_field_start = out.field_ends.len();
    let mut fields_in_row = 0u32;
    let mut row_has_bytes = false;

    let mut i = 0;
    while i < buf.len() && out.rows() < max_rows {
        let b = buf[i];
        let emitting = row_index >= skip;
        if pending_cr {
            pending_cr = false;
            if b != b'\n' && emitting {
                out.data.push(b'\r');
            }
        }
        if has_quote && b == q {
            row_has_bytes = true;
            if inside && buf.get(i + 1) == Some(&q) {
                if emitting {
                    out.data.push(q);
                }
                i += 2;
                continue;
            }
            inside = !inside;
        } else if inside {
            row_has_bytes = true;
            if emitting {
                out.data.push(b);
            }
        } else if b == delim {
            row_has_bytes = true;
            if emitting {
                out.field_ends.push(out.data.len() as u32);
                fields_in_row += 1;
            }
        } else if b == b'\n' {
            if emitting {
                out.field_ends.push(out.data.len() as u32);
                out.row_field_counts.push(fields_in_row + 1);
            } else {
                out.rows_skipped += 1;
            }
            row_index += 1;
            fields_in_row = 0;
            row_has_bytes = false;
            out.consumed = i + 1;
            row_data_start = out.data.len();
            row_field_start = out.field_ends.len();
        } else if b == b'\r' {
            row_has_bytes = true;
            pending_cr = true;
        } else {
            row_has_bytes = true;
            if emitting {
                out.data.push(b);
            }
        }
        i += 1;
    }

    let reached_end = i >= buf.len();
    if reached_end && at_eof && row_has_bytes && out.rows() < max_rows {
        // Final unterminated row; a trailing lone CR is treated as its terminator.
        if row_index >= skip {
            out.field_ends.push(out.data.len() as u32);
            out.row_field_counts.push(fields_in_row + 1);
        } else {
            out.rows_skipped += 1;
        }
        out.consumed = buf.len();
    } else {
        // Drop the partial row.
        out.data.truncate(row_data_start);
        out.field_ends.truncate(row_field_start);
    }
    out
}
