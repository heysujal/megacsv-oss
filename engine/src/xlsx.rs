//! Spreadsheet XML for one worksheet row. The zip container and the fixed
//! workbook parts are written by the app.

/// Excel refuses cells longer than this many UTF-16 units.
const MAX_CELL_UNITS: usize = 32_767;

/// Windows-1252 bytes 0x80..=0x9F; the rest map to the same code point.
const CP1252_HIGH: [char; 32] = [
    '€', '\u{81}', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', '\u{8D}', 'Ž', '\u{8F}', '\u{90}',
    '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', '\u{9D}', 'ž', 'Ÿ',
];

pub fn cp1252_char(b: u8) -> char {
    match b {
        0x80..=0x9F => CP1252_HIGH[(b - 0x80) as usize],
        _ => b as char,
    }
}

/// Appends `<row>` XML for fields split by `rows::split_fields`.
/// `latin1` means the bytes are Windows-1252 rather than UTF-8.
pub fn write_row(out: &mut Vec<u8>, row_num: u32, data: &[u8], ends: &[u32], latin1: bool) {
    out.extend_from_slice(b"<row r=\"");
    push_u32(out, row_num);
    out.extend_from_slice(b"\">");
    let mut start = 0;
    for (col, &end) in ends.iter().enumerate() {
        let f = &data[start..end as usize];
        start = end as usize;
        if f.is_empty() {
            continue;
        }
        out.extend_from_slice(b"<c r=\"");
        push_col(out, col);
        push_u32(out, row_num);
        if is_plain_number(f) {
            out.extend_from_slice(b"\"><v>");
            out.extend_from_slice(f);
            out.extend_from_slice(b"</v></c>");
        } else {
            out.extend_from_slice(b"\" t=\"inlineStr\"><is><t xml:space=\"preserve\">");
            push_text(out, f, latin1);
            out.extend_from_slice(b"</t></is></c>");
        }
    }
    out.extend_from_slice(b"</row>");
}

/// True if Excel would store the value exactly as written: no leading zeros
/// (IDs like 007), at most 15 significant digits (long IDs, card numbers),
/// and no exponent or separators. Anything else is written as text.
pub fn is_plain_number(f: &[u8]) -> bool {
    let digits = f.strip_prefix(b"-").unwrap_or(f);
    let (int, frac) = match digits.iter().position(|&b| b == b'.') {
        Some(i) => (&digits[..i], Some(&digits[i + 1..])),
        None => (digits, None),
    };
    if int.is_empty() || !int.iter().all(u8::is_ascii_digit) {
        return false;
    }
    if int.len() > 1 && int[0] == b'0' {
        return false;
    }
    let frac_len = match frac {
        Some(fr) if fr.is_empty() || !fr.iter().all(u8::is_ascii_digit) => return false,
        Some(fr) => fr.len(),
        None => 0,
    };
    let significant = if int == b"0" { frac_len } else { int.len() + frac_len };
    significant <= 15
}

fn push_u32(out: &mut Vec<u8>, mut n: u32) {
    let mut buf = [0u8; 10];
    let mut i = buf.len();
    loop {
        i -= 1;
        buf[i] = b'0' + (n % 10) as u8;
        n /= 10;
        if n == 0 {
            break;
        }
    }
    out.extend_from_slice(&buf[i..]);
}

/// Spreadsheet column name: 0 → A, 25 → Z, 26 → AA.
pub fn push_col(out: &mut Vec<u8>, col: usize) {
    let mut buf = [0u8; 4];
    let mut i = buf.len();
    let mut n = col + 1;
    while n > 0 {
        i -= 1;
        buf[i] = b'A' + ((n - 1) % 26) as u8;
        n = (n - 1) / 26;
    }
    out.extend_from_slice(&buf[i..]);
}

fn push_text(out: &mut Vec<u8>, f: &[u8], latin1: bool) {
    let mut units = 0;
    let mut push = |c: char, out: &mut Vec<u8>| -> bool {
        units += c.len_utf16();
        if units > MAX_CELL_UNITS {
            return false;
        }
        match c {
            '&' => out.extend_from_slice(b"&amp;"),
            '<' => out.extend_from_slice(b"&lt;"),
            '>' => out.extend_from_slice(b"&gt;"),
            // Characters XML 1.0 does not allow.
            '\u{0}'..='\u{8}' | '\u{B}' | '\u{C}' | '\u{E}'..='\u{1F}' | '\u{FFFE}' | '\u{FFFF}' => {}
            _ => {
                let mut tmp = [0u8; 4];
                out.extend_from_slice(c.encode_utf8(&mut tmp).as_bytes());
            }
        }
        true
    };
    if latin1 {
        for &b in f {
            if !push(cp1252_char(b), out) {
                return;
            }
        }
    } else {
        for c in String::from_utf8_lossy(f).chars() {
            if !push(c, out) {
                return;
            }
        }
    }
}
