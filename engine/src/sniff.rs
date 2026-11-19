//! Detects encoding, delimiter, line endings and header from a file's first bytes.

use crate::parse::parse_rows;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Encoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
    Utf16Be,
    Windows1252,
}

impl Encoding {
    /// Label accepted by the browser's `TextDecoder`.
    pub fn label(self) -> &'static str {
        match self {
            Encoding::Utf8 | Encoding::Utf8Bom => "utf-8",
            Encoding::Utf16Le => "utf-16le",
            Encoding::Utf16Be => "utf-16be",
            Encoding::Windows1252 => "windows-1252",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineEndings {
    Lf,
    Crlf,
    /// Bare carriage returns (old Mac files). Not supported by the indexer yet.
    Cr,
    /// No line ending in the sample: a single row, or rows longer than the sample.
    Unknown,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Sniff {
    pub encoding: Encoding,
    /// Byte offset where row 0 starts (after any byte-order mark).
    pub data_start: u64,
    pub delimiter: u8,
    pub line_endings: LineEndings,
    pub has_header: bool,
}

const DELIMITERS: [u8; 4] = *b",;\t|";
const SAMPLE_ROWS: usize = 100;

/// `whole_file` is true when `sample` is the entire file.
pub fn sniff(sample: &[u8], whole_file: bool) -> Sniff {
    let (encoding, data_start) = detect_encoding(sample);
    let body = &sample[data_start as usize..];
    let delimiter = detect_delimiter(body, whole_file);
    Sniff {
        encoding,
        data_start,
        delimiter,
        line_endings: detect_line_endings(body),
        has_header: detect_header(body, delimiter, whole_file),
    }
}

fn detect_encoding(s: &[u8]) -> (Encoding, u64) {
    if s.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return (Encoding::Utf8Bom, 3);
    }
    if s.starts_with(&[0xFF, 0xFE]) {
        return (Encoding::Utf16Le, 2);
    }
    if s.starts_with(&[0xFE, 0xFF]) {
        return (Encoding::Utf16Be, 2);
    }
    // UTF-16 without a BOM: ASCII text leaves every other byte zero.
    let n = s.len().min(4096) & !1;
    if n >= 16 {
        let even_zero = s[..n].iter().step_by(2).filter(|&&b| b == 0).count();
        let odd_zero = s[1..n].iter().step_by(2).filter(|&&b| b == 0).count();
        let half = n / 2;
        if odd_zero > half * 3 / 4 && even_zero < half / 8 {
            return (Encoding::Utf16Le, 0);
        }
        if even_zero > half * 3 / 4 && odd_zero < half / 8 {
            return (Encoding::Utf16Be, 0);
        }
    }
    match std::str::from_utf8(s) {
        Ok(_) => (Encoding::Utf8, 0),
        // A multi-byte character cut off by the end of the sample is fine.
        Err(e) if e.error_len().is_none() => (Encoding::Utf8, 0),
        Err(_) => (Encoding::Windows1252, 0),
    }
}

/// Picks the delimiter that gives the most rows with the same field count.
fn detect_delimiter(body: &[u8], whole_file: bool) -> u8 {
    let mut best = (0usize, 0u32, b',');
    for &d in &DELIMITERS {
        let rows = parse_rows(body, d, Some(b'"'), 0, SAMPLE_ROWS, whole_file);
        let counts = &rows.row_field_counts;
        let Some(mode) = mode(counts) else { continue };
        if mode < 2 {
            continue;
        }
        let consistent = counts.iter().filter(|&&c| c == mode).count();
        if (consistent, mode) > (best.0, best.1) {
            best = (consistent, mode, d);
        }
    }
    best.2
}

fn mode(values: &[u32]) -> Option<u32> {
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    let mut best: Option<(usize, u32)> = None;
    for run in sorted.chunk_by(|a, b| a == b) {
        if best.is_none_or(|(n, _)| run.len() > n) {
            best = Some((run.len(), run[0]));
        }
    }
    best.map(|(_, v)| v)
}

fn detect_line_endings(body: &[u8]) -> LineEndings {
    let lf = memchr::memchr_iter(b'\n', body).count();
    let crlf = memchr::memmem::find_iter(body, b"\r\n").count();
    let cr = memchr::memchr_iter(b'\r', body).count();
    match (lf, cr) {
        (0, 0) => LineEndings::Unknown,
        (0, _) => LineEndings::Cr,
        _ if crlf * 2 > lf => LineEndings::Crlf,
        _ => LineEndings::Lf,
    }
}

/// Header unless the first row contains a number, which data rows usually
/// do and header rows usually don't. The user can always override it.
fn detect_header(body: &[u8], delimiter: u8, whole_file: bool) -> bool {
    let rows = parse_rows(body, delimiter, Some(b'"'), 0, 2, whole_file);
    let Some(first) = rows.to_vecs().into_iter().next() else {
        return false;
    };
    !first.iter().any(|f| {
        let t = String::from_utf8_lossy(f);
        let t = t.trim();
        !t.is_empty() && t.parse::<f64>().is_ok()
    })
}
