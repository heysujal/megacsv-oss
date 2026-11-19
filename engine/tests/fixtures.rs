//! Runs every file in tests/fixtures (written by `gen-csv --nasty`) through
//! the engine at many chunk sizes.

use std::fs;
use std::path::Path;

use megacsv_engine::index::Index;
use megacsv_engine::parse::parse_rows;
use megacsv_engine::scan::scan_chunk;
use megacsv_engine::sniff::{Encoding, sniff};

const Q: Option<u8> = Some(b'"');

fn index_with_chunk_size(bytes: &[u8], data_start: u64, size: usize, quote: Option<u8>) -> Index {
    let mut index = Index::new(data_start, bytes.len() as u64);
    if bytes.is_empty() {
        index.push(scan_chunk(&[], 0, quote, 2));
    }
    for (i, chunk) in bytes.chunks(size).enumerate().rev() {
        index.push(scan_chunk(chunk, (i * size) as u64, quote, 2));
    }
    index
}

fn fixture(name: &str) -> Vec<u8> {
    fs::read(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures").join(name)).unwrap()
}

#[test]
fn every_fixture_indexes_consistently() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let mut seen = 0;
    for entry in fs::read_dir(&dir).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy().into_owned();
        let bytes = fs::read(&path).unwrap();
        let s = sniff(&bytes, true);
        let body = &bytes[s.data_start as usize..];
        let parsed = parse_rows(body, s.delimiter, Q, 0, usize::MAX, true);

        for size in [1, 2, 3, 7, 64, 4096, bytes.len().max(1)] {
            let index = index_with_chunk_size(&bytes, s.data_start, size, Q);
            assert!(index.is_complete(), "{name}");
            assert_eq!(index.row_count() as usize, parsed.rows(), "{name} at chunk size {size}");
        }

        let well_formed = !name.starts_with("malformed") && name != "blank-lines.csv";
        if well_formed {
            let reference: Vec<Vec<Vec<u8>>> = csv::ReaderBuilder::new()
                .has_headers(false)
                .flexible(true)
                .delimiter(s.delimiter)
                .from_reader(body)
                .byte_records()
                .map(|r| r.unwrap().iter().map(<[u8]>::to_vec).collect())
                .collect();
            let ours: Vec<Vec<Vec<u8>>> = parsed
                .to_vecs()
                .into_iter()
                .map(|r| r.into_iter().map(<[u8]>::to_vec).collect())
                .collect();
            assert_eq!(ours, reference, "{name}");
        }
        seen += 1;
    }
    assert!(seen >= 20, "expected the fixture set; run gen-csv --nasty");
}

#[test]
fn sniffs_delimiters() {
    assert_eq!(sniff(&fixture("semicolon.csv"), true).delimiter, b';');
    assert_eq!(sniff(&fixture("tab.tsv"), true).delimiter, b'\t');
    assert_eq!(sniff(&fixture("pipe.csv"), true).delimiter, b'|');
    assert_eq!(sniff(&fixture("quoted-delimiters.csv"), true).delimiter, b',');
    assert_eq!(sniff(&fixture("basic.csv"), true).delimiter, b',');
}

#[test]
fn sniffs_encodings_and_headers() {
    assert_eq!(sniff(&fixture("bom-utf8.csv"), true).encoding, Encoding::Utf8Bom);
    assert_eq!(sniff(&fixture("windows-1252.csv"), true).encoding, Encoding::Windows1252);
    assert_eq!(sniff(&fixture("unicode.csv"), true).encoding, Encoding::Utf8);
    assert!(sniff(&fixture("basic.csv"), true).has_header);
    assert!(!sniff(b"1,2\n3,4\n", true).has_header);
}

#[test]
fn stray_quote_is_detectable_and_quote_off_mode_recovers() {
    let bytes = fixture("malformed-stray-quote.csv");
    let index = index_with_chunk_size(&bytes, 0, 5, Q);
    assert!(index.ends_inside_quotes());
    assert_eq!(index.row_count(), 2);
    let index = index_with_chunk_size(&bytes, 0, 5, None);
    assert_eq!(index.row_count(), 4);
}
