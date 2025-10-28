import { assert, assertEquals } from "@std/assert";
import * as bytes from "./mod.ts";

Deno.test("bytes.repeat", async (t) => {
	const tests = {
		"basic repeat": { b: "abc", count: 3, want: "abcabcabc" },
		"zero count": { b: "abc", count: 0, want: "" },
		"count 1": { b: "abc", count: 1, want: "abc" },
		"empty b": { b: "", count: 3, want: "" },
		"unicode": { b: "α", count: 2, want: "αα" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const b = new TextEncoder().encode(tt.b);
			const result = bytes.repeat(b, tt.count);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}

	await t.step("negative count throws", () => {
		const b = new TextEncoder().encode("abc");
		try {
			bytes.repeat(b, -1);
			throw new Error("expected error");
		} catch (e) {
			assert(e instanceof Error);
			assert(e.message.includes("negative Repeat count"));
		}
	});
});

Deno.test("bytes.toLower", async (t) => {
	const tests = {
		"basic": { s: "HELLO", want: "hello" },
		"empty": { s: "", want: "" },
		"mixed": { s: "HeLLo", want: "hello" },
		"unicode": { s: "ΑΒΓ", want: "αβγ" },
		"no change": { s: "hello", want: "hello" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const result = bytes.toLower(s);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.toUpper", async (t) => {
	const tests = {
		"basic": { s: "hello", want: "HELLO" },
		"empty": { s: "", want: "" },
		"mixed": { s: "HeLLo", want: "HELLO" },
		"unicode": { s: "αβγ", want: "ΑΒΓ" },
		"no change": { s: "HELLO", want: "HELLO" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const result = bytes.toUpper(s);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.replace", async (t) => {
	const tests = {
		"basic": { s: "hello world", old: "world", new_: "universe", n: -1, want: "hello universe" },
		"no replacement": { s: "hello world", old: "foo", new_: "bar", n: -1, want: "hello world" },
		"empty old": { s: "hello", old: "", new_: "x", n: 2, want: "xhxexlxlxox" },
		"empty new": { s: "hello", old: "l", new_: "", n: -1, want: "heo" },
		"n=0": { s: "aaa", old: "a", new_: "b", n: 0, want: "aaa" },
		"n=1": { s: "aaa", old: "a", new_: "b", n: 1, want: "baa" },
		"n=2": { s: "aaa", old: "a", new_: "b", n: 2, want: "bba" },
		"overlapping": { s: "aaa", old: "aa", new_: "b", n: -1, want: "ba" },
		"unicode": { s: "αβγ", old: "β", new_: "δ", n: -1, want: "αδγ" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const old = new TextEncoder().encode(tt.old);
			const new_ = new TextEncoder().encode(tt.new_);
			const result = bytes.replace(s, old, new_, tt.n);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.replaceAll", async (t) => {
	const tests = {
		"basic": { s: "foo foo foo", old: "foo", new_: "bar", want: "bar bar bar" },
		"no replacement": { s: "hello", old: "world", new_: "universe", want: "hello" },
		"empty old": { s: "abc", old: "", new_: "x", want: "xaxbxc" },
		"empty new": { s: "aaa", old: "a", new_: "", want: "" },
		"unicode": { s: "α α α", old: "α", new_: "β", want: "β β β" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const old = new TextEncoder().encode(tt.old);
			const new_ = new TextEncoder().encode(tt.new_);
			const result = bytes.replaceAll(s, old, new_);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.map", async (t) => {
	await t.step("uppercase mapping", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.map((r) => r >= 97 && r <= 122 ? r - 32 : r, s);
		const expected = new TextEncoder().encode("HELLO");
		assertEquals(result, expected);
	});

	await t.step("drop vowels", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.map((r) => "aeiou".includes(String.fromCharCode(r)) ? -1 : r, s);
		const expected = new TextEncoder().encode("hll");
		assertEquals(result, expected);
	});

	await t.step("empty", () => {
		const s = new Uint8Array(0);
		const result = bytes.map((r) => r + 1, s);
		assertEquals(result.length, 0);
	});
});

Deno.test("bytes.toTitle", async (t) => {
	const tests = {
		"basic": { s: "hello world", want: "HELLO WORLD" },
		"empty": { s: "", want: "" },
		"already title": { s: "HELLO", want: "HELLO" },
		"unicode": { s: "αβγ δέ", want: "ΑΒΓ ΔΈ" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const result = bytes.toTitle(s);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.toValidUTF8", async (t) => {
	await t.step("valid utf8", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.toValidUTF8(s, new TextEncoder().encode("?"));
		assertEquals(result, s);
	});

	await t.step("invalid utf8 replaced", () => {
		// Create invalid UTF-8
		const s = new Uint8Array([0x80, 0x81]); // Invalid UTF-8 bytes
		const replacement = new TextEncoder().encode("?");
		const result = bytes.toValidUTF8(s, replacement);
		// Should replace invalid sequences
		assert(result.length > 0);
	});

	await t.step("empty replacement", () => {
		const s = new Uint8Array([0x80]);
		const result = bytes.toValidUTF8(s, new Uint8Array(0));
		// Should use default replacement
		assert(result.length > 0);
	});
});