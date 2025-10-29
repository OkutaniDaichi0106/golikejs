import { assert, assertEquals, assertThrows } from "@std/assert";
import { append, make, Slice } from "./slice.ts";

Deno.test("Slice - make & constructor inference (multiple scenarios)", async (t) => {
	const cases = new Map([
		[
			"make Map",
			{
				ctor: Map,
				length: 0,
				cap: undefined,
				expectCtor: undefined,
				expectIsMap: true,
			},
		],
		[
			"make Uint8Array",
			{ ctor: Uint8Array, length: 2, cap: 4, expectCtor: Uint8Array, expectIsMap: false },
		],
		["make Array", {
			ctor: Array,
			length: 3,
			cap: 5,
			expectCtor: undefined,
			expectIsMap: false,
		}],
	]);

	for (const [name, c] of cases) {
		await t.step(name, () => {
			const v = make<number>(c.ctor as any, c.length, c.cap) as any;
			if (c.expectIsMap) {
				// make(Map) should return a Map
				assertEquals(v instanceof Map, true);
			} else {
				// slice cases
				assertEquals(v.ctor, c.expectCtor);
				assertEquals(v.len, c.length);
				assertEquals(v.cap, c.cap === undefined ? c.length : c.cap);
			}
		});
	}
});

Deno.test("Slice - append growth and sharing semantics", async (t) => {
	await t.step("append to array backing when need > cap triggers reallocation and growth", () => {
		const s = make<number>(Array, 2, 2) as Slice<number>;
		s.set(0, 1);
		s.set(1, 2);
		// need = 3, cap = 2 -> newCap = max(3, max(1,2)*2) = max(3,4) = 4
		const s2 = append(s, 3);
		assertEquals(s2.cap, 4);
		assertEquals(s2.len, 3);
		assertEquals(s2.get(0), 1);
		assertEquals(s2.get(1), 2);
		assertEquals(s2.get(2), 3);
	});

	await t.step(
		"append to array backing when capacity suffices shares backing and updates in-place",
		() => {
			const s = make<number>(Array, 2, 4) as Slice<number>;
			s.set(0, 10);
			s.set(1, 20);
			const origBacking = s.backing;
			const s2 = append(s, 30);
			// Should share backing (no reallocation)
			assertEquals(s2.backing === origBacking, true);
			assertEquals(s2.len, 3);
			assertEquals(s2.get(2), 30);
			// parent backing sees the change
			assertEquals(s.backing[s.start + 2], 30);
		},
	);

	await t.step(
		"append with typed array backing preserves typed ctor and values; reallocates typed array when needed",
		() => {
			const s = make<number>(Uint8Array, 1, 1) as Slice<number>;
			s.set(0, 7);
			const s2 = append(s, 8);
			assertEquals(s2.ctor, Uint8Array);
			const out = s2.toArray() as Uint8Array;
			assertEquals(Array.from(out), [7, 8]);
		},
	);
});

Deno.test("Slice - slice view sharing and iterator", async (t) => {
	await t.step(
		"slice returns a view and shares backing; modifying append on subslice affects parent when capacity allows",
		() => {
			const s = make<number>(Array, 4, 8) as Slice<number>;
			for (let i = 0; i < 4; i++) s.set(i, i + 1); // 1,2,3,4
			const sub = s.slice(1, 3); // values 2,3
			const sub2 = append(sub, 9); // capacity of sub is 7 so should share backing
			assertEquals(sub2.get(0), 2);
			assertEquals(sub2.get(1), 3);
			assertEquals(sub2.get(2), 9);
			// parent s should see the appended value at the appropriate index
			assertEquals(s.get(3), 9);
		},
	);

	await t.step("iterator yields expected sequence", () => {
		const s = make<number>(Array, 3, 3) as Slice<number>;
		s.set(0, 5);
		s.set(1, 6);
		s.set(2, 7);
		const got: number[] = [];
		for (const v of s) got.push(v);
		assertEquals(got, [5, 6, 7]);
	});
});

Deno.test("Slice - toArray copy vs view semantics for Array vs TypedArray", async (t) => {
	await t.step("toArray on Array returns a copy", () => {
		const s = make<number>(Array, 2, 4) as Slice<number>;
		s.set(0, 1);
		s.set(1, 2);
		const arr = s.toArray() as number[];
		arr[0] = 99;
		// original slice should be unchanged
		assertEquals(s.get(0), 1);
	});

	await t.step(
		"toArray on TypedArray returns a subarray view (mutating it affects backing)",
		() => {
			const s = make<number>(Uint8Array, 2, 4) as Slice<number>;
			s.set(0, 4);
			s.set(1, 5);
			const ta = s.toArray() as Uint8Array;
			ta[0] = 77;
			assertEquals(s.get(0), 77);
		},
	);
});

Deno.test("Slice - bounds and error cases (table-driven)", async (t) => {
	const cases = new Map([
		["get negative index", { fn: (s: Slice<any>) => () => s.get(-1) }],
		["get out of range", { fn: (s: Slice<any>) => () => s.get(s.len) }],
		["set out of range", { fn: (s: Slice<any>) => () => s.set(s.len, 1) }],
		["slice negative start", { fn: (s: Slice<any>) => () => s.slice(-1, 1) }],
		["slice end > len", { fn: (s: Slice<any>) => () => s.slice(0, s.len + 1) }],
	]);

	for (const [name, c] of cases) {
		await t.step(name, () => {
			const s = make<number>(Array, 2, 4) as Slice<number>;
			assertThrows(c.fn(s));
		});
	}
});

Deno.test("Slice - append edge cases and panic coverage", async (t) => {
	await t.step("append with zero items returns same slice descriptor (shares backing)", () => {
		const s = make<number>(Array, 2, 4) as Slice<number>;
		s.set(0, 1);
		s.set(1, 2);
		const s2 = append(s); // no items
		assertEquals(s2.len, s.len);
		assertEquals(s2.backing === s.backing, true);
	});

	await t.step("append many items triggers multiple growth steps and preserves values", () => {
		const s = make<number>(Array, 1, 1) as Slice<number>;
		s.set(0, 100);
		// append 10 items to force repeated growth
		const items = Array.from({ length: 10 }, (_, i) => i + 1);
		const s2 = append(s, ...items);
		// ensure first value preserved and appended values present
		assertEquals(s2.get(0), 100);
		for (let i = 0; i < items.length; i++) {
			assertEquals(s2.get(1 + i), items[i]);
		}
	});

	await t.step(
		"append on subslice with insufficient cap causes reallocation (parent not modified)",
		() => {
			const parent = make<number>(Array, 3, 6) as Slice<number>;
			for (let i = 0; i < 3; i++) parent.set(i, i + 1); // 1,2,3
			const sub = parent.slice(1); // len=2, cap=5
			// Force reallocation by appending many items
			const many = Array.from({ length: 10 }, (_, i) => i + 10);
			const sub2 = append(sub, ...many);
			// parent should not see appended values at its indices beyond original
			assertThrows(() => parent.get(3));
			// sub2 should contain appended values
			for (let i = 0; i < many.length; i++) {
				assertEquals(sub2.get(sub.len + i), many[i]);
			}
		},
	);
});
