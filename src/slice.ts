// A minimal Go-like slice implementation for JS/TS.
// Supports backing by plain Array<T> or by TypedArray constructors (Uint8Array, etc.).

type TypedArray =
	| Uint8Array
	| Int8Array
	| Uint16Array
	| Int16Array
	| Uint32Array
	| Int32Array
	| Float32Array
	| Float64Array;
type TypedArrayConstructor = { new (length: number): TypedArray; BYTES_PER_ELEMENT?: number };

export class Slice<T> implements Iterable<T> {
	#backing: any; // Array<T> or TypedArray
	#ctor?: TypedArrayConstructor; // present for typed arrays
	#start: number;
	public len: number;
	public cap: number;

	constructor(
		backing: any,
		start: number,
		len: number,
		cap: number,
		ctor?: TypedArrayConstructor,
	) {
		this.#backing = backing;
		this.#start = start;
		this.len = len;
		this.cap = cap;
		this.#ctor = ctor;
	}

	// index access
	get(i: number): T {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		return this.#backing[this.#start + i];
	}

	set(i: number, v: T): void {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		this.#backing[this.#start + i] = v;
	}

	// append elements, grow backing if needed (doubling strategy)
	append(...items: T[]): void {
		const need = this.len + items.length;
		if (need > this.cap) {
			// determine new cap
			let newCap = Math.max(need, Math.max(1, this.cap) * 2);
			if (this.#ctor) {
				// typed array: allocate new typed array
				const newBacking = new (this.#ctor as any)(newCap);
				// copy existing
				for (let i = 0; i < this.len; i++) newBacking[i] = this.#backing[this.#start + i];
				this.#backing = newBacking;
				this.#start = 0;
				this.cap = newCap;
			} else {
				const newBacking: T[] = new Array<T>(newCap);
				for (let i = 0; i < this.len; i++) newBacking[i] = this.#backing[this.#start + i];
				this.#backing = newBacking;
				this.#start = 0;
				this.cap = newCap;
			}
		} else if (this.#start + this.len + items.length > this.#backing.length) {
			// rare case for plain arrays where backing length smaller than needed
			this.#backing.length = this.#start + this.cap;
		}

		// set items
		for (let i = 0; i < items.length; i++) {
			this.#backing[this.#start + this.len + i] = items[i];
		}
		this.len += items.length;
	}

	// slice returns a new GoSlice that shares the same backing (like Go)
	slice(a = 0, b?: number): Slice<T> {
		if (a < 0) throw new RangeError("slice start out of range");
		const bb = b === undefined ? this.len : b;
		if (bb < a || bb > this.len) throw new RangeError("slice end out of range");
		const newStart = this.#start + a;
		const newLen = bb - a;
		const newCap = this.cap - a;
		return new Slice<T>(this.#backing, newStart, newLen, newCap, this.#ctor);
	}

	// convert to a standard JS array or typed-array view of the current length
	toArray(): T[] | TypedArray {
		if (this.#ctor) {
			// typed array: return subarray view
			return (this.#backing as TypedArray).subarray(this.#start, this.#start + this.len);
		}
		return this.#backing.slice(this.#start, this.#start + this.len);
	}

	[Symbol.iterator](): Iterator<T> {
		let i = 0;
		const self = this;
		return {
			next(): IteratorResult<T> {
				if (i < self.len) {
					const v = self.#backing[self.#start + i];
					i++;
					return { done: false, value: v };
				}
				return { done: true, value: undefined as any };
			},
		};
	}
}

// make function: emulate Go's make for slices and for typed arrays when a constructor is provided.
// Usage patterns implemented:
// - make(Array, len, cap?) -> GoSlice<T>
// - make(Uint8Array, len, cap?) -> GoSlice<number> backed by Uint8Array
// - make(Map, initialCapacity?) -> Map
// Notes: Channels are not implemented here.
export function make<T>(ctor: any, length: number, capacity?: number): Slice<T> | Map<any, any> {
	if (ctor === Map) {
		// initialCapacity is ignored for JS Map
		return new Map();
	}

	const cap = capacity === undefined ? length : capacity;
	// TypedArray constructors: create typed backing
	if (
		typeof ctor === "function" &&
		(ctor.prototype instanceof Uint8Array ||
			ctor === Uint8Array ||
			ctor === Int8Array ||
			ctor === Uint16Array ||
			ctor === Int16Array ||
			ctor === Uint32Array ||
			ctor === Int32Array ||
			ctor === Float32Array ||
			ctor === Float64Array)
	) {
		const backing = new (ctor as TypedArrayConstructor)(cap);
		// zero-initialized; len may be smaller than cap
		return new Slice<T>(backing, 0, length, cap, ctor as TypedArrayConstructor);
	}

	// default: plain JS array backing
	const backing = new Array<T>(cap);
	return new Slice<T>(backing, 0, length, cap);
}

// Convenience types and helpers for byte slices (Go's []byte)
export type Byte = number;

/**
 * Uint8Slice is a convenience subclass of Slice<number> backed by a Uint8Array.
 * Use `makeUint8(len, cap?)` to construct one.
 */
export class Uint8Slice extends Slice<number> {
	constructor(length: number, capacity?: number) {
		const cap = capacity === undefined ? length : capacity;
		const backing = new Uint8Array(cap);
		super(backing, 0, length, cap, Uint8Array);
	}

	// Narrow the return type to Uint8Array for convenience.
	override toArray(): Uint8Array {
		return super.toArray() as Uint8Array;
	}
}

export type ByteSlice = Uint8Slice;

export function makeUint8(length: number, capacity?: number): Uint8Slice {
	return new Uint8Slice(length, capacity);
}
