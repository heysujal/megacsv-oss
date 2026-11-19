use megacsv_engine::index::Index;
use megacsv_engine::parse::parse_rows;
use megacsv_engine::scan::{scan_chunk, scan_chunk_naive};
use proptest::prelude::*;

const Q: Option<u8> = Some(b'"');

/// Index `bytes` in chunks cut at `splits`, pushed in reverse order to
/// exercise out-of-order stitching.
fn index_chunked(bytes: &[u8], splits: &[usize], every: u64) -> Index {
    let mut cuts: Vec<usize> = splits.iter().map(|&s| s % (bytes.len() + 1)).collect();
    cuts.extend([0, bytes.len()]);
    cuts.sort_unstable();
    cuts.dedup();
    let mut index = Index::new(0, bytes.len() as u64);
    for w in cuts.windows(2).rev() {
        index.push(scan_chunk(&bytes[w[0]..w[1]], w[0] as u64, Q, every));
    }
    if bytes.is_empty() {
        index.push(scan_chunk(&[], 0, Q, every));
    }
    index
}

fn reference_rows(bytes: &[u8]) -> Vec<Vec<Vec<u8>>> {
    csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(bytes)
        .byte_records()
        .map(|r| r.unwrap().iter().map(<[u8]>::to_vec).collect())
        .collect()
}

fn parsed_rows(bytes: &[u8]) -> Vec<Vec<Vec<u8>>> {
    let parsed = parse_rows(bytes, b',', Q, 0, usize::MAX, true);
    parsed.to_vecs().into_iter().map(|r| r.into_iter().map(<[u8]>::to_vec).collect()).collect()
}

fn write_csv(records: &[Vec<String>], crlf: bool, strip_last: bool) -> Vec<u8> {
    let term = if crlf { csv::Terminator::CRLF } else { csv::Terminator::Any(b'\n') };
    let mut w = csv::WriterBuilder::new().terminator(term).flexible(true).from_writer(vec![]);
    for r in records {
        w.write_record(r).unwrap();
    }
    let mut bytes = w.into_inner().unwrap();
    if strip_last {
        if bytes.ends_with(b"\r\n") {
            bytes.truncate(bytes.len() - 2);
        } else if bytes.ends_with(b"\n") {
            bytes.pop();
        }
    }
    bytes
}

fn records() -> impl Strategy<Value = Vec<Vec<String>>> {
    let field = "[a-z ,\"\n\r;é]{0,8}";
    prop::collection::vec(prop::collection::vec(field, 1..6), 0..60)
}

fn messy_bytes() -> impl Strategy<Value = Vec<u8>> {
    let byte = prop_oneof![
        3 => any::<u8>(),
        2 => Just(b'"'),
        2 => Just(b'\n'),
        1 => Just(b'\r'),
        2 => Just(b','),
    ];
    prop::collection::vec(byte, 0..400)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(2000))]

    #[test]
    fn row_count_matches_reference(
        recs in records(), crlf: bool, strip_last: bool,
        splits in prop::collection::vec(any::<usize>(), 0..8),
    ) {
        let bytes = write_csv(&recs, crlf, strip_last);
        let index = index_chunked(&bytes, &splits, 3);
        prop_assert!(index.is_complete());
        prop_assert_eq!(index.row_count() as usize, reference_rows(&bytes).len());
    }

    #[test]
    fn fields_match_reference(recs in records(), crlf: bool, strip_last: bool) {
        let bytes = write_csv(&recs, crlf, strip_last);
        prop_assert_eq!(parsed_rows(&bytes), reference_rows(&bytes));
    }

    #[test]
    fn every_row_reachable_through_checkpoints(
        recs in records(), crlf: bool,
        splits in prop::collection::vec(any::<usize>(), 0..8),
    ) {
        let bytes = write_csv(&recs, crlf, false);
        let expected = reference_rows(&bytes);
        let index = index_chunked(&bytes, &splits, 3);
        for (r, want) in expected.iter().enumerate() {
            let (off, at) = index.locate(r as u64);
            let got = parse_rows(&bytes[off as usize..], b',', Q, r - at as usize, 1, true);
            let got: Vec<Vec<u8>> = got.to_vecs()[0].iter().map(|f| f.to_vec()).collect();
            prop_assert_eq!(&got, want, "row {}", r);
        }
    }

    #[test]
    fn fast_scan_equals_naive(bytes in messy_bytes(), base in 0u64..1_000_000, every in 1u64..5) {
        prop_assert_eq!(scan_chunk(&bytes, base, Q, every), scan_chunk_naive(&bytes, base, Q, every));
        prop_assert_eq!(scan_chunk(&bytes, base, None, every), scan_chunk_naive(&bytes, base, None, every));
    }

    /// On any input, even malformed, the index and the parser agree on the row count.
    #[test]
    fn index_and_parser_agree_on_garbage(
        bytes in messy_bytes(),
        splits in prop::collection::vec(any::<usize>(), 0..8),
    ) {
        let index = index_chunked(&bytes, &splits, 2);
        let parsed = parse_rows(&bytes, b',', Q, 0, usize::MAX, true);
        prop_assert_eq!(index.row_count() as usize, parsed.rows());
        prop_assert_eq!(parsed.consumed, bytes.len());
    }

    #[test]
    fn partial_buffers_never_emit_partial_rows(recs in records(), cut in any::<usize>()) {
        let bytes = write_csv(&recs, false, false);
        let cut = cut % (bytes.len() + 1);
        let full = parsed_rows(&bytes);
        let part = parse_rows(&bytes[..cut], b',', Q, 0, usize::MAX, false);
        let part: Vec<Vec<Vec<u8>>> =
            part.to_vecs().into_iter().map(|r| r.into_iter().map(<[u8]>::to_vec).collect()).collect();
        prop_assert_eq!(&full[..part.len()], &part[..]);
    }
}

#[test]
fn chunk_flat_roundtrip() {
    let bytes = b"a,b\n\"x\ny\",2\n3,4\n5,6";
    let chunk = scan_chunk(bytes, 100, Q, 1);
    let back = megacsv_engine::scan::ChunkScan::from_flat(&chunk.to_flat()).unwrap();
    assert_eq!(back, chunk);
}

#[test]
fn bom_is_skipped_and_counted_once() {
    let bytes = b"\xEF\xBB\xBFname,age\nann,3\n";
    let s = megacsv_engine::sniff::sniff(bytes, true);
    assert_eq!(s.data_start, 3);
    let mut index = Index::new(s.data_start, bytes.len() as u64);
    index.push(scan_chunk(bytes, 0, Q, 1024));
    assert_eq!(index.row_count(), 2);
    assert_eq!(index.locate(0), (3, 0));
}

#[test]
fn blank_lines_count_as_rows() {
    // Excel shows a blank line as an empty row; so do we (the csv crate skips them).
    let bytes = b"a,b\n\n1,2\n";
    let mut index = Index::new(0, bytes.len() as u64);
    index.push(scan_chunk(bytes, 0, Q, 1024));
    assert_eq!(index.row_count(), 3);
    assert_eq!(parse_rows(bytes, b',', Q, 0, 10, true).rows(), 3);
}
