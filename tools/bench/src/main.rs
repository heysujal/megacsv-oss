//! Native indexing benchmark.
//!
//!   bench testdata/1gb.csv
//!
//! Reports single-thread scan speed (fast and naive scanners, on data already
//! in memory) and end-to-end indexing with a thread pool reading 8 MB chunks,
//! like the browser's worker pool. Appends results to tools/bench/results.jsonl.

use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, mpsc};
use std::time::Instant;

use megacsv_engine::index::Index;
use megacsv_engine::scan::{CHECKPOINT_EVERY, ChunkScan, scan_chunk, scan_chunk_naive};
use megacsv_engine::sniff::sniff;

const CHUNK: u64 = 8 << 20;
const Q: Option<u8> = Some(b'"');

fn mbps(bytes: u64, secs: f64) -> f64 {
    bytes as f64 / 1e6 / secs
}

fn single_thread(path: &str, scanner: fn(&[u8], u64, Option<u8>, u64) -> ChunkScan) -> f64 {
    let mut buf = vec![0u8; 256 << 20];
    let n = File::open(path).unwrap().read(&mut buf).unwrap();
    buf.truncate(n);
    let start = Instant::now();
    let mut rows = 0;
    for (i, chunk) in buf.chunks(CHUNK as usize).enumerate() {
        rows += scanner(chunk, i as u64 * CHUNK, Q, CHECKPOINT_EVERY).states[0].row_ends;
    }
    std::hint::black_box(rows);
    mbps(n as u64, start.elapsed().as_secs_f64())
}

fn parallel(path: &str, threads: usize) -> (f64, u64, usize) {
    let len = std::fs::metadata(path).unwrap().len();
    let mut head = vec![0u8; 1 << 20];
    let n = File::open(path).unwrap().read(&mut head).unwrap();
    let s = sniff(&head[..n], n as u64 == len);

    let next = Arc::new(AtomicU64::new(0));
    let (tx, rx) = mpsc::channel();
    let start = Instant::now();
    for _ in 0..threads {
        let (next, tx, path) = (next.clone(), tx.clone(), path.to_string());
        std::thread::spawn(move || {
            let mut f = File::open(&path).unwrap();
            let mut buf = vec![0u8; CHUNK as usize];
            loop {
                let off = next.fetch_add(CHUNK, Ordering::Relaxed);
                if off >= len {
                    break;
                }
                let want = CHUNK.min(len - off) as usize;
                f.seek(SeekFrom::Start(off)).unwrap();
                f.read_exact(&mut buf[..want]).unwrap();
                tx.send(scan_chunk(&buf[..want], off, Q, CHECKPOINT_EVERY)).unwrap();
            }
        });
    }
    drop(tx);
    let mut index = Index::new(s.data_start, len);
    for chunk in rx {
        index.push(chunk);
    }
    assert!(index.is_complete());
    (mbps(len, start.elapsed().as_secs_f64()), index.row_count(), index.checkpoint_count())
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: bench FILE");
    let len = std::fs::metadata(&path).unwrap().len();
    let threads = std::thread::available_parallelism().map_or(4, |n| n.get()).saturating_sub(1).clamp(1, 8);
    println!("file: {path} ({:.2} GB)", len as f64 / 1e9);

    let fast = single_thread(&path, scan_chunk);
    println!("scan, 1 thread, in memory:   {fast:>7.0} MB/s");
    let naive = single_thread(&path, scan_chunk_naive);
    println!("naive scan, 1 thread:        {naive:>7.0} MB/s");
    let (e2e, rows, cps) = parallel(&path, threads);
    println!("index from disk, {threads} threads: {e2e:>7.0} MB/s  ({rows} rows, {cps} checkpoints)");

    let commit = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let line = format!(
        "{{\"commit\":\"{commit}\",\"file\":\"{path}\",\"bytes\":{len},\"scan_mbps\":{fast:.0},\"naive_mbps\":{naive:.0},\"index_mbps\":{e2e:.0},\"threads\":{threads},\"rows\":{rows}}}\n"
    );
    let results = concat!(env!("CARGO_MANIFEST_DIR"), "/results.jsonl");
    OpenOptions::new().create(true).append(true).open(results).unwrap().write_all(line.as_bytes()).unwrap();
}
