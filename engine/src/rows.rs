//! Row and field splitting for queries and exports. Uses the same quote model
//! as `parse` and `scan`, so results line up with indexed row numbers.

use memchr::{memchr, memchr2_iter};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RowSpan {
    pub start: usize,
    /// End of the row's content, before its newline.
    pub end: usize,
    /// Where the next row starts (after the newline, or the buffer end).
    pub next: usize,
}

/// The row starting at `pos`. Returns `None` at the end of the buffer, or if
/// the buffer ends mid-row and this is not the end of the file.
pub fn next_row(buf: &[u8], pos: usize, quote: Option<u8>, at_eof: bool) -> Option<RowSpan> {
    if pos >= buf.len() {
        return None;
    }
    let rest = &buf[pos..];
    let newline = match quote {
        Some(q) => {
            let mut inside = false;
            let mut found = None;
            for i in memchr2_iter(q, b'\n', rest) {
                if rest[i] == q {
                    inside = !inside;
                } else if !inside {
                    found = Some(i);
                    break;
                }
            }
            found
        }
        None => memchr(b'\n', rest),
    };
    match newline {
        Some(i) => Some(RowSpan { start: pos, end: pos + i, next: pos + i + 1 }),
        None => at_eof.then_some(RowSpan { start: pos, end: buf.len(), next: buf.len() }),
    }
}

/// Splits one row's content (no newline) into unescaped fields, clearing and
/// filling `data` and `ends` (end offset of each field in `data`).
pub fn split_fields(row: &[u8], delim: u8, quote: Option<u8>, data: &mut Vec<u8>, ends: &mut Vec<u32>) {
    data.clear();
    ends.clear();
    let mut inside = false;
    let mut pending_cr = false;
    let mut i = 0;
    while i < row.len() {
        let b = row[i];
        if pending_cr {
            pending_cr = false;
            data.push(b'\r');
        }
        if Some(b) == quote {
            if inside && row.get(i + 1) == Some(&b) {
                data.push(b);
                i += 2;
                continue;
            }
            inside = !inside;
        } else if inside {
            data.push(b);
        } else if b == delim {
            ends.push(data.len() as u32);
        } else if b == b'\r' {
            // Dropped if it ends the row (CRLF); kept if anything follows.
            pending_cr = true;
        } else {
            data.push(b);
        }
        i += 1;
    }
    ends.push(data.len() as u32);
}

/// Field `i` of a row split by `split_fields`; empty if the row is shorter.
pub fn field<'a>(data: &'a [u8], ends: &[u32], i: usize) -> &'a [u8] {
    match ends.get(i) {
        Some(&end) => {
            let start = if i == 0 { 0 } else { ends[i - 1] as usize };
            &data[start..end as usize]
        }
        None => &[],
    }
}

/// Byte ranges of each field in one row's content (no newline), quotes
/// included, so fields can be copied exactly as written.
pub fn raw_field_spans(row: &[u8], delim: u8, quote: Option<u8>, spans: &mut Vec<(u32, u32)>) {
    spans.clear();
    let mut inside = false;
    let mut start = 0;
    for (i, &b) in row.iter().enumerate() {
        if Some(b) == quote {
            inside = !inside;
        } else if b == delim && !inside {
            spans.push((start as u32, i as u32));
            start = i + 1;
        }
    }
    spans.push((start as u32, row.len() as u32));
}
