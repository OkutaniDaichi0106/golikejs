// Simple test utilities for Deno tests
// Replaces @std/assert for offline testing

export function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  // Handle Sets
  if (actual instanceof Set && expected instanceof Set) {
    if (actual.size !== expected.size) {
      throw new AssertionError(
        msg ||
          `Sets are not equal.\n  Actual size: ${actual.size}\n  Expected size: ${expected.size}`,
      );
    }
    for (const item of actual) {
      if (!expected.has(item)) {
        throw new AssertionError(
          msg || `Sets are not equal.\n  Actual has ${item} but expected doesn't`,
        );
      }
    }
    return;
  }

  // Handle arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      throw new AssertionError(
        msg ||
          `Arrays have different lengths.\n  Actual: ${actual.length}\n  Expected: ${expected.length}`,
      );
    }
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i] && !Object.is(actual[i], expected[i])) {
        throw new AssertionError(
          msg ||
            `Arrays differ at index ${i}.\n  Actual[${i}]: ${actual[i]}\n  Expected[${i}]: ${
              expected[i]
            }`,
        );
      }
    }
    return;
  }

  if (actual !== expected && !Object.is(actual, expected)) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    throw new AssertionError(
      msg || `Values are not equal.\n  Actual: ${actualStr}\n  Expected: ${expectedStr}`,
    );
  }
}

export function assert(expr: unknown, msg = ''): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

export async function assertThrows<E extends Error = Error>(
  fn: () => unknown | Promise<unknown>,
  // deno-lint-ignore no-explicit-any
  ErrorClass?: ErrorConstructor | (new (...args: any[]) => E),
  msgIncludes?: string,
  msg?: string,
): Promise<void> {
  let doesThrow = false;
  let error: Error | undefined = undefined;
  try {
    const result = fn();
    // Handle async functions
    if (result instanceof Promise) {
      await result;
    }
  } catch (e) {
    if (e instanceof Error) {
      doesThrow = true;
      error = e;
    }
  }
  if (!doesThrow) {
    throw new AssertionError(msg || 'Expected function to throw');
  }
  if (ErrorClass && !(error instanceof ErrorClass)) {
    throw new AssertionError(
      msg || `Expected error to be instance of ${ErrorClass.name}, got ${error?.constructor.name}`,
    );
  }
  if (msgIncludes && error && !error.message.includes(msgIncludes)) {
    throw new AssertionError(
      msg || `Expected error message to include "${msgIncludes}", got "${error.message}"`,
    );
  }
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}
