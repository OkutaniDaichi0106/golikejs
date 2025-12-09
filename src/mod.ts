/**
 * This module provides various functionalities for building Go-like applications in JavaScript/TypeScript.
 *
 * This module contains sub-modules for:
 * - {@link sync} Synchronous programming utilities
 * - {@link context}Context management
 * - {@link bytes} Bytes manipulation
 * - {@link io} Input/Output operations
 *
 * ### Example
 * ```ts
 * import {
 *     defer,
 *     Channel,
 *     Slice,
 *     context,
 *     sync,
 *     bytes,
 *     io,
 * } from "@okdaichi/golikejs";
 *
 * ```
 *
 * @module @okdaichi/golikejs
 */

export * from "./slice.ts";
export * from "./defer.ts";
export * from "./channel.ts";
export * as sync from "./sync/mod.ts";
export * as context from "./context/mod.ts";
export * as bytes from "./bytes/mod.ts";
export * as io from "./io/mod.ts";
