/**
 * Context utilities for cancellation and timeouts.
 *
 * This sub-module provides a small, Go-like Context implementation for
 * cooperative cancellation and deadline propagation across asynchronous
 * operations. Use these helpers to create derived contexts, connect to
 * AbortController/AbortSignal-based APIs, or watch promises and signals.
 *
 * Exported highlights:
 * - {@link background} - a background/root Context that never times out on its own
 * - {@link withCancel}, {@link withCancelCause} - create cancellable child contexts
 * - {@link withTimeout} - create a child context that cancels after a timeout
 * - {@link withAbort} - bridge between Context and AbortController
 * - {@link watchSignal}, {@link watchPromise} - observe external signals/promises
 * - {@link toAbortSignal} - convert a Context to an AbortSignal
 *
 * Example
 * ```ts
 * import { context } from "@okdaichi/golikejs";
 *
 * const ctx = context.background();
 * const child = context.withTimeout(ctx, 5000);
 * // use `child` in async work; it will cancel after 5s or when parent cancels
 * ```
 *
 * @module @okdaichi/golikejs/context
 */

export * from "./context.ts";
