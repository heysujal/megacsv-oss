use megacsv_engine::index::Index;
use megacsv_engine::parse::parse_rows;
use megacsv_engine::query::{DedupeKey, ExtractSpec, Format, Op, Query, parse_number, parse_number_with};
use megacsv_engine::rows::{next_row, split_fields};
use megacsv_engine::scan::scan_chunk;
use megacsv_engine::xlsx;
use proptest::prelude::*;

const Q: Option<u8> = Some(b'"');

fn messy_bytes() -> impl Strategy<Value = Vec<u8>> {
    let byte = prop_oneof![
        3 => prop::sample::select(b"abcAB 1.-".to_vec()),
        1 => any::<u8>(),
        2 => Just(b'"'),
        2 => Just(b'\n'),
        1 => Just(b'\r'),
        2 => Just(b','),
    ];
    prop::collection::vec(byte, 0..400)
}

/// Row contents via `next_row`, the reference for what a "row" is here.
fn row_spans(buf: &[u8]) -> Vec<(usize, usize, usize)> {
    let mut out = vec![];
    let mut pos = 0;
    while let Some(s) = next_row(buf, pos, Q, true) {
        out.push((s.start, s.end, s.next));
        pos = s.next;
    }
    out
}

fn full_index(bytes: &[u8], every: u64) -> Index {
    let mut index = Index::new(0, bytes.len() as u64);
    index.push(scan_chunk(bytes, 0, Q, every));
    index
}

/// Runs a query over `bytes` in windows cut at `cuts`, carrying partial rows
/// over like the app's worker does.
fn run_windowed(q: &mut Query, bytes: &[u8], cuts: &[usize], min_row: u64) -> (Vec<f64>, u64) {
    let mut cuts: Vec<usize> = cuts.iter().map(|c| c % (bytes.len() + 1)).collect();
    cuts.push(bytes.len());
    cuts.sort_unstable();
    let (mut matches, mut count) = (vec![], 0);
    let (mut base, mut row) = (0usize, 0u64);
    for &cut in &cuts {
        if cut < base {
            continue;
        }
        let at_eof = cut == bytes.len();
        let out = q.run(&bytes[base..cut], base as u64, row, min_row, at_eof, b',', Q, usize::MAX);
        matches.extend(out.matches);
        count += out.count;
        row += out.rows_seen;
        base += out.consumed;
    }
    (matches, count)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1500))]

    #[test]
    fn rows_and_fields_agree_with_parser(bytes in messy_bytes()) {
        let parsed = parse_rows(&bytes, b',', Q, 0, usize::MAX, true);
        let expected: Vec<Vec<Vec<u8>>> =
            parsed.to_vecs().into_iter().map(|r| r.into_iter().map(<[u8]>::to_vec).collect()).collect();
        let (mut data, mut ends) = (vec![], vec![]);
        let mut got = vec![];
        for (start, end, _) in row_spans(&bytes) {
            split_fields(&bytes[start..end], b',', Q, &mut data, &mut ends);
            let mut s = 0;
            got.push(ends.iter().map(|&e| { let f = data[s..e as usize].to_vec(); s = e as usize; f }).collect::<Vec<_>>());
        }
        prop_assert_eq!(got, expected);
    }

    #[test]
    fn text_search_matches_brute_force(
        bytes in messy_bytes(),
        needle in "[aAb1 ]{1,3}",
        match_case: bool,
        cuts in prop::collection::vec(any::<usize>(), 0..5),
    ) {
        let mut q = Query::new();
        q.set_text(needle.as_bytes(), match_case);
        let norm = |v: &[u8]| if match_case { v.to_vec() } else { v.to_ascii_lowercase() };
        let n = norm(needle.as_bytes());
        let expected: Vec<f64> = row_spans(&bytes).iter().enumerate()
            .filter(|(_, (s, e, _))| norm(&bytes[*s..*e]).windows(n.len()).any(|w| w == n.as_slice()))
            .flat_map(|(i, &(s, _, next))| [i as f64, s as f64, next as f64])
            .collect();
        let (got, count) = run_windowed(&mut q, &bytes, &cuts, 0);
        prop_assert_eq!(count as usize, expected.len() / 3);
        prop_assert_eq!(got, expected);
    }

    /// The fast whole-buffer search and the row-by-row check agree.
    #[test]
    fn fast_and_row_paths_agree(bytes in messy_bytes(), needle in "[aAb1 ]{1,3}", match_case: bool) {
        let mut q = Query::new();
        q.set_text(needle.as_bytes(), match_case);
        let fast = q.run(&bytes, 0, 0, 0, true, b',', Q, usize::MAX);
        let slow: Vec<f64> = row_spans(&bytes).iter().enumerate()
            .filter(|(_, (s, e, _))| q.test_row(&bytes[*s..*e], b',', Q))
            .flat_map(|(i, &(s, _, next))| [i as f64, s as f64, next as f64])
            .collect();
        prop_assert_eq!(fast.matches, slow);
    }

    #[test]
    fn csv_export_is_byte_exact_and_resumable(
        bytes in messy_bytes(),
        needle in "[ab]{0,2}",
        part in 1u32..5,
    ) {
        let mut q = Query::new();
        q.set_text(needle.as_bytes(), false);
        let spec = |max_rows| ExtractSpec { format: Format::Csv, max_rows, xlsx_row: 1, line_ending: b"\n", latin1: false };
        let mut expected = vec![];
        for (s, e, next) in row_spans(&bytes) {
            if q.test_row(&bytes[s..e], b',', Q) {
                expected.extend_from_slice(&bytes[s..next]);
                if next == e {
                    expected.push(b'\n');
                }
            }
        }
        // Export in parts of `part` rows, resuming where each part stopped.
        let (mut got, mut base, mut row) = (vec![], 0, 0);
        loop {
            let out = q.extract(&bytes[base..], row, 0, true, b',', Q, &spec(part));
            got.extend(out.bytes);
            base += out.consumed;
            row += out.rows_seen;
            if out.rows_out < part {
                break;
            }
        }
        prop_assert_eq!(got, expected);
    }

    /// Exporting chosen columns copies each field's bytes exactly, joined with
    /// the delimiter, and keeps every Nth matching row.
    #[test]
    fn column_export_copies_fields_exactly(
        bytes in messy_bytes(),
        cols in prop::collection::vec(0usize..4, 1..4),
        every in 1u64..4,
    ) {
        let mut q = Query::new();
        q.set_columns(&cols);
        q.set_every(every);
        let spec = ExtractSpec { format: Format::Csv, max_rows: u32::MAX, xlsx_row: 1, line_ending: b"\n", latin1: false };
        let got = q.extract(&bytes, 0, 0, true, b',', Q, &spec).bytes;
        let mut expected = vec![];
        for (i, (s, e, next)) in row_spans(&bytes).into_iter().enumerate() {
            if !(i as u64).is_multiple_of(every) {
                continue;
            }
            let content = &bytes[s..e];
            let core = content.strip_suffix(b"\r").unwrap_or(content);
            // Split on delimiters outside quotes; a quote byte always toggles.
            let (mut fields, mut inside, mut start) = (vec![], false, 0);
            for (j, &b) in core.iter().enumerate() {
                if b == b'"' { inside = !inside; } else if b == b',' && !inside { fields.push(&core[start..j]); start = j + 1; }
            }
            fields.push(&core[start..]);
            let picked: Vec<&[u8]> = cols.iter().map(|&c| fields.get(c).copied().unwrap_or(b"")).collect();
            expected.extend(picked.join(&b','));
            if next == e { expected.push(b'\n'); } else { expected.extend_from_slice(&bytes[s + core.len()..next]); }
        }
        prop_assert_eq!(got, expected);
    }

    #[test]
    fn units_cover_the_file_with_correct_row_numbers(bytes in messy_bytes(), target in 1u64..64) {
        let index = full_index(&bytes, 2);
        let units = index.units(target);
        let mut expect_start = 0;
        for &(start, end, row) in &units {
            prop_assert_eq!(start, expect_start);
            prop_assert!(end > start);
            let before = parse_rows(&bytes[..start as usize], b',', Q, 0, usize::MAX, false).rows();
            prop_assert_eq!(row as usize, before);
            expect_start = end;
        }
        prop_assert_eq!(expect_start, bytes.len() as u64);
    }

    /// Units taken bit by bit while chunks arrive, resuming where the last
    /// call stopped, add up to exactly the units of the finished index.
    #[test]
    fn units_while_reading_match_units_after(
        bytes in messy_bytes(),
        target in 1u64..64,
        chunk in 1usize..50,
    ) {
        let mut index = Index::new(0, bytes.len() as u64);
        let mut got = vec![];
        let mut from = 0u64;
        let mut take = |index: &Index, got: &mut Vec<(u64, u64, u64)>| {
            let more = index.units_from(from, target);
            if let Some(last) = more.last() {
                from = last.1;
            }
            got.extend(more);
        };
        if bytes.is_empty() {
            index.push(scan_chunk(&[], 0, Q, 2));
        }
        for (i, c) in bytes.chunks(chunk).enumerate() {
            index.push(scan_chunk(c, (i * chunk) as u64, Q, 2));
            take(&index, &mut got);
        }
        take(&index, &mut got);
        prop_assert!(index.is_complete());
        // Ranges are contiguous, cover the file, and start at the right rows.
        let mut expect_start = 0;
        for &(start, end, row) in &got {
            prop_assert_eq!(start, expect_start);
            let before = parse_rows(&bytes[..start as usize], b',', Q, 0, usize::MAX, false).rows();
            prop_assert_eq!(row as usize, before);
            expect_start = end;
        }
        prop_assert_eq!(expect_start, bytes.len() as u64);
    }

    #[test]
    fn index_bytes_roundtrip(bytes in messy_bytes()) {
        let index = full_index(&bytes, 2);
        let back = Index::from_bytes(&index.to_bytes()).unwrap();
        prop_assert_eq!(back.row_count(), index.row_count());
        prop_assert_eq!(back.to_bytes(), index.to_bytes());
        prop_assert!(back.is_complete());
    }
}

fn filter_rows(csv: &[u8], setup: impl Fn(&mut Query)) -> Vec<u64> {
    let mut q = Query::new();
    setup(&mut q);
    let out = q.run(csv, 0, 0, 1, true, b',', Q, usize::MAX);
    out.matches.chunks(3).map(|t| t[0] as u64).collect()
}

const PEOPLE: &[u8] = b"name,country,amount\n\
Ann,IN,\"1,200.50\"\n\
Bob,in ,99\n\
\"Cy, Jr\",US,\n\
Dee,INDIA,abc\n\
\"Eve \"\"E\"\"\",GB,-5\n";

#[test]
fn column_filters() {
    // Rows: 1 Ann, 2 Bob, 3 Cy, 4 Dee, 5 Eve. Row 0 is the header and never matches.
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(1, Op::Equals, b"in", 0.0, 0.0, false)), [1, 2]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(1, Op::Equals, b"IN", 0.0, 0.0, true)), [1]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(1, Op::StartsWith, b"in", 0.0, 0.0, false)), [1, 2, 4]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(0, Op::Contains, b"jr", 0.0, 0.0, false)), [3]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(0, Op::Contains, b"\"e\"", 0.0, 0.0, false)), [5]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(2, Op::IsEmpty, b"", 0.0, 0.0, false)), [3]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(2, Op::NotEmpty, b"", 0.0, 0.0, false)), [1, 2, 4, 5]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(2, Op::Between, b"", 0.0, 1000.0, false)), [2]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(2, Op::Between, b"", -10.0, 1e9, false)), [1, 2, 5]);
    // Filters combine with AND, and with text search.
    assert_eq!(
        filter_rows(PEOPLE, |q| {
            q.add_filter(1, Op::StartsWith, b"in", 0.0, 0.0, false);
            q.add_filter(2, Op::Between, b"", 0.0, 100.0, false);
        }),
        [2]
    );
    assert_eq!(
        filter_rows(PEOPLE, |q| {
            q.set_text(b"a", false);
            q.add_filter(1, Op::StartsWith, b"in", 0.0, 0.0, false);
        }),
        [1, 4]
    );
    // A column the row doesn't have counts as empty.
    assert_eq!(filter_rows(b"a,b\n1\n1,2\n", |q| q.add_filter(1, Op::IsEmpty, b"", 0.0, 0.0, false)), [1]);
}

#[test]
fn numbers() {
    assert_eq!(parse_number(b" 1,234,567.89 "), Some(1_234_567.89));
    assert_eq!(parse_number(b"-12.5"), Some(-12.5));
    assert_eq!(parse_number(b".5"), Some(0.5));
    assert_eq!(parse_number(b"1,5"), None);
    assert_eq!(parse_number(b"12,34,567"), None);
    assert_eq!(parse_number(b"$5"), None);
    assert_eq!(parse_number(b"inf"), None);
    assert_eq!(parse_number(b"+inf"), None);
    assert_eq!(parse_number(b"NaN"), None);
    assert_eq!(parse_number(b""), None);
}

#[test]
fn xlsx_cells() {
    for yes in ["0", "7", "-3", "12.5", "0.001", "123456789012345"] {
        assert!(xlsx::is_plain_number(yes.as_bytes()), "{yes}");
    }
    for no in ["007", "1234567890123456", "1e5", "1,000", "12.", ".5", "-", "", "１"] {
        assert!(!xlsx::is_plain_number(no.as_bytes()), "{no}");
    }
    let cols: Vec<String> = [0, 25, 26, 701, 702]
        .iter()
        .map(|&c| {
            let mut v = vec![];
            xlsx::push_col(&mut v, c);
            String::from_utf8(v).unwrap()
        })
        .collect();
    assert_eq!(cols, ["A", "Z", "AA", "ZZ", "AAA"]);

    let (mut data, mut ends) = (vec![], vec![]);
    split_fields(b"42,007,a<b & c,,\"x\x01y\"", b',', Q, &mut data, &mut ends);
    let mut out = vec![];
    xlsx::write_row(&mut out, 3, &data, &ends, false);
    assert_eq!(
        String::from_utf8(out).unwrap(),
        "<row r=\"3\"><c r=\"A3\"><v>42</v></c>\
         <c r=\"B3\" t=\"inlineStr\"><is><t xml:space=\"preserve\">007</t></is></c>\
         <c r=\"C3\" t=\"inlineStr\"><is><t xml:space=\"preserve\">a&lt;b &amp; c</t></is></c>\
         <c r=\"E3\" t=\"inlineStr\"><is><t xml:space=\"preserve\">xy</t></is></c></row>"
    );

    // Windows-1252 text becomes UTF-8.
    let mut out = vec![];
    xlsx::write_row(&mut out, 1, b"Jos\xE9 \x80", &[6], true);
    assert!(String::from_utf8(out).unwrap().contains("José €"));
}

#[test]
fn new_filters() {
    // Rows: 1 Ann (1,200.50), 2 Bob (99), 3 Cy (empty), 4 Dee (abc), 5 Eve (-5).
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(2, Op::NotNumber, b"", 0.0, 0.0, false)), [4]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(1, Op::OneOf, b"gb\n US \n\nfr", 0.0, 0.0, false)), [3, 5]);
    assert_eq!(filter_rows(PEOPLE, |q| q.add_filter(1, Op::OneOf, b"IN\nGB", 0.0, 0.0, true)), [1, 5]);
    // Decimal commas, as in semicolon files.
    let eu: &[u8] = b"t;v\n1;21,5\n2;1.234,5\n3;21.5\n4;n/a\n5;7\n";
    let rows = |setup: &dyn Fn(&mut Query)| {
        let mut q = Query::new();
        setup(&mut q);
        q.run(eu, 0, 0, 1, true, b';', Q, usize::MAX).matches.chunks(3).map(|t| t[0] as u64).collect::<Vec<_>>()
    };
    assert_eq!(rows(&|q| q.add_filter(1, Op::Between, b"", 20.0, 22.0, false)), [3]);
    assert_eq!(rows(&|q| { q.set_decimal_comma(true); q.add_filter(1, Op::Between, b"", 20.0, 22.0, false) }), [1, 3]);
    assert_eq!(rows(&|q| { q.set_decimal_comma(true); q.add_filter(1, Op::Between, b"", 1000.0, 2000.0, false) }), [2]);
    assert_eq!(rows(&|q| { q.set_decimal_comma(true); q.add_filter(1, Op::NotNumber, b"", 0.0, 0.0, false) }), [4]);
}

#[test]
fn decimal_comma_numbers() {
    let dc = |s: &str| parse_number_with(s.as_bytes(), true);
    assert_eq!(dc("21,5"), Some(21.5));
    assert_eq!(dc("-0,25"), Some(-0.25));
    assert_eq!(dc("1.234.567,89"), Some(1_234_567.89));
    assert_eq!(dc("1.234"), Some(1234.0));
    assert_eq!(dc("21.5"), Some(21.5));
    assert_eq!(dc("7"), Some(7.0));
    assert_eq!(dc("1,2,3"), None);
    assert_eq!(dc("12.34,5"), None);
    assert_eq!(dc("abc"), None);
    // Without decimal commas nothing changes.
    assert_eq!(parse_number_with(b"1,234.5", false), Some(1234.5));
}

#[test]
fn every_nth_row_and_columns_in_xlsx() {
    let mut q = Query::new();
    q.set_every(2);
    q.set_columns(&[2, 0]);
    let spec = ExtractSpec { format: Format::Xlsx, max_rows: 10, xlsx_row: 2, line_ending: b"\n", latin1: false };
    let out = q.extract(PEOPLE, 0, 1, true, b',', Q, &spec);
    assert_eq!(out.rows_out, 3); // rows 1, 3 and 5
    let xml = String::from_utf8(out.bytes).unwrap();
    assert!(xml.starts_with("<row r=\"2\"><c r=\"A2\" t=\"inlineStr\"><is><t xml:space=\"preserve\">1,200.50</t></is></c><c r=\"B2\" t=\"inlineStr\"><is><t xml:space=\"preserve\">Ann</t>"), "{xml}");
    assert!(xml.contains("Cy, Jr") && xml.contains("-5") && !xml.contains("Bob"));
}

#[test]
fn group_by_summary() {
    use megacsv_engine::summary::Summary;
    // Rows: 1 Ann IN 1,200.50 | 2 Bob "in " 99 | 3 Cy US empty | 4 Dee INDIA abc | 5 Eve GB -5
    let mut q = Query::new();
    let mut s = Summary::new(Some(1), Some(2), false, 100);
    let (seen, consumed) = s.add(&mut q, PEOPLE, 0, 1, true, b',', Q);
    assert_eq!((seen, consumed), (6, PEOPLE.len()));
    let out = s.finish();
    let mut groups: Vec<(String, Vec<f64>)> = out
        .key_ends
        .iter()
        .enumerate()
        .map(|(i, &e)| {
            let start = if i == 0 { 0 } else { out.key_ends[i - 1] as usize };
            (String::from_utf8(out.keys[start..e as usize].to_vec()).unwrap(), out.stats[i * 6..i * 6 + 6].to_vec())
        })
        .collect();
    let other = groups.pop().unwrap();
    assert_eq!(other.1[0], 0.0);
    groups.sort_by(|a, b| a.0.cmp(&b.0));
    let names: Vec<&str> = groups.iter().map(|g| g.0.as_str()).collect();
    assert_eq!(names, ["GB", "IN", "INDIA", "US", "in"]);
    let us = &groups[3].1;
    assert_eq!(us[..3], [1.0, 1.0, 0.0]); // one row, empty value, no numbers
    let india = &groups[2].1;
    assert_eq!(india[..3], [1.0, 0.0, 0.0]); // "abc" isn't a number
    assert_eq!(groups[1].1, [1.0, 0.0, 1.0, 1200.5, 1200.5, 1200.5]);

    // With a filter, no grouping, and a group cap of 1 sending the rest to "other".
    let mut q = Query::new();
    q.add_filter(2, Op::NotEmpty, b"", 0.0, 0.0, false);
    let mut s = Summary::new(None, Some(2), false, 100);
    s.add(&mut q, PEOPLE, 0, 1, true, b',', Q);
    let out = s.finish();
    assert_eq!(out.stats[..6], [4.0, 0.0, 3.0, 1294.5, -5.0, 1200.5]);
    let mut s = Summary::new(Some(0), None, false, 1);
    s.add(&mut Query::new(), PEOPLE, 0, 1, true, b',', Q);
    let out = s.finish();
    assert_eq!(out.stats.len(), 12);
    assert_eq!(out.stats[6], 4.0); // four rows in "other"
}

#[test]
fn remove_duplicates() {
    let csv: &[u8] = b"id,v\n1,a\n2,b\n1,a\r\n 1 ,c\n3,d\n2,e\n";
    let spec = ExtractSpec { format: Format::Csv, max_rows: 100, xlsx_row: 1, line_ending: b"\n", latin1: false };
    let export = |key, keep_last: bool, cut: usize| {
        let mut q = Query::new();
        q.set_dedupe(Some(key), keep_last, 100);
        if keep_last {
            // First pass in two pieces, as the export worker reads windows.
            let (seen, used) = q.note_last(&csv[..cut], 0, 1, false, b',', Q).unwrap();
            q.note_last(&csv[used..], seen, 1, true, b',', Q).unwrap();
        }
        let first = q.extract(&csv[..cut], 0, 1, false, b',', Q, &spec);
        let rest = q.extract(&csv[first.consumed..], first.rows_seen, 1, true, b',', Q, &spec);
        String::from_utf8([first.bytes, rest.bytes].concat()).unwrap()
    };
    for cut in [10, 17, csv.len()] {
        // Whole rows: "1,a" and "1,a\r" are the same row.
        assert_eq!(export(DedupeKey::Row, false, cut), "1,a\n2,b\n 1 ,c\n3,d\n2,e\n", "cut {cut}");
        // By id, trimmed: keep the first or the last row of each.
        assert_eq!(export(DedupeKey::Column(0), false, cut), "1,a\n2,b\n3,d\n", "cut {cut}");
        assert_eq!(export(DedupeKey::Column(0), true, cut), " 1 ,c\n3,d\n2,e\n", "cut {cut}");
    }
    // Too many distinct keys stops the export.
    let mut q = Query::new();
    q.set_dedupe(Some(DedupeKey::Row), false, 2);
    let out = q.extract(csv, 0, 1, true, b',', Q, &spec);
    assert!(out.too_many_keys);
    assert_eq!(out.rows_out, 2);
}
