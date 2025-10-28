import { EOFError } from "../io/error.ts";
import { Reader } from "../io/reader.ts";
import { Writer } from "../io/writer.ts";

export const MinRead = 512;

export class TooLargeError extends Error {
	constructor(message = "bytes buffer: too large") {
		super(message);
		this.name = "TooLargeError";
	}
}

export class Buffer implements Reader, Writer {
	#buf: Uint8Array;
	#off: number; // read offset
	#len: number; // write offset

	constructor(memory: ArrayBufferLike) {
		this.#buf = new Uint8Array(memory);
		this.#off = 0;
		this.#len = 0; // Start with an empty buffer for writing
	}

	static make(capacity: number): Buffer {
		const buf = new Uint8Array(capacity);
		return new Buffer(buf.buffer);
	}

	bytes(): Uint8Array {
		return this.#buf.subarray(this.#off, this.#len);
	}

	get size(): number {
		return this.#len - this.#off;
	}

	get capacity(): number {
		return this.#buf.length;
	}

	reset() {
		this.#off = 0;
		this.#len = 0;
	}

	async read(buf: Uint8Array): Promise<[number, Error | undefined]> {
		const bytesAvailable = this.size;
		const bytesToRead = Math.min(buf.length, bytesAvailable);
		if (bytesToRead === 0) {
			return [0, new EOFError()];
		}
		buf.set(this.#buf.subarray(this.#off, this.#off + bytesToRead));
		this.#off += bytesToRead;
		if (this.#off === this.#len) {
			this.reset();
		}
		return [bytesToRead, undefined];
	}

	readByte(): [number, Error | undefined] {
		if (this.size < 1) {
			return [0, new Error("Not enough data to read a byte")];
		}
		const value = this.#buf[this.#off]!;
		this.#off += 1;
		if (this.#off === this.#len) {
			this.reset();
		}
		return [value, undefined];
	}

	async write(data: Uint8Array): Promise<[number, Error | undefined]> {
		this.grow(data.length);
		this.#buf.set(data, this.#len);
		this.#len += data.length;
		return [data.length, undefined];
	}

	writeByte(value: number): void {
		this.grow(1);
		this.#buf[this.#len] = value;
		this.#len += 1;
	}

	grow(n: number) {
		if (n < 0) {
			throw new Error("Cannot grow buffer by a negative size");
		}
		const required = this.size + n;
		if (required > this.capacity) {
			// Create a new buffer having an enough capacity
			const newBuf = new Uint8Array(Math.max(required, this.capacity * 2));
			// Copy the existing data to the new buffer from the head
			newBuf.set(this.bytes());
			this.#buf = newBuf;
		} else if (this.#off > 0) {
			// Slide the buffer to the head
			this.#buf.copyWithin(0, this.#off, this.#len);
		}

		// Adjust the offsets
		this.#len -= this.#off;
		this.#off = 0;
	}

	// reserve(n: number): Uint8Array {
	// 	this.grow(n);
	// 	const start = this.#len;
	// 	const end = start + n;
	// 	this.#len = end;
	// 	return this.#buf.subarray(start, end);
	// }
}
