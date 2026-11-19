//! Stitches chunk scans, which may arrive in any order, into one row index.

use std::collections::BTreeMap;

use crate::scan::ChunkScan;

#[derive(Debug)]
pub struct Index {
    data_start: u64,
    file_len: u64,
    /// Byte offset up to which chunks are stitched.
    next_start: u64,
    /// Quote state at `next_start`.
    inside: bool,
    rows_ended: u64,
    last_row_end: Option<u64>,
    /// `(row start offset, global row number)`, ascending in both.
    checkpoints: Vec<(u64, u64)>,
    pending: BTreeMap<u64, ChunkScan>,
}

impl Index {
    /// `data_start` is where row 0 begins (after any byte-order mark).
    pub fn new(data_start: u64, file_len: u64) -> Self {
        Index {
            data_start,
            file_len,
            next_start: 0,
            inside: false,
            rows_ended: 0,
            last_row_end: None,
            checkpoints: vec![(data_start, 0)],
            pending: BTreeMap::new(),
        }
    }

    pub fn push(&mut self, chunk: ChunkScan) {
        self.pending.insert(chunk.start, chunk);
        while let Some(chunk) = self.pending.remove(&self.next_start) {
            let st = &chunk.states[self.inside as usize];
            let base = self.rows_ended;
            self.checkpoints.extend(st.checkpoints.iter().map(|&(off, k)| (off, base + k)));
            self.rows_ended += st.row_ends;
            if st.last_row_end.is_some() {
                self.last_row_end = st.last_row_end;
            }
            self.inside ^= chunk.quote_parity;
            self.next_start = chunk.end;
        }
    }

    pub fn indexed_bytes(&self) -> u64 {
        self.next_start
    }

    pub fn is_complete(&self) -> bool {
        self.next_start >= self.file_len
    }

    /// Rows whose start offset is known and which are fully terminated, plus
    /// a final unterminated row once the whole file is indexed.
    pub fn row_count(&self) -> u64 {
        if !self.is_complete() {
            return self.rows_ended;
        }
        let last_start = self.last_row_end.map_or(self.data_start, |e| e + 1);
        self.rows_ended + (last_start < self.file_len) as u64
    }

    /// True if the file ends inside a quoted field: a sign of malformed quotes.
    pub fn ends_inside_quotes(&self) -> bool {
        self.is_complete() && self.inside
    }

    /// The nearest checkpoint at or before `row`: `(byte offset, its row number)`.
    /// Parse forward from there, skipping `row - its row number` rows.
    pub fn locate(&self, row: u64) -> (u64, u64) {
        let i = self.checkpoints.partition_point(|&(_, r)| r <= row);
        self.checkpoints[i.saturating_sub(1)]
    }

    pub fn checkpoint_count(&self) -> usize {
        self.checkpoints.len()
    }

    /// Splits the indexed file into row-aligned ranges of about `target`
    /// bytes: `(start offset, end offset, file row at start)`.
    pub fn units(&self, target: u64) -> Vec<(u64, u64, u64)> {
        self.units_from(self.checkpoints[0].0, target)
    }

    /// Like `units`, starting at checkpoint offset `from` (the end of an
    /// earlier unit). While the file is still being read, only ranges ending
    /// at a known checkpoint are returned; call again later for the rest.
    pub fn units_from(&self, from: u64, target: u64) -> Vec<(u64, u64, u64)> {
        let i = self.checkpoints.partition_point(|&(off, _)| off < from);
        let Some(&(mut start, mut row)) = self.checkpoints.get(i) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for &(off, r) in &self.checkpoints[i + 1..] {
            if off - start >= target && off < self.file_len {
                out.push((start, off, row));
                (start, row) = (off, r);
            }
        }
        if self.is_complete() && start < self.file_len {
            out.push((start, self.file_len, row));
        }
        out
    }

    /// Serializes a complete index, for instant reopen.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(64 + self.checkpoints.len() * 16);
        out.extend_from_slice(MAGIC);
        let last = self.last_row_end.map_or(0, |v| v + 1);
        let header = [
            self.data_start,
            self.file_len,
            self.next_start,
            self.inside as u64,
            self.rows_ended,
            last,
            self.checkpoints.len() as u64,
        ];
        for v in header {
            out.extend_from_slice(&v.to_le_bytes());
        }
        for &(off, row) in &self.checkpoints {
            out.extend_from_slice(&off.to_le_bytes());
            out.extend_from_slice(&row.to_le_bytes());
        }
        out
    }

    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        let rest = bytes.strip_prefix(MAGIC)?;
        let mut words = rest.as_chunks::<8>().0.iter().map(|c| u64::from_le_bytes(*c));
        let mut next = || words.next();
        let data_start = next()?;
        let file_len = next()?;
        let next_start = next()?;
        let inside = next()? != 0;
        let rows_ended = next()?;
        let last = next()?;
        let n = next()? as usize;
        if rest.len() != 7 * 8 + n * 16 || n == 0 {
            return None;
        }
        let mut checkpoints = Vec::with_capacity(n);
        for _ in 0..n {
            checkpoints.push((next()?, next()?));
        }
        Some(Index {
            data_start,
            file_len,
            next_start,
            inside,
            rows_ended,
            last_row_end: last.checked_sub(1),
            checkpoints,
            pending: BTreeMap::new(),
        })
    }
}

const MAGIC: &[u8; 8] = b"MCSVIDX1";
