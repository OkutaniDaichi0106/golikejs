export interface Context {
  /**
   * Returns a promise that resolves when the context is finished (cancelled, timed out, etc).
   * Never rejects.
   */
  done(): Promise<void>;
  /**
   * The cancellation error if the context is finished. `undefined` means: not cancelled / finished without error.
   */
  err(): Error | undefined;
}

export type CancelFunc = () => void;
export type CancelCauseFunc = (err: Error | undefined) => void;

export const ContextCancelledError = new Error('Context cancelled');
export const ContextTimeoutError = new Error('Context timeout');

class DefaultContext implements Context {
  // Lazily-created done promise and its resolver. If never awaited, we avoid
  // allocating the Promise to reduce memory pressure for short-lived contexts.
  #donePromise?: Promise<void>;
  #resolve?: () => void;
  #err?: Error; // undefined => either not done yet OR completed cleanly

  constructor(parent?: Context) {
    if (parent) {
      // Propagate parent cancellation (simplified for idempotency)
      parent.done().then(() => {
        this.cancel(parent.err()); // cancel is idempotent
      });
    }
  }

  done(): Promise<void> {
    // If already created, return it.
    if (this.#donePromise) return this.#donePromise;

    // If already finished (cancelled or completed), return resolved promise.
    if (this.#err !== undefined) {
      this.#donePromise = Promise.resolve();
      this.#resolve = () => {};
      return this.#donePromise;
    }

    // Otherwise create the promise and capture the resolver lazily.
    this.#donePromise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
    return this.#donePromise;
  }

  err(): Error | undefined {
    return this.#err;
  }

  // If called with no arguments, treat as cancellation with default error.
  // If called with an explicit `undefined`, treat as finished without error.
  cancel(err?: Error): void {
    if (this.#err !== undefined) return; // idempotent

    if (arguments.length === 0) {
      // No argument passed -> default cancellation error
      this.#err = ContextCancelledError;
    } else {
      // Explicit argument passed (possibly undefined) -> set as-is
      this.#err = err;
    }

    if (this.#resolve) {
      // If someone is waiting, resolve the promise.
      this.#resolve();
    } else {
      // If nobody has awaited yet, create an already-resolved promise so
      // future calls to done() return a resolved promise.
      this.#donePromise = Promise.resolve();
      this.#resolve = () => {};
    }
  }
}

const backgroundContext: Context = (() => {
  const context = new DefaultContext();
  // Guard for SSR / non-browser environments
  if (typeof window !== 'undefined' && typeof globalThis.addEventListener === 'function') {
    const handlePageTermination = (eventType: string) => {
      context.cancel(new Error(`Page ${eventType}`));
    };
    const once = { once: true } as const;
    globalThis.addEventListener('beforeunload', () => handlePageTermination('unloading'), once);
    globalThis.addEventListener('unload', () => handlePageTermination('unloaded'), once);
    globalThis.addEventListener('pagehide', () => handlePageTermination('hidden'), once);
  }
  return context;
})();

// Public API functions
export function background(): Context {
  return backgroundContext;
}

/**
 * Watch an external AbortSignal and cancel the returned Context when the signal aborts.
 * This mirrors the behavior of the previous `withSignal` but is named to emphasize
 * that the signal is being observed rather than produced. Returns a Context derived
 * from `parent` which will be cancelled when `signal` aborts.
 */
export function watchSignal(parent: Context, signal: AbortSignal): Context {
  const context = new DefaultContext(parent);

  const onAbort = () => {
    context.cancel(
      (signal as any).reason instanceof Error
        ? (signal as any).reason as Error
        : ContextCancelledError,
    );
  };

  if (signal.aborted) {
    onAbort();
  } else {
    signal.addEventListener('abort', onAbort, { once: true });
    // Ensure listener removal when context ends earlier
    context.done().finally(() => signal.removeEventListener('abort', onAbort));
  }
  return context;
}

// (No backwards-compatible aliases — package is not yet published.)

/**
 * Go-style helper: returns a new child Context and an AbortController paired to it.
 * - Aborting the returned controller will cancel the Context (with controller.reason if provided).
 * - Cancelling the Context will abort the controller's signal (with the context's error as reason when possible).
 * This provides a two-way bridge between AbortController-based APIs and this Context implementation,
 * and follows the Go idiom where a create function returns both the derived Context and a cancel handle.
 */
export function withAbort(parent: Context): [Context, AbortController] {
  const context = new DefaultContext(parent);
  const ac = new AbortController();

  const onAbort = () => {
    context.cancel(
      (ac.signal as any).reason instanceof Error
        ? (ac.signal as any).reason as Error
        : ContextCancelledError,
    );
  };

  if (ac.signal.aborted) {
    onAbort();
  } else {
    ac.signal.addEventListener('abort', onAbort, { once: true });
    context.done().finally(() => ac.signal.removeEventListener('abort', onAbort));
  }

  // Ensure context cancellation aborts the controller (two-way sync)
  context.done().then(() => {
    const err = context.err();
    try {
      // Modern AbortController supports a reason argument; try to pass the error.
      (ac as any).abort(err);
    } catch {
      ac.abort();
    }
  });

  return [context, ac];
}

export function withCancel(parent: Context): [Context, CancelFunc] {
  const context = new DefaultContext(parent);
  return [context, () => context.cancel(ContextCancelledError)];
}

export function withCancelCause(parent: Context): [Context, CancelCauseFunc] {
  const context = new DefaultContext(parent);
  return [context, (err: Error | undefined) => context.cancel(err)];
}

export function withTimeout(parent: Context, timeoutMs: number): Context {
  const context = new DefaultContext(parent);
  const id = setTimeout(() => {
    context.cancel(new Error(`Context timeout after ${timeoutMs}ms`));
  }, timeoutMs);
  context.done().finally(() => clearTimeout(id));
  return context;
}

export function watchPromise<T>(parent: Context, promise: Promise<T>): Context {
  const context = new DefaultContext(parent);
  promise.then(
    () => context.cancel(undefined), // normal completion: finished without an error
    (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      context.cancel(error);
    },
  );
  return context;
}

class AfterFuncContext extends DefaultContext {
  #fn?: () => void | Promise<void>;
  #executed = false;

  constructor(parent: Context, fn: () => void | Promise<void>) {
    super(parent);
    this.#fn = fn;

    // When the parent context finishes, execute the function
    parent.done().then(() => {
      this.#executeFunc();
    });
  }

  #executeFunc(): void {
    if (this.#executed || this.#fn === undefined) {
      return;
    }
    this.#executed = true;
    const fn = this.#fn;
    this.#fn = undefined;

    // Execute the function without awaiting (fire-and-forget)
    // to match Go's behavior of running in a separate goroutine
    const result = fn();
    if (result instanceof Promise) {
      result.catch(() => {
        // Silently ignore errors during execution
      });
    }
  }

  stop(): boolean {
    if (this.#executed || this.#fn === undefined) {
      return false;
    }
    this.#executed = true;
    this.#fn = undefined;
    return true;
  }
}

export function afterFunc(parent: Context, fn: () => void | Promise<void>): () => boolean {
  const ctx = new AfterFuncContext(parent, fn);

  return () => ctx.stop();
}
/**
 * Convert a Context into an AbortSignal for integration with fetch / Web APIs.
 */
export function toAbortSignal(ctx: Context): AbortSignal {
  const ac = new AbortController();
  ctx.done().then(() => {
    const err = ctx.err();
    if (err) {
      // AbortController#abort can take a reason in modern browsers
      try {
        (ac as any).abort(err);
      } catch {
        ac.abort();
      }
    } else {
      ac.abort();
    }
  });
  return ac.signal;
}
