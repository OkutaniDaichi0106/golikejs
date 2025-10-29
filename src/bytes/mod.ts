/**
 * Byte-slice helpers and buffer utilities.
 *
 * This sub-module mirrors many of Go's `bytes` package conveniences but works
 * with JavaScript's `Uint8Array`. It contains functions for searching,
 * transforming, splitting/joining, trimming, and a `Buffer` class that
 * implements stream-like `Reader` / `Writer` semantics.
 *
 * Exported highlights:
 * - {@link Buffer} (from `buffer.ts`) - in-memory growable byte buffer implementing `Reader` and `Writer`
 *
 * Notes:
 * - These helpers operate on `Uint8Array` (UTF-8 encoded data when treating as text).
 * - When converting between strings and bytes, prefer `TextEncoder`/`TextDecoder`.
 *
 * Example
 * ```ts
 * import { bytes } from "@okudai/golikejs";
 * const b = bytes.Buffer.make(128);
 * await b.write(new TextEncoder().encode("hello"));
 * const buf = b.bytes();
 * console.log(new TextDecoder().decode(buf));
 * ```
 *
 * @module @okudai/golikejs/bytes
 */

export * from "./buffer.ts";
export * from "./search.ts";
export * from "./transform.ts";
export * from "./split_join.ts";
export * from "./trim.ts";
