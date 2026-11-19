//! Chunk scanner: finds row ends in one slice of a file.
//!
//! A chunk may start inside a quoted field, and we can't know that until all
//! earlier chunks are scanned. So one pass records results for both possible
//! starting states. A newline seen after an even number of quotes in this
//! chunk ends a row if the chunk started outside quotes; after an odd number,
//! if it started inside. The stitcher later picks the right state per chunk.

use memchr::{memchr_iter, memchr2_iter};

/// Record a checkpoint every this many row ends.
pub const CHECKPOINT_EVERY: u64 = 1024;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct StateScan {
    /// Row-ending newlines in this chunk, assuming this starting state.
    pub row_ends: u64,
    /// `(absolute byte offset where a row starts, local row-end count)`.
    pub checkpoints: Vec<(u64, u64)>,
    /// Absolute offset of the last row-ending newline in this chunk.
    pub last_row_end: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChunkScan {
    pub start: u64,
    pub end: u64,
    /// True when the chunk holds an odd number of quote bytes.
    pub quote_parity: bool,
    /// Indexed by starting state: `[0]` began outside quotes, `[1]` inside.
    pub states: [StateScan; 2],
}

impl ChunkScan {
    fn new(start: u64, len: usize) -> Self {
        ChunkScan {
            start,
            end: start + len as u64,
            quote_parity: false,
            states: [StateScan::default(), StateScan::default()],
        }
    }

    #[inline]
    fn record_newline(&mut self, inside: bool, abs: u64, every: u64) {
        // The starting state for which this newline is outside quotes is the
        // one equal to the local parity.
        let st = &mut self.states[inside as usize];
        st.row_ends += 1;
        st.last_row_end = Some(abs);
        if st.row_ends.is_multiple_of(every) {
            st.checkpoints.push((abs + 1, st.row_ends));
        }
    }

    /// Flat form for crossing the worker boundary as one `Float64Array`:
    /// `[start, end, parity, (row_ends, last_row_end or -1, n, off0, row0, ...) x2]`.
    pub fn to_flat(&self) -> Vec<f64> {
        let n = self.states[0].checkpoints.len() + self.states[1].checkpoints.len();
        let mut out = Vec::with_capacity(9 + 2 * n);
        out.extend([self.start as f64, self.end as f64, self.quote_parity as u8 as f64]);
        for st in &self.states {
            out.push(st.row_ends as f64);
            out.push(st.last_row_end.map_or(-1.0, |v| v as f64));
            out.push(st.checkpoints.len() as f64);
            for &(off, row) in &st.checkpoints {
                out.push(off as f64);
                out.push(row as f64);
            }
        }
        out
    }

    pub fn from_flat(flat: &[f64]) -> Option<Self> {
        let mut it = flat.iter().copied();
        let mut next = || it.next();
        let start = next()? as u64;
        let end = next()? as u64;
        let quote_parity = next()? != 0.0;
        let mut states = [StateScan::default(), StateScan::default()];
        for st in &mut states {
            st.row_ends = next()? as u64;
            let last = next()?;
            st.last_row_end = (last >= 0.0).then_some(last as u64);
            let n = next()? as usize;
            st.checkpoints.reserve(n);
            for _ in 0..n {
                st.checkpoints.push((next()? as u64, next()? as u64));
            }
        }
        Some(ChunkScan { start, end, quote_parity, states })
    }
}

/// Scan `bytes`, which sit at absolute offset `base` in the file.
/// `quote` is `None` in "treat quotes as normal text" mode.
pub fn scan_chunk(bytes: &[u8], base: u64, quote: Option<u8>, every: u64) -> ChunkScan {
    let mut out = ChunkScan::new(base, bytes.len());
    let mut inside = false;
    match quote {
        Some(q) => {
            for pos in memchr2_iter(q, b'\n', bytes) {
                if bytes[pos] == q {
                    inside = !inside;
                } else {
                    out.record_newline(inside, base + pos as u64, every);
                }
            }
        }
        None => {
            for pos in memchr_iter(b'\n', bytes) {
                out.record_newline(false, base + pos as u64, every);
            }
        }
    }
    out.quote_parity = inside;
    out
}

/// Byte-at-a-time reference implementation. Tests check `scan_chunk` against it.
pub fn scan_chunk_naive(bytes: &[u8], base: u64, quote: Option<u8>, every: u64) -> ChunkScan {
    let mut out = ChunkScan::new(base, bytes.len());
    let mut inside = false;
    for (pos, &b) in bytes.iter().enumerate() {
        if Some(b) == quote {
            inside = !inside;
        } else if b == b'\n' {
            out.record_newline(inside, base + pos as u64, every);
        }
    }
    out.quote_parity = inside;
    out
}
