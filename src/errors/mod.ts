/**
 * AsableError interface for errors that implement custom As behavior.
 * Similar to Go's interface{ As(any) bool }.
 */
export interface AsableError extends Error {
	as(target: any): boolean;
}

/**
 * IsableError interface for errors that implement custom Is behavior.
 * Similar to Go's interface{ Is(error) bool }.
 */
export interface IsableError extends Error {
	is(target: Error): boolean;
}

/**
 * Target type for as() function, similar to Go's pointer parameter.
 * Use createTarget() to create a target object.
 */
export interface AsTarget<T extends Error> {
	type: new (...args: any[]) => T;
	value?: T;
}

/**
 * Creates a target object for use with as() function.
 * This is the TypeScript equivalent of Go's &target pattern.
 * 
 * @example
 * const target = createTarget(CustomError);
 * if (as(err, target)) {
 *     console.log(target.value.message);
 * }
 */
export function createTarget<T extends Error>(type: new (...args: any[]) => T): AsTarget<T> {
	return { type, value: undefined };
}

/**
 * As checks if any error in err's chain matches the target type, and if so,
 * assigns it to target.value and returns true. Otherwise, returns false.
 * This is a TypeScript adaptation of Go's errors.As.
 * 
 * If an error in the chain implements the `as(target: any): boolean` method,
 * that method is called to allow custom matching behavior.
 * 
 * @example
 * // Go: var pathError *PathError; errors.As(err, &pathError)
 * // TypeScript:
 * const target = createTarget(PathError);
 * if (as(err, target)) {
 *     console.log(target.value.path);
 * }
 */
export function as<T extends Error>(err: Error | null | undefined, target: AsTarget<T>): err is T {
	if (!err) {
		return false;
	}
	target.value = undefined;

	let current: Error | null | undefined = err;
	while (current) {
		// 1. Check if the error has an `as` method and use it
		if (typeof (current as AsableError).as === 'function') {
			if ((current as AsableError).as(target)) {
				return true;
			}
		}

		// 2. Check if directly assignable to target type
		if (current instanceof target.type) {
			target.value = current as T;
			return true;
		}

		// 3. Unwrap and continue
		current = (current as any).cause;
	}

	return false;
}

/**
 * Is checks if any error in err's chain matches target, and if so, returns true.
 * Otherwise, returns false. This is a TypeScript adaptation of Go's errors.Is.
 * 
 * If an error in the chain implements the `is(target: Error): boolean` method,
 * that method is called to allow custom matching behavior.
 */
export function is(err: Error | null | undefined, target: Error): boolean {
	if (!err || !target) {
		return err === target;
	}

	let current: Error | null | undefined = err;
	while (current) {
		// 1. Check if the error has an `is` method and use it
		if (typeof (current as IsableError).is === 'function') {
			if ((current as IsableError).is(target)) {
				return true;
			}
		}

		// 2. Check for direct equality
		if (current === target) {
			return true;
		}

		// 3. Unwrap and continue
		current = (current as any).cause;
	}

	return false;
}

/**
 * New creates a new error with the given text.
 * This is a TypeScript adaptation of Go's errors.New.
 */
export function newError(text: string): Error {
	return new Error(text);
}

/**
 * Wrap wraps err with the given message.
 * This is a TypeScript adaptation of Go's errors.Wrap (though deprecated in Go 1.13).
 */
export function wrap(err: Error | null | undefined, message: string): Error | null {
	if (!err) return null;
	const wrapped = new Error(message);
	(wrapped as any).cause = err;
	return wrapped;
}

/**
 * Unwrap returns the result of calling the Unwrap method on err, if err's type contains an Unwrap method
 * returning error. Otherwise, Unwrap returns nil.
 * This is a TypeScript adaptation of Go's errors.Unwrap.
 */
export function unwrap(err: Error | null | undefined): Error | null | undefined {
	if (!err) return err;
	return (err as any).cause;
}
