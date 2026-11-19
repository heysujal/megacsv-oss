//! MegaCSV engine: indexes huge CSV files in chunks and parses rows on demand.
//! The file itself is never held in memory; callers pass slices.

pub mod index;
pub mod parse;
pub mod query;
pub mod rows;
pub mod scan;
pub mod sniff;
pub mod sort;
pub mod summary;
pub mod xlsx;

#[cfg(target_arch = "wasm32")]
mod wasm;
