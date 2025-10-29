import { assert, assertEquals } from "@std/assert";
import * as bytes from "./mod.ts";
import { EOFError } from "../io/error.ts";

Deno.test("Buffer - write/read/bytes/size/capacity/reset", async (t) => {
	await t.step("write and bytes reflect written data", async () => {
		const b = bytes.Buffer.make(4);
		const data = new TextEncoder().encode("hello");
		const [n, err] = await b.write(data);
		assertEquals(err, undefined);
		assertEquals(n, data.length);
		assertEquals(new TextDecoder().decode(b.bytes()), "hello");
		assertEquals(b.size, data.length);
		// capacity should be at least initial or grown
		assert(b.capacity >= 4);
	});

	await t.step("read returns data and then EOF", async () => {
		const b = bytes.Buffer.make(4);
		await b.write(new TextEncoder().encode("abc"));
		const buf = new Uint8Array(2);
		const [n1, e1] = await b.read(buf);
		assertEquals(n1, 2);
		assertEquals(new TextDecoder().decode(buf), "ab");
		// read remaining
		const buf2 = new Uint8Array(2);
		const [n2, e2] = await b.read(buf2);
		assertEquals(n2, 1);
		assertEquals(new TextDecoder().decode(buf2.subarray(0, 1)), "c");
		// now should get EOF
		const [n3, e3] = await b.read(new Uint8Array(1));
		assertEquals(n3, 0);
		assert(e3 instanceof EOFError);
	});

	await t.step("readByte / writeByte behavior and reset on drained", () => {
		const b = bytes.Buffer.make(2);
		b.writeByte(0x61); // 'a'
		b.writeByte(0x62); // 'b'
		const [v1, err1] = b.readByte();
		assertEquals(v1, 0x61);
		const [v2, err2] = b.readByte();
		assertEquals(v2, 0x62);
		// buffer should have been reset
		assertEquals(b.size, 0);
	});

	await t.step("reset clears data", async () => {
		const b = bytes.Buffer.make(4);
		await b.write(new TextEncoder().encode("xyz"));
		b.reset();
		assertEquals(b.size, 0);
		const [n, e] = await b.read(new Uint8Array(1));
		assertEquals(n, 0);
		assert(e instanceof EOFError);
	});
});

Deno.test("Buffer - grow (reallocate) and slide (copyWithin) behaviors", async (t) => {
	await t.step("grow by reallocating when required > capacity", async () => {
		const b = bytes.Buffer.make(4);
		await b.write(new TextEncoder().encode("abcd"));
		// consume two bytes
		const tmp = new Uint8Array(2);
		await b.read(tmp);
		// now write 4 bytes, forcing required = size(2) + 4 = 6 > cap(4)
		await b.write(new TextEncoder().encode("efgh"));
		// remaining from before was "cd" then appended "efgh"
		assertEquals(new TextDecoder().decode(b.bytes()), "cdefgh");
		assert(b.capacity >= 6);
	});

	await t.step("slide (copyWithin) when space and off > 0 and required <= capacity", async () => {
		const b = bytes.Buffer.make(10);
		await b.write(new TextEncoder().encode("abcdefghij")); // len=10
		// read 5 -> remaining "fghij"
		const tmp = new Uint8Array(5);
		await b.read(tmp);
		// write 3 more bytes; required = size(5) + 3 = 8 <= cap(10) -> should slide
		await b.write(new TextEncoder().encode("123"));
		assertEquals(new TextDecoder().decode(b.bytes()), "fghij123");
		assertEquals(b.size, 8);
	});
});

Deno.test("Buffer - helpers: toString, writeString, len/cap, next, truncate, unreadByte, readFrom/writeTo", async (t) => {
	await t.step("toString and writeString", async () => {
		const b = bytes.Buffer.make(4);
		const [n, err] = await b.writeString("こんにちは");
		assertEquals(err, undefined);
		assertEquals(n, new TextEncoder().encode("こんにちは").length);
		assertEquals(b.toString(), "こんにちは");
	});

	await t.step("len/cap helpers", () => {
		const b = bytes.Buffer.make(8);
		assertEquals(b.len(), 0);
		assertEquals(b.cap(), 8);
	});

	await t.step("next advances and returns slice", async () => {
		const b = bytes.Buffer.make(8);
		await b.write(new TextEncoder().encode("abcdef"));
		const n1 = b.next(2);
		assertEquals(new TextDecoder().decode(n1), "ab");
		assertEquals(b.len(), 4);
		const n2 = b.next(10);
		assertEquals(new TextDecoder().decode(n2), "cdef");
		assertEquals(b.len(), 0);
	});

	await t.step("truncate reduces length and bounds check", async () => {
		const b = bytes.Buffer.make(8);
		await b.write(new TextEncoder().encode("12345"));
		b.truncate(3);
		assertEquals(b.len(), 3);
		assertEquals(b.toString(), "123");
		// truncate out of range should throw
		let threw = false;
		try {
			b.truncate(10);
		} catch (e) {
			threw = true;
		}
		assertEquals(threw, true);
	});

	await t.step("unreadByte moves offset back when possible", async () => {
		const b = bytes.Buffer.make(4);
		b.writeByte(0x78); // x
		b.writeByte(0x79); // y
		const [v, e] = b.readByte();
		assertEquals(v, 0x78);
		const ue = b.unreadByte();
		assertEquals(ue, undefined);
		// read again should get the same byte
		const [v2, e2] = b.readByte();
		assertEquals(v2, 0x78);
	});

	await t.step("readRune / unreadRune / writeRune", async () => {
		const b = bytes.Buffer.make(16);
		// write ascii and multi-byte
		await b.writeString("A");
		await b.writeRune(0x4e2d); // '中'
		await b.writeRune(0x6587); // '文'

		// read rune A
		let [r1, s1, err1] = b.readRune();
		assertEquals(err1, undefined);
		assertEquals(r1, 0x41);
		assertEquals(s1, 1);

		// unread and read again
		const ue = b.unreadRune();
		assertEquals(ue, undefined);
		[r1, s1, err1] = b.readRune();
		assertEquals(r1, 0x41);

		// read Chinese chars
		const [r2, s2, err2] = b.readRune();
		assertEquals(err2, undefined);
		assertEquals(r2, 0x4e2d);
		const [r3, s3, err3] = b.readRune();
		assertEquals(err3, undefined);
		assertEquals(r3, 0x6587);
	});

	await t.step("readFrom reads until EOF and writeTo writes out", async () => {
		// fake reader that yields two chunks then EOF
		class FakeReader {
			chunks: Uint8Array[];
			idx = 0;
			constructor(chunks: Uint8Array[]) {
				this.chunks = chunks;
			}
			async read(p: Uint8Array): Promise<[number, Error | undefined]> {
				if (this.idx >= this.chunks.length) return [0, new EOFError()];
				const c = this.chunks[this.idx++]!;
				p.set(c.subarray(0, Math.min(p.length, c.length)));
				return [c.length, undefined];
			}
		}

		// fake writer that collects writes
		class FakeWriter {
			out: Uint8Array[] = [];
			async write(p: Uint8Array): Promise<[number, Error | undefined]> {
				this.out.push(p.slice());
				return [p.length, undefined];
			}
		}

		const r = new FakeReader([
			new TextEncoder().encode("hello "),
			new TextEncoder().encode("world"),
		]);
		const b = bytes.Buffer.make(4);
		const [readN, readErr] = await b.readFrom(r as any);
		assertEquals(readErr, undefined);
		assertEquals(readN, 11);
		assertEquals(b.toString(), "hello world");

		const w = new FakeWriter();
		const [writeN, writeErr] = await b.writeTo(w as any);
		assertEquals(writeErr, undefined);
		assertEquals(writeN, 11);
		// collected output joined should equal original
		const joined = new Uint8Array(w.out.reduce((a, c) => a + c.length, 0));
		let pos = 0;
		for (const chunk of w.out) {
			joined.set(chunk, pos);
			pos += chunk.length;
		}
		assertEquals(new TextDecoder().decode(joined), "hello world");
	});

	await t.step(
		"fast-path delegation: readFrom delegates to source.writeTo when present",
		async () => {
			let invoked = false;
			class FastReader {
				chunks: Uint8Array[];
				constructor(chunks: Uint8Array[]) {
					this.chunks = chunks;
				}
				// normal read is not used in fast-path but implement anyway
				async read(p: Uint8Array): Promise<[number, Error | undefined]> {
					if (this.chunks.length === 0) return [0, new EOFError()];
					const c = this.chunks.shift()!;
					p.set(c.subarray(0, Math.min(p.length, c.length)));
					return [c.length, undefined];
				}
				// fast-path writeTo: called by Buffer.readFrom
				async writeTo(w: any): Promise<[number, Error | undefined]> {
					invoked = true;
					let total = 0;
					for (const c of this.chunks) {
						const [n, err] = await w.write(c);
						total += n;
						if (err) return [total, err];
					}
					return [total, undefined];
				}
			}

			const r = new FastReader([
				new TextEncoder().encode("fast "),
				new TextEncoder().encode("path"),
			]);
			const b = bytes.Buffer.make(4);
			const [readN, readErr] = await b.readFrom(r as any);
			assertEquals(readErr, undefined);
			assertEquals(readN, 9);
			assert(invoked);
			assertEquals(b.toString(), "fast path");
		},
	);

	await t.step(
		"fast-path delegation: writeTo delegates to dest.readFrom when present",
		async () => {
			let invoked = false;
			class FastWriter {
				chunks: Uint8Array[] = [];
				async write(p: Uint8Array): Promise<[number, Error | undefined]> {
					this.chunks.push(p.slice());
					return [p.length, undefined];
				}
				async readFrom(r: any): Promise<[number, Error | undefined]> {
					invoked = true;
					let total = 0;
					const tmp = new Uint8Array(4);
					while (true) {
						const [n, err] = await r.read(tmp);
						if (n > 0) {
							this.chunks.push(tmp.subarray(0, n).slice());
							total += n;
						}
						if (err instanceof EOFError) return [total, undefined];
						if (err) return [total, err];
					}
				}
			}

			const b = bytes.Buffer.make(8);
			await b.writeString("delegate test");
			const w = new FastWriter();
			const [wn, we] = await b.writeTo(w as any);
			assertEquals(we, undefined);
			assertEquals(wn, 13);
			assert(invoked);
			// verify content
			const joined = new Uint8Array(w.chunks.reduce((a, c) => a + c.length, 0));
			let pos = 0;
			for (const chunk of w.chunks) {
				joined.set(chunk, pos);
				pos += chunk.length;
			}
			assertEquals(new TextDecoder().decode(joined), "delegate test");
		},
	);
});

Deno.test("Buffer - rune support: readRune/unreadRune/writeRune", async (t) => {
	await t.step("writeRune and readRune ASCII", async () => {
		const b = bytes.Buffer.make(8);
		const [wn, we] = await b.writeRune(0x41); // 'A'
		assertEquals(we, undefined);
		assertEquals(wn, 1);
		const [r, size, err] = b.readRune();
		assertEquals(err, undefined);
		assertEquals(r, 0x41);
		assertEquals(size, 1);
	});

	await t.step("writeRune and readRune multi-byte", async () => {
		const b = bytes.Buffer.make(16);
		// U+1F496 (💖) is 4 bytes
		const [wn, we] = await b.writeRune(0x1f496);
		assertEquals(we, undefined);
		const [r, size, err] = b.readRune();
		assertEquals(err, undefined);
		assertEquals(r, 0x1f496);
		assertEquals(size, 4);
	});

	await t.step("unreadRune works after readRune", async () => {
		const b = bytes.Buffer.make(16);
		await b.writeString("あ"); // 3-byte hiragana
		const [r1, s1, e1] = b.readRune();
		assertEquals(e1, undefined);
		assertEquals(s1, 3);
		const ue = b.unreadRune();
		assertEquals(ue, undefined);
		const [r2, s2, e2] = b.readRune();
		assertEquals(e2, undefined);
		assertEquals(r1, r2);
	});

	await t.step("unreadByte only allowed after readByte", async () => {
		const b = bytes.Buffer.make(8);
		await b.writeString("AB");
		const [n, err] = await b.read(new Uint8Array(2));
		assertEquals(n, 2);
		const ue = b.unreadByte();
		// unreadByte should fail because last read was read(), not readByte()
		assert(ue instanceof Error);
		// now writeByte and readByte and unreadByte should succeed
		b.reset();
		b.writeByte(0x41);
		const [vb, eb] = b.readByte();
		assertEquals(vb, 0x41);
		const ue2 = b.unreadByte();
		assertEquals(ue2, undefined);
	});
});

Deno.test("Buffer - readBytes/readString delim behavior", async (t) => {
	await t.step("readBytes returns through delim when present", async () => {
		const b = bytes.Buffer.make(16);
		await b.writeString("hello,world\nrest");
		const [part, err] = b.readBytes(0x0a); // '\n'
		assertEquals(err, undefined);
		assertEquals(new TextDecoder().decode(part), "hello,world\n");
		// next readString should return EOF and empty string "" since no delim (per API)
		const [s, e2] = b.readString(0x0a);
		assert(e2 instanceof EOFError);
		assertEquals(s, "");
	});

	await t.step("readBytes on empty returns EOF and undefined", async () => {
		const b = bytes.Buffer.make(4);
		const [part, err] = b.readBytes(0x2c); // ','
		assert(err instanceof EOFError);
		assertEquals(part, undefined);
	});

	await t.step("readBytes delim at start/end/multiple", async () => {
		const b = bytes.Buffer.make(32);
		await b.writeString(",start,middle,end,");
		const [p1, e1] = b.readBytes(0x2c); // first ',' at start
		assertEquals(new TextDecoder().decode(p1), ",");
		const [p2, e2] = b.readBytes(0x2c);
		assertEquals(new TextDecoder().decode(p2), "start,");
		// consume remaining two
		const [p3, e3] = b.readBytes(0x2c);
		assertEquals(new TextDecoder().decode(p3), "middle,");
		const [p4, e4] = b.readBytes(0x2c);
		assertEquals(new TextDecoder().decode(p4), "end,");
	});
});
