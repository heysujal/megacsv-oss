// "Try a sample file": a made-up 2 GB transactions file built in the browser.
// One 16 MB block of rows is generated, then repeated by reference, so it takes
// well under a second and almost no memory. Seeded, so the same file every time
// (instant reopen works on it too).

const VENDORS = ["Acme Industrial Supply", "Northwind Traders", "Globex Logistics", "Initech Software", "Umbrella Freight", "Soylent Foods", "Vandelay Imports", "Stark Components", "Wayne Packaging", "Hooli Cloud"];
const ACCOUNTS = ["6100 Materials", "6200 Freight", "6400 Software", "7100 Travel", "7300 Utilities"];
const CURRENCIES = ["USD", "EUR", "INR", "GBP", "SGD"];
const STATUSES = ["Posted", "Posted", "Posted", "Pending", "Reversed"];
const COUNTRIES = ["US", "DE", "IN", "GB", "SG", "FR", "JP"];

const BLOCK_BYTES = 16 * 1024 * 1024;
const REPEATS = 128;

/** Small seeded generator (mulberry32). */
function random(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSampleFile(): File {
  const rand = random(7);
  const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)];
  const lines: string[] = [];
  let bytes = 0;
  for (let i = 0; bytes < BLOCK_BYTES; i++) {
    const month = 7 + Math.floor(rand() * 3);
    const day = 1 + Math.floor(rand() * 28);
    const amount = (12 + rand() * 48_000).toFixed(2);
    const line = `TX-${String(90_412_000 + i).padStart(9, "0")},2026-0${month}-${String(day).padStart(2, "0")},${pick(VENDORS)},${pick(ACCOUNTS)},${amount},${pick(CURRENCIES)},${pick(STATUSES)},${pick(COUNTRIES)}\n`;
    lines.push(line);
    bytes += line.length;
  }
  const block = new Blob(lines);
  const header = "txn_id,posted_date,vendor,account,amount,currency,status,country\n";
  return new File([header, ...Array.from({ length: REPEATS }, () => block)], "sample-transactions.csv", {
    type: "text/csv",
    lastModified: Date.UTC(2026, 9, 1),
  });
}
