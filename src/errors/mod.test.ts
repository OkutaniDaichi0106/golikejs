import { assertEquals } from "@std/assert";
import { as, is, newError, wrap, unwrap, createTarget, AsableError, IsableError } from "./mod.ts";

class CustomError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CustomError';
	}
}

class AnotherError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AnotherError';
	}
}

// Error with custom `as` method
class AsableCustomError extends Error implements AsableError {
	code: number;
	
	constructor(message: string, code: number) {
		super(message);
		this.name = 'AsableCustomError';
		this.code = code;
	}
	
	as(target: any): boolean {
		if (target && typeof target === 'object' && 'value' in target) {
			target.value = this;
			return true;
		}
		return false;
	}
}

// Error with custom `is` method
class IsableCustomError extends Error implements IsableError {
	code: number;
	
	constructor(message: string, code: number) {
		super(message);
		this.name = 'IsableCustomError';
		this.code = code;
	}
	
	is(target: Error): boolean {
		// Match if the target has the same code
		if (target instanceof IsableCustomError) {
			return this.code === target.code;
		}
		return false;
	}
}

Deno.test("errors.as", async (t) => {
	await t.step("should return false for null/undefined error", () => {
		const target = createTarget(CustomError);
		assertEquals(as(null, target), false);
		assertEquals(as(undefined, target), false);
	});

	await t.step("should match direct error type", () => {
		const err = new CustomError('test');
		const target = createTarget(CustomError);

		assertEquals(as(err, target), true);
		assertEquals(target.value, err);
	});

	await t.step("should not match different error type", () => {
		const err = new CustomError('test');
		const target = createTarget(AnotherError);

		assertEquals(as(err, target), false);
		assertEquals(target.value, undefined);
	});

	await t.step("should match error in cause chain", () => {
		const rootErr = new CustomError('root');
		const wrappedErr = new AnotherError('wrapped');
		(wrappedErr as any).cause = rootErr;

		const target = createTarget(CustomError);
		assertEquals(as(wrappedErr, target), true);
		assertEquals(target.value, rootErr);
	});

	await t.step("should not match if not in chain", () => {
		const err1 = new CustomError('test1');
		const err2 = new AnotherError('test2');

		const target = createTarget(CustomError);
		assertEquals(as(err2, target), false);
	});

	await t.step("should use custom as method when implemented", () => {
		const err = new AsableCustomError('test', 42);
		const target = createTarget(AsableCustomError);

		assertEquals(as(err, target), true);
		assertEquals(target.value, err);
		assertEquals(target.value?.code, 42);
	});

	await t.step("should use custom as method in cause chain", () => {
		const rootErr = new AsableCustomError('root', 100);
		const wrappedErr = new AnotherError('wrapped');
		(wrappedErr as any).cause = rootErr;

		const target = createTarget(AsableCustomError);
		assertEquals(as(wrappedErr, target), true);
		assertEquals(target.value?.code, 100);
	});
});

Deno.test("errors.is", async (t) => {
	await t.step("should return true for identical errors", () => {
		const err = new CustomError('test');
		assertEquals(is(err, err), true);
	});

	await t.step("should return false for different errors", () => {
		const err1 = new CustomError('test1');
		const err2 = new CustomError('test2');
		assertEquals(is(err1, err2), false);
	});

	await t.step("should return true for error in cause chain", () => {
		const rootErr = new CustomError('root');
		const wrappedErr = new AnotherError('wrapped');
		(wrappedErr as any).cause = rootErr;

		assertEquals(is(wrappedErr, rootErr), true);
	});

	await t.step("should return false for null/undefined", () => {
		const err = new CustomError('test');
		assertEquals(is(null, err), false);
		assertEquals(is(err, null as any), false);
		assertEquals(is(null, null as any), true);
	});

	await t.step("should return false if not in chain", () => {
		const err1 = new CustomError('test1');
		const err2 = new AnotherError('test2');

		assertEquals(is(err1, err2), false);
	});

	await t.step("should use custom is method when implemented", () => {
		const err1 = new IsableCustomError('test1', 42);
		const err2 = new IsableCustomError('test2', 42);

		// Different instances but same code, custom is method returns true
		assertEquals(is(err1, err2), true);
	});

	await t.step("should return false when custom is method returns false", () => {
		const err1 = new IsableCustomError('test1', 42);
		const err2 = new IsableCustomError('test2', 99);

		// Different codes, custom is method returns false
		assertEquals(is(err1, err2), false);
	});

	await t.step("should use custom is method in cause chain", () => {
		const rootErr = new IsableCustomError('root', 42);
		const targetErr = new IsableCustomError('target', 42);
		const wrappedErr = new AnotherError('wrapped');
		(wrappedErr as any).cause = rootErr;

		assertEquals(is(wrappedErr, targetErr), true);
	});
});

Deno.test("errors.newError", async (t) => {
	await t.step("should create a new error with the given text", () => {
		const err = newError("test message");
		assertEquals(err.message, "test message");
		assertEquals(err instanceof Error, true);
	});
});

Deno.test("errors.wrap", async (t) => {
	await t.step("should return null if err is null", () => {
		const wrapped = wrap(null, "message");
		assertEquals(wrapped, null);
	});

	await t.step("should wrap error with message and set cause", () => {
		const original = new CustomError("original");
		const wrapped = wrap(original, "wrapped message");

		assertEquals(wrapped?.message, "wrapped message");
		assertEquals((wrapped as any).cause, original);
	});

	await t.step("should work with unwrap", () => {
		const original = new CustomError("original");
		const wrapped = wrap(original, "wrapped");

		assertEquals(unwrap(wrapped), original);
	});
});

Deno.test("errors.unwrap", async (t) => {
	await t.step("should return null/undefined if err is null/undefined", () => {
		assertEquals(unwrap(null), null);
		assertEquals(unwrap(undefined), undefined);
	});

	await t.step("should return the cause if it exists", () => {
		const original = new CustomError("original");
		const wrapped = new Error("wrapped");
		(wrapped as any).cause = original;

		assertEquals(unwrap(wrapped), original);
	});

	await t.step("should return undefined if no cause", () => {
		const err = new CustomError("no cause");
		assertEquals(unwrap(err), undefined);
	});
});
