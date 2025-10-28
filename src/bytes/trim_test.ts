import { assert, assertEquals } from "@std/assert";
import * as bytes from "./mod.ts";

Deno.test("bytes.trimSpace", async (t) => {
	const tests = {
		"basic trim": { s: "  hello world  ", want: "hello world" },
		"no spaces": { s: "hello", want: "hello" },
		"all spaces": { s: "   ", want: "" },
		"empty": { s: "", want: "" },
		"only leading": { s: "  hello", want: "hello" },
		"only trailing": { s: "hello  ", want: "hello" },
		"unicode spaces": { s: "\t α \n", want: "α" },
		"mixed whitespace": { s: " \t\n hello \t\n ", want: "hello" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const result = bytes.trimSpace(s);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.trim", async (t) => {
	const tests = {
		"basic trim": { s: "aahelloaa", cutset: "a", want: "hello" },
		"no trim": { s: "hello", cutset: "a", want: "hello" },
		"all trimmed": { s: "aaa", cutset: "a", want: "" },
		"empty cutset": { s: "hello", cutset: "", want: "hello" },
		"multiple chars": { s: "abchelloabc", cutset: "abc", want: "hello" },
		"unicode": { s: "ααhelloαα", cutset: "α", want: "hello" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const cutset = new TextEncoder().encode(tt.cutset);
			const result = bytes.trim(s, cutset);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.trimLeft", async (t) => {
	const tests = {
		"basic": { s: "aahello", cutset: "a", want: "hello" },
		"no trim": { s: "hello", cutset: "a", want: "hello" },
		"all trimmed": { s: "aaa", cutset: "a", want: "" },
		"partial": { s: "aaabbb", cutset: "a", want: "bbb" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const cutset = new TextEncoder().encode(tt.cutset);
			const result = bytes.trimLeft(s, cutset);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.trimRight", async (t) => {
	const tests = {
		"basic": { s: "helloaa", cutset: "a", want: "hello" },
		"no trim": { s: "hello", cutset: "a", want: "hello" },
		"all trimmed": { s: "aaa", cutset: "a", want: "" },
		"partial": { s: "bbbaaa", cutset: "a", want: "bbb" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const cutset = new TextEncoder().encode(tt.cutset);
			const result = bytes.trimRight(s, cutset);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.trimFunc", async (t) => {
	await t.step("trim vowels", () => {
		const s = new TextEncoder().encode("aeihelloaei");
		const result = bytes.trimFunc(s, (r) => "aei".includes(String.fromCharCode(r)));
		const expected = new TextEncoder().encode("hello");
		assertEquals(result, expected);
	});

	await t.step("trim digits", () => {
		const s = new TextEncoder().encode("123hello456");
		const result = bytes.trimFunc(s, (r) => r >= 48 && r <= 57);
		const expected = new TextEncoder().encode("hello");
		assertEquals(result, expected);
	});

	await t.step("no trim", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.trimFunc(s, (r) => r === 97); // 'a'
		assertEquals(result, s);
	});
});

Deno.test("bytes.trimLeftFunc", async (t) => {
	await t.step("trim leading vowels", () => {
		const s = new TextEncoder().encode("aeihello");
		const result = bytes.trimLeftFunc(s, (r) => "aei".includes(String.fromCharCode(r)));
		const expected = new TextEncoder().encode("hello");
		assertEquals(result, expected);
	});

	await t.step("no trim", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.trimLeftFunc(s, (r) => r === 97);
		assertEquals(result, s);
	});
});

Deno.test("bytes.trimRightFunc", async (t) => {
	await t.step("trim trailing vowels", () => {
		const s = new TextEncoder().encode("helloeai");
		const result = bytes.trimRightFunc(s, (r) => "aei".includes(String.fromCharCode(r)));
		const expected = new TextEncoder().encode("hello");
		assertEquals(result, expected);
	});

	await t.step("no trim", () => {
		const s = new TextEncoder().encode("hello");
		const result = bytes.trimRightFunc(s, (r) => r === 97);
		assertEquals(result, s);
	});
});

Deno.test("bytes.trimPrefix", async (t) => {
	const tests = {
		"found": { s: "prefixhello", prefix: "prefix", want: "hello" },
		"not found": { s: "hello", prefix: "pre", want: "hello" },
		"empty prefix": { s: "hello", prefix: "", want: "hello" },
		"exact match": { s: "hello", prefix: "hello", want: "" },
		"longer prefix": { s: "hi", prefix: "hello", want: "hi" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const prefix = new TextEncoder().encode(tt.prefix);
			const result = bytes.trimPrefix(s, prefix);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});

Deno.test("bytes.trimSuffix", async (t) => {
	const tests = {
		"found": { s: "hellosuffix", suffix: "suffix", want: "hello" },
		"not found": { s: "hello", suffix: "fix", want: "hello" },
		"empty suffix": { s: "hello", suffix: "", want: "hello" },
		"exact match": { s: "hello", suffix: "hello", want: "" },
		"longer suffix": { s: "hi", suffix: "hello", want: "hi" },
	};

	for (const [name, tt] of Object.entries(tests)) {
		await t.step(name, () => {
			const s = new TextEncoder().encode(tt.s);
			const suffix = new TextEncoder().encode(tt.suffix);
			const result = bytes.trimSuffix(s, suffix);
			const expected = new TextEncoder().encode(tt.want);
			assertEquals(result, expected);
		});
	}
});
