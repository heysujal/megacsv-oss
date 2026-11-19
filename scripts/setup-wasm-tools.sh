#!/usr/bin/env bash
# Installs Rust, the wasm32 target, wasm-bindgen and wasm-opt on a Linux x86_64 build machine
# (Cloudflare Workers Builds has Node but no Rust). Sourced by build-wasm.sh, so the PATH change
# carries over. Versions must match engine/Cargo.toml (wasm-bindgen) and the Mac (binaryen).
WASM_BINDGEN_VERSION=0.2.130
BINARYEN_VERSION=133

tools="$HOME/.wasm-tools"
mkdir -p "$tools"

if ! command -v cargo >/dev/null; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --target wasm32-unknown-unknown
  export PATH="$HOME/.cargo/bin:$PATH"
fi
rustup target add wasm32-unknown-unknown

if ! command -v wasm-bindgen >/dev/null; then
  curl -sSfL "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$WASM_BINDGEN_VERSION/wasm-bindgen-$WASM_BINDGEN_VERSION-x86_64-unknown-linux-musl.tar.gz" \
    | tar xz -C "$tools" --strip-components=1 "wasm-bindgen-$WASM_BINDGEN_VERSION-x86_64-unknown-linux-musl/wasm-bindgen"
fi

if ! command -v wasm-opt >/dev/null; then
  curl -sSfL "https://github.com/WebAssembly/binaryen/releases/download/version_$BINARYEN_VERSION/binaryen-version_$BINARYEN_VERSION-x86_64-linux.tar.gz" \
    | tar xz -C "$tools" --strip-components=1 "binaryen-version_$BINARYEN_VERSION/bin" "binaryen-version_$BINARYEN_VERSION/lib"
fi

export PATH="$tools/bin:$tools:$PATH"
