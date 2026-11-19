use megacsv_engine::query::{Op, Query, parse_number_with};
use megacsv_engine::sort::{SortKeys, encode_key, read_record};
use proptest::prelude::*;
use std::cmp::Ordering;

const Q: Option<u8> = Some(b'"');

/// Reference order, written independently of the key encoding: numbers, then
/// text (ASCII case ignored, first `max_text` bytes), then empty; ties by row.
#[derive(Debug, Clone, PartialEq)]
enum Class {
    Number(f64),
    Text(Vec<u8>),
    Empty,
}

fn classify(raw: &[u8], max_text: usize) -> Class {
    let v = raw.trim_ascii();
    if v.is_empty() {
        Class::Empty
    } else if let Some(n) = parse_number_with(v, false) {
        Class::Number(n)
    } else {
        Class::Text(v[..v.len().min(max_text)].to_ascii_lowercase())
    }
}

fn cmp_values(a: &Class, b: &Class, descending: bool) -> Ordering {
    use Class::*;
    let rank = |c: &Class| match c {
        Number(_) => 0,
        Text(_) => 1,
        Empty => 2,
    };
    match (a, b) {
        (Empty, Empty) => Ordering::Equal,
        (Empty, _) => Ordering::Greater,
        (_, Empty) => Ordering::Less,
        _ => {
            let o = match (a, b) {
                (Number(x), Number(y)) => x.partial_cmp(y).unwrap(),
                (Text(x), Text(y)) => x.cmp(y),
                _ => rank(a).cmp(&rank(b)),
            };
            if descending { o.reverse() } else { o }
        }
    }
}

fn csv_field(v: &str) -> String {
    if v.contains([',', '"', '\n']) { format!("\"{}\"", v.replace('"', "\"\"")) } else { v.to_string() }
}

/// Builds `id,v` rows and returns (csv, values by data row).
fn build(values: &[String]) -> Vec<u8> {
    let mut s = String::from("id,v\n");
    for (i, v) in values.iter().enumerate() {
        s.push_str(&format!("{i},{}\n", csv_field(v)));
    }
    s.into_bytes()
}

/// Sorts `buf` (header row 0) by column 1, in `parts` pieces split at row starts.
fn sort_run(buf: &[u8], descending: bool, max_text: usize, query: &mut Query, cuts: &[usize]) -> Vec<(Vec<u8>, u64, u64, u64)> {
    let mut s = SortKeys::new(1, descending, false, max_text);
    let mut base = 0usize;
    let mut row = 0u64;
    let mut bounds: Vec<usize> = cuts.to_vec();
    bounds.push(buf.len());
    for &end in &bounds {
        if end <= base {
            continue;
        }
        let (seen, consumed) = s.add(query, &buf[base..end], base as u64, row, 1, end == buf.len(), b',', Q);
        row += seen;
        base += consumed;
    }
    let run = s.finish();
    let mut out = vec![];
    let mut pos = 0;
    while let Some((key, r, start, next, p)) = read_record(&run, pos) {
        out.push((key.to_vec(), r as u64, start as u64, next as u64));
        pos = p;
    }
    assert_eq!(pos, run.len(), "run has trailing bytes");
    out
}

/// Row starts in `buf`, to cut it at.
fn row_starts(buf: &[u8]) -> Vec<usize> {
    let mut v = vec![];
    let mut in_q = false;
    for (i, &b) in buf.iter().enumerate() {
        if b == b'"' {
            in_q = !in_q;
        } else if b == b'\n' && !in_q && i + 1 < buf.len() {
            v.push(i + 1);
        }
    }
    v
}

fn value() -> impl Strategy<Value = String> {
    prop_oneof![
        3 => (-1000i32..1000).prop_map(|n| n.to_string()),
        1 => (-100.0f64..100.0).prop_map(|f| format!("{f:.2}")),
        1 => Just("1,234".to_string()),
        1 => Just("-0".to_string()),
        3 => "[a-dA-D ]{0,6}",
        1 => "[a-c]{1,3}, [a-c]{1,3}",
        1 => Just("".to_string()),
        1 => Just("  ".to_string()),
        1 => "[aA]{18,24}",
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(300))]

    #[test]
    fn run_matches_reference_order(values in prop::collection::vec(value(), 0..80), descending in any::<bool>(), cut in any::<prop::sample::Index>()) {
        let max_text = 16;
        let buf = build(&values);
        let starts = row_starts(&buf);
        let cuts = if starts.is_empty() { vec![] } else { vec![starts[cut.index(starts.len())]] };
        let recs = sort_run(&buf, descending, max_text, &mut Query::new(), &cuts);

        // Every data row exactly once, with the right byte range.
        prop_assert_eq!(recs.len(), values.len());
        let mut rows: Vec<u64> = recs.iter().map(|r| r.1).collect();
        rows.sort();
        prop_assert_eq!(rows, (1..=values.len() as u64).collect::<Vec<_>>());
        for r in &recs {
            let line = &buf[r.2 as usize..r.3 as usize];
            let prefix = format!("{},", r.1 - 1);
            prop_assert!(line.starts_with(prefix.as_bytes()), "row {} has the wrong bytes", r.1);
        }

        // Order equals the reference comparator, ties in file order.
        for w in recs.windows(2) {
            let a = classify(values[(w[0].1 - 1) as usize].as_bytes(), max_text);
            let b = classify(values[(w[1].1 - 1) as usize].as_bytes(), max_text);
            let o = cmp_values(&a, &b, descending).then(w[0].1.cmp(&w[1].1));
            prop_assert_eq!(o, Ordering::Less, "{:?} before {:?}", a, b);
            // And the keys alone agree with it.
            prop_assert!(w[0].0 <= w[1].0);
        }
    }

    #[test]
    fn filters_apply_to_sorting(values in prop::collection::vec(value(), 0..60)) {
        let buf = build(&values);
        let mut q = Query::new();
        q.add_filter(1, Op::NotEmpty, b"", 0.0, 0.0, false);
        let recs = sort_run(&buf, false, 64, &mut q, &[]);
        let expected = values.iter().filter(|v| !v.trim().is_empty()).count();
        prop_assert_eq!(recs.len(), expected);
    }
}

fn order(values: &[&str], descending: bool) -> Vec<String> {
    let owned: Vec<String> = values.iter().map(|s| s.to_string()).collect();
    let buf = build(&owned);
    sort_run(&buf, descending, 64, &mut Query::new(), &[]).iter().map(|r| owned[(r.1 - 1) as usize].clone()).collect()
}

#[test]
fn excel_like_order() {
    let v = ["10", "9", "abc", "ABD", "", "-3", "1,234", "b", "abc"];
    assert_eq!(order(&v, false), ["-3", "9", "10", "1,234", "abc", "abc", "ABD", "b", ""]);
    assert_eq!(order(&v, true), ["b", "ABD", "abc", "abc", "1,234", "10", "9", "-3", ""]);
}

#[test]
fn prefix_text_sorts_first() {
    assert_eq!(order(&["abc", "ab", "abcd"], false), ["ab", "abc", "abcd"]);
    assert_eq!(order(&["abc", "ab", "abcd"], true), ["abcd", "abc", "ab"]);
}

#[test]
fn keys_order_numbers_by_value() {
    let key = |s: &str| {
        let mut k = vec![];
        encode_key(s.as_bytes(), false, false, 64, &mut k);
        k
    };
    let nums = ["-1e300", "-5.5", "-0.25", "0", "-0", "0.001", "2", "10", "1e300"];
    for w in nums.windows(2) {
        assert!(key(w[0]) <= key(w[1]), "{} vs {}", w[0], w[1]);
    }
    assert_eq!(key("0"), key("-0"));
    let mut dc = vec![];
    encode_key(b"21,5", true, false, 64, &mut dc);
    let mut dot = vec![];
    encode_key(b"21.5", false, false, 64, &mut dot);
    assert_eq!(dc, dot, "decimal comma read as a number");
}
