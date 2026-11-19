#!/usr/bin/env bash
# Builds the Rust engine to WebAssembly into app/src/wasm.
set -euo pipefail
cd "$(dirname "$0")/.."
# Cloudflare's build machine has no Rust; install it there. Locally a missing tool is an error.
if [ -n "${WORKERS_CI:-}" ]; then
  . scripts/setup-wasm-tools.sh
fi
# Panic messages embed source paths; hide the home folder so the shipped file
# doesn't reveal the builder's username. Cargo appends this to the simd128 flag
# in .cargo/config.toml.
cargo build --release --target wasm32-unknown-unknown -p megacsv-engine \
  --config "target.wasm32-unknown-unknown.rustflags=['--remap-path-prefix=$HOME=~']"
wasm-bindgen target/wasm32-unknown-unknown/release/megacsv_engine.wasm \
  --target web --out-dir app/src/wasm
wasm-opt -O3 --strip-debug --strip-producers \
  --enable-simd --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
  --enable-nontrapping-float-to-int --enable-reference-types --enable-multivalue \
  app/src/wasm/megacsv_engine_bg.wasm -o app/src/wasm/megacsv_engine_bg.wasm
printf 'wasm: %s bytes (%s gzipped)\n' \
  "$(wc -c < app/src/wasm/megacsv_engine_bg.wasm | tr -d ' ')" \
  "$(gzip -c app/src/wasm/megacsv_engine_bg.wasm | wc -c | tr -d ' ')"
