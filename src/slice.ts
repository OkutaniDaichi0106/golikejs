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
	backing: any; // Array<T> or TypedArray
	ctor?: TypedArrayConstructor; // present for typed arrays
	start: number;
	len: number;
	cap: number;

	constructor(backing: any, start: number, len: number, cap: number) {
		this.backing = backing;
		this.start = start;
		this.len = len;
		this.cap = cap;
		// infer typed array constructor from backing if it's a typed array view
		// ArrayBuffer.isView returns true for typed arrays and DataView; exclude DataView
		if (ArrayBuffer.isView(backing) && !(backing instanceof DataView)) {
			// the constructor property of the typed array is the constructor function
			this.ctor = backing.constructor as TypedArrayConstructor;
		} else {
			this.ctor = undefined;
		}
	}

	// index access
	get(i: number): T {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		return this.backing[this.start + i];
	}

	set(i: number, v: T): void {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		this.backing[this.start + i] = v;
	}

	// slice returns a new Slice that shares the same backing (like Go)
	slice(a = 0, b?: number): Slice<T> {
		if (a < 0) throw new RangeError("slice start out of range");
		const bb = b === undefined ? this.len : b;
		if (bb < a || bb > this.len) throw new RangeError("slice end out of range");
		const newStart = this.start + a;
		const newLen = bb - a;
		const newCap = this.cap - a;
		return new Slice<T>(this.backing, newStart, newLen, newCap);
	}

	// convert to a standard JS array or typed-array view of the current length
	toArray(): T[] | TypedArray {
		if (this.ctor) {
			// typed array: return subarray view
			return (this.backing as TypedArray).subarray(this.start, this.start + this.len);
		}
		return this.backing.slice(this.start, this.start + this.len);
	}

	[Symbol.iterator](): Iterator<T> {
		let i = 0;
		return {
			next: (): IteratorResult<T> => {
				if (i < this.len) {
					const v = this.backing[this.start + i];
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
// - make(Array, len, cap?) -> Slice<T>
// - make(Uint8Array, len, cap?) -> Slice<number> backed by Uint8Array
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
		return new Slice<T>(backing, 0, length, cap);
	}

	// default: plain JS array backing
	const backing = new Array<T>(cap);
	return new Slice<T>(backing, 0, length, cap);
}

// append function: emulate Go's append(slice, ...elements)
export function append<T>(s: Slice<T>, ...items: T[]): Slice<T> {
	const need = s.len + items.length;
	if (need > s.cap) {
		// determine new cap
		const newCap = Math.max(need, Math.max(1, s.cap) * 2);
		let newBacking: any;
		const newStart = 0;
		if (s.ctor) {
			// typed array: allocate new typed array
			newBacking = new (s.ctor as any)(newCap);
			// copy existing
			for (let i = 0; i < s.len; i++) newBacking[i] = s.backing[s.start + i];
		} else {
			newBacking = new Array<T>(newCap);
			for (let i = 0; i < s.len; i++) newBacking[i] = s.backing[s.start + i];
		}
		// set items
		for (let i = 0; i < items.length; i++) {
			newBacking[s.len + i] = items[i];
		}
		return new Slice<T>(newBacking, newStart, need, newCap);
	} else {
		// can append in place, but since we return new slice, need to copy
		// actually, to emulate Go, if cap allows, we can share backing but adjust len
		// but since Slice is immutable in a way, better to create new with same backing
		// Go's append returns a new slice descriptor
		const newBacking = s.backing;
		const newStart = s.start;
		if (s.start + need > s.backing.length) {
			// rare case, extend backing
			if (!s.ctor) {
				s.backing.length = s.start + s.cap;
			}
		}
		// set items
		for (let i = 0; i < items.length; i++) {
			newBacking[s.start + s.len + i] = items[i];
		}
		return new Slice<T>(newBacking, newStart, need, s.cap);
	}
}
