import { assert, assertEquals } from "@std/assert";
import * as bytes from "./mod.ts";

Deno.test("bytes.compare", async (t) => {
	const tests = {
		"equal slices": { a: "hello", b: "hello", want: 0 },
		"a < b": { a: "abc", b: "abd", want: -1 },
		"a > b": { a: "abd", b: "abc", want: 1 },
		"different lengths a shorter": { a: "ab", b: "abc", want: -1 },
		"different lengths a longer": { a: "abc", b: "ab", want: 1 },
		"empty a": { a: "", b: "a", want: -1 },
		"empty b": { a: "a", b: "", want: 1 },
		"both empty": { a: "", b: "", want: 0 },
		"unicode": { a: "α", b: "β", want: -1 },
		"unicode equal": { a: "α", b: "α", want: 0 },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const a = new TextEncoder().encode(tt.a);
			const b = new TextEncoder().encode(tt.b);
			assertEquals(bytes.compare(a, b), tt.want);
		});
	}
});

Deno.test("bytes.contains", async (t) => {
	const tests = {
		"subslice present": { b: "hello world", subslice: "world", want: true },
		"subslice not present": { b: "hello world", subslice: "foo", want: false },
		"empty subslice": { b: "hello", subslice: "", want: true },
		"empty b": { b: "", subslice: "a", want: false },
		"empty b empty subslice": { b: "", subslice: "", want: true },
		"subslice longer than b": { b: "hi", subslice: "hello", want: false },
		"multiple occurrences": { b: "abab", subslice: "ab", want: true },
		"unicode": { b: "αβγ", subslice: "β", want: true },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const b = new TextEncoder().encode(tt.b);
			const subslice = new TextEncoder().encode(tt.subslice);
			assertEquals(bytes.contains(b, subslice), tt.want);
		});
	}
});

Deno.test("bytes.index", async (t) => {
	const tests = {
		"subslice present": { b: "hello world", subslice: "world", want: 6 },
		"subslice not present": { b: "hello world", subslice: "foo", want: -1 },
		"empty subslice": { b: "hello", subslice: "", want: 0 },
		"empty b": { b: "", subslice: "a", want: -1 },
		"empty b empty subslice": { b: "", subslice: "", want: 0 },
		"subslice longer than b": { b: "hi", subslice: "hello", want: -1 },
		"multiple occurrences": { b: "abab", subslice: "ab", want: 0 },
		"unicode": { b: "αβγ", subslice: "β", want: 2 },
		"subslice at end": { b: "hello", subslice: "lo", want: 3 },
		"subslice at start": { b: "hello", subslice: "he", want: 0 },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const b = new TextEncoder().encode(tt.b);
			const subslice = new TextEncoder().encode(tt.subslice);
			assertEquals(bytes.index(b, subslice), tt.want);
		});
	}
});
