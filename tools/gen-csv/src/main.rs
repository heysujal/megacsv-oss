//! Test-file generator.
//!
//!   gen-csv --size 1G --out testdata/1gb.csv [--seed 7]
//!   gen-csv --nasty engine/tests/fixtures
//!
//! Large files look like an orders export, with the occasional quoted field,
//! doubled quote and embedded newline, so they exercise the slow paths.

use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::Path;
use std::time::Instant;

const FIRST: &[&str] = &["Priya", "Marcus", "Ana", "Wei", "Fatima", "John", "Olga", "Kenji", "Amara", "Luis"];
const LAST: &[&str] = &["Sharma", "Lee", "García", "Zhang", "Khan", "Smith", "Ivanova", "Sato", "Okafor", "Silva"];
const COUNTRY: &[&str] = &["IN", "US", "GB", "DE", "BR", "JP", "NG", "FR", "CA", "AU"];
const PRODUCT: &[&str] = &["Desk lamp", "USB-C cable", "Notebook A5", "Office chair", "Monitor 27\"", "Coffee beans 1kg", "Headphones"];
const STATUS: &[&str] = &["paid", "refunded", "pending", "shipped", "cancelled"];
const NOTES: &[&str] = &["", "", "", "gift wrap", "leave at door", "call before delivery", "fragile"];

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        // xorshift64*
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
    fn pick<'a>(&mut self, items: &[&'a str]) -> &'a str {
        items[self.below(items.len() as u64) as usize]
    }
}

fn parse_size(s: &str) -> u64 {
    let s = s.trim().to_ascii_uppercase();
    let (num, mult) = match s.chars().last() {
        Some('K') => (&s[..s.len() - 1], 1u64 << 10),
        Some('M') => (&s[..s.len() - 1], 1 << 20),
        Some('G') => (&s[..s.len() - 1], 1 << 30),
        _ => (&s[..], 1),
    };
    let n: f64 = num.trim_end_matches('B').parse().expect("size like 500M or 5G");
    (n * mult as f64) as u64
}

fn write_quoted(out: &mut Vec<u8>, s: &str) {
    out.push(b'"');
    for &b in s.as_bytes() {
        if b == b'"' {
            out.push(b'"');
        }
        out.push(b);
    }
    out.push(b'"');
}

fn write_row(out: &mut Vec<u8>, rng: &mut Rng, id: u64) {
    let qty = 1 + rng.below(9);
    let cents = 199 + rng.below(49_800);
    let product = rng.pick(PRODUCT);
    let _ = write!(
        out,
        "{id},2026-{:02}-{:02},{} {},{}.{}{}@example.com,{},",
        1 + rng.below(12),
        1 + rng.below(28),
        rng.pick(FIRST),
        rng.pick(LAST),
        rng.pick(FIRST).to_lowercase(),
        rng.pick(LAST).to_lowercase(),
        rng.below(100),
        rng.pick(COUNTRY),
    );
    if product.contains('"') {
        write_quoted(out, product);
    } else {
        out.extend_from_slice(product.as_bytes());
    }
    let _ = write!(
        out,
        ",{qty},{}.{:02},{}.{:02},{},{},",
        cents / 100,
        cents % 100,
        qty * cents / 100,
        qty * cents % 100,
        if rng.below(4) == 0 { "USD" } else { "INR" },
        rng.pick(STATUS),
    );
    match rng.below(100) {
        0 => write_quoted(out, "line one\nline two"),
        1..=4 => write_quoted(out, "said \"rush order\""),
        5..=14 => write_quoted(out, "boxes, tape, labels"),
        _ => out.extend_from_slice(rng.pick(NOTES).as_bytes()),
    }
    out.push(b'\n');
}

fn generate(size: u64, path: &Path, seed: u64) {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).unwrap();
    }
    let mut w = BufWriter::with_capacity(8 << 20, File::create(path).unwrap());
    let header = "order_id,order_date,customer_name,email,country,product,quantity,unit_price,total,currency,status,notes\n";
    w.write_all(header.as_bytes()).unwrap();
    let mut written = header.len() as u64;
    let mut rng = Rng(seed.max(1));
    let mut buf = Vec::with_capacity(1 << 20);
    let mut id = 1u64;
    let start = Instant::now();
    let mut next_report = 0u64;
    while written < size {
        buf.clear();
        while buf.len() < (1 << 20) - 512 && written + (buf.len() as u64) < size {
            write_row(&mut buf, &mut rng, id);
            id += 1;
        }
        w.write_all(&buf).unwrap();
        written += buf.len() as u64;
        if written >= next_report {
            let secs = start.elapsed().as_secs_f64().max(1e-3);
            eprintln!(
                "  {:>5.1}%  {:>7.0} MB  {:>5.0} MB/s",
                100.0 * written as f64 / size as f64,
                written as f64 / 1e6,
                written as f64 / 1e6 / secs
            );
            next_report += size / 50;
        }
    }
    w.flush().unwrap();
    eprintln!("wrote {} ({} data rows, {:.1} s)", path.display(), id - 1, start.elapsed().as_secs_f64());
}

/// Small files covering the edge cases parsers get wrong.
fn nasty(dir: &Path) {
    fs::create_dir_all(dir).unwrap();
    let mut wide = String::new();
    for i in 0..2000 {
        wide.push_str(&format!("c{i},"));
    }
    wide.pop();
    wide.push('\n');
    let long_cell = format!("id,text\n1,\"{}\"\n2,short\n", "x".repeat(200_000));
    let files: Vec<(&str, Vec<u8>)> = vec![
        ("basic.csv", b"name,age\nann,31\nbob,42\n".to_vec()),
        ("no-trailing-newline.csv", b"name,age\nann,31\nbob,42".to_vec()),
        ("crlf.csv", b"name,age\r\nann,31\r\nbob,42\r\n".to_vec()),
        ("bom-utf8.csv", b"\xEF\xBB\xBFname,city\nann,K\xC3\xB6ln\n".to_vec()),
        ("quoted-delimiters.csv", b"a,b\n\"x,y\",\"1,2,3\"\n".to_vec()),
        ("doubled-quotes.csv", b"a,b\n\"she said \"\"hi\"\"\",2\n\"\"\"\"\"\",3\n".to_vec()),
        ("embedded-newlines.csv", b"id,note\n1,\"line one\nline two\"\n2,\"a\r\nb\"\n3,plain\n".to_vec()),
        ("empty-fields.csv", b"a,b,c\n,,\n1,,3\n\"\",x,\n".to_vec()),
        ("ragged-rows.csv", b"a,b,c\n1\n1,2\n1,2,3,4\n".to_vec()),
        ("unicode.csv", "name,greeting\n李,你好\nОльга,привет\nAmara,👋🏾\n".as_bytes().to_vec()),
        ("semicolon.csv", b"name;amount\nann;1,50\nbob;2,75\n".to_vec()),
        ("tab.tsv", b"name\tamount\nann\t1.50\nbob\t2.75\n".to_vec()),
        ("pipe.csv", b"name|amount\nann|1.50\nbob|2.75\n".to_vec()),
        ("single-column.csv", b"value\n1\n2\n3\n".to_vec()),
        ("header-only.csv", b"a,b,c\n".to_vec()),
        ("empty.csv", Vec::new()),
        ("wide-2000-cols.csv", wide.into_bytes()),
        ("long-cell-200k.csv", long_cell.into_bytes()),
        // Not valid RFC 4180; must not crash, and the index must agree with the parser.
        ("malformed-stray-quote.csv", b"id,size\n1,27\" monitor\n2,ok\n3,ok\n".to_vec()),
        ("malformed-unclosed-quote.csv", b"id,note\n1,\"never closed\n2,x\n".to_vec()),
        ("windows-1252.csv", b"name,city\nJos\xE9,M\xFCnchen\n".to_vec()),
        ("blank-lines.csv", b"a,b\n\n1,2\n\n".to_vec()),
    ];
    for (name, bytes) in &files {
        fs::write(dir.join(name), bytes).unwrap();
    }
    eprintln!("wrote {} files to {}", files.len(), dir.display());
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let get = |flag: &str| args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1));
    if let Some(dir) = get("--nasty") {
        nasty(Path::new(dir));
        return;
    }
    let (Some(size), Some(out)) = (get("--size"), get("--out")) else {
        eprintln!("usage: gen-csv --size 1G --out testdata/1gb.csv [--seed N]\n       gen-csv --nasty DIR");
        std::process::exit(2);
    };
    let seed = get("--seed").map_or(7, |s| s.parse().unwrap());
    generate(parse_size(size), Path::new(out), seed);
}
