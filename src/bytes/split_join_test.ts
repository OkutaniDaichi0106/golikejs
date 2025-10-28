import { assert, assertEquals } from "@std/assert";
import * as bytes from "./mod.ts";

Deno.test("bytes.join", async (t) => {
	const tests = {
		"basic join": { s: ["foo", "bar", "baz"], sep: ",", want: "foo,bar,baz" },
		"empty slice": { s: [], sep: ",", want: "" },
		"single element": { s: ["hello"], sep: ",", want: "hello" },
		"empty sep": { s: ["a", "b"], sep: "", want: "ab" },
		"unicode sep": { s: ["α", "β"], sep: " ", want: "α β" },
		"empty elements": { s: ["", "a", ""], sep: ",", want: ",a," },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = tt.s.map((str) => new TextEncoder().encode(str));
			const sep = new TextEncoder().encode(tt.sep);
			const result = bytes.join(s, sep);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.split", async (t) => {
	const tests = {
		"basic split": { s: "foo,bar,baz", sep: ",", n: -1, want: ["foo", "bar", "baz"] },
		"no separator": { s: "hello", sep: ",", n: -1, want: ["hello"] },
		"empty sep": { s: "hello", sep: "", n: -1, want: ["h", "e", "l", "l", "o"] },
		"n=0": { s: "a,b,c", sep: ",", n: 0, want: [] },
		"n=1": { s: "a,b,c", sep: ",", n: 1, want: ["a,b,c"] },
		"n=2": { s: "a,b,c", sep: ",", n: 2, want: ["a", "b,c"] },
		"trailing sep": { s: "a,b,", sep: ",", n: -1, want: ["a", "b", ""] },
		"leading sep": { s: ",a,b", sep: ",", n: -1, want: ["", "a", "b"] },
		"unicode": { s: "α,β,γ", sep: ",", n: -1, want: ["α", "β", "γ"] },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const sep = new TextEncoder().encode(tt.sep);
			const result = bytes.split(s, sep, tt.n);
			const expected = tt.want.map((str) => new TextEncoder().encode(str));
			assertEquals(result.length, expected.length);
			for (let i = 0; i < result.length; i++) {
				assertEquals(result[i], expected[i]);
			}
		});
	}
});

Deno.test("bytes.splitAfter", async (t) => {
	const tests = {
		"basic": { s: "a,b,c", sep: ",", n: -1, want: ["a,", "b,", "c"] },
		"no sep": { s: "abc", sep: ",", n: -1, want: ["abc"] },
		"empty sep": { s: "abc", sep: "", n: -1, want: ["a", "b", "c"] },
		"n=2": { s: "a,b,c", sep: ",", n: 2, want: ["a,", "b,c"] },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const sep = new TextEncoder().encode(tt.sep);
			const result = bytes.splitAfter(s, sep, tt.n);
			const expected = tt.want.map((str) => new TextEncoder().encode(str));
			assertEquals(result.length, expected.length);
			for (let i = 0; i < result.length; i++) {
				assertEquals(result[i], expected[i]);
			}
		});
	}
});

Deno.test("bytes.fields", async (t) => {
	const tests = {
		"basic": { s: "  foo   bar  baz  ", want: ["foo", "bar", "baz"] },
		"no spaces": { s: "foo", want: ["foo"] },
		"only spaces": { s: "   ", want: [] },
		"empty": { s: "", want: [] },
		"unicode spaces": { s: "α  β\tγ", want: ["α", "β", "γ"] },
		"mixed whitespace": { s: "a\tb\nc", want: ["a", "b", "c"] },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const result = bytes.fields(s);
			const expected = tt.want.map((str) => new TextEncoder().encode(str));
			assertEquals(result.length, expected.length);
			for (let i = 0; i < result.length; i++) {
				assertEquals(result[i], expected[i]);
			}
		});
	}
});

Deno.test("bytes.cut", async (t) => {
	const tests = {
		"found": {
			s: "hello world",
			sep: " ",
			wantBefore: "hello",
			wantAfter: "world",
			wantFound: true,
		},
		"not found": { s: "hello", sep: ",", wantBefore: "hello", wantAfter: "", wantFound: false },
		"empty sep": { s: "abc", sep: "", wantBefore: "", wantAfter: "abc", wantFound: true },
		"sep at start": {
			s: ",hello",
			sep: ",",
			wantBefore: "",
			wantAfter: "hello",
			wantFound: true,
		},
		"sep at end": {
			s: "hello,",
			sep: ",",
			wantBefore: "hello",
			wantAfter: "",
			wantFound: true,
		},
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const sep = new TextEncoder().encode(tt.sep);
			const [before, after, found] = bytes.cut(s, sep);
			const expectedBefore = new TextEncoder().encode(tt.wantBefore);
			const expectedAfter = new TextEncoder().encode(tt.wantAfter);
			assertEquals(before, expectedBefore);
			assertEquals(after, expectedAfter);
			assertEquals(found, tt.wantFound);
		});
	}
});

Deno.test("bytes.cutPrefix", async (t) => {
	const tests = {
		"found": { s: "prefixhello", prefix: "prefix", want: "hello", wantFound: true },
		"not found": { s: "hello", prefix: "pre", want: "hello", wantFound: false },
		"empty prefix": { s: "hello", prefix: "", want: "hello", wantFound: true },
		"exact match": { s: "hello", prefix: "hello", want: "", wantFound: true },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const prefix = new TextEncoder().encode(tt.prefix);
			const [result, found] = bytes.cutPrefix(s, prefix);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
			assertEquals(found, tt.wantFound);
		});
	}
});

Deno.test("bytes.cutSuffix", async (t) => {
	const tests = {
		"found": { s: "hellosuffix", suffix: "suffix", want: "hello", wantFound: true },
		"not found": { s: "hello", suffix: "fix", want: "hello", wantFound: false },
		"empty suffix": { s: "hello", suffix: "", want: "hello", wantFound: true },
		"exact match": { s: "hello", suffix: "hello", want: "", wantFound: true },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const suffix = new TextEncoder().encode(tt.suffix);
			const [result, found] = bytes.cutSuffix(s, suffix);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
			assertEquals(found, tt.wantFound);
		});
	}
});
