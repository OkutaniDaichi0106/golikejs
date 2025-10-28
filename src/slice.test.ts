import { describe, it, expect } from "vitest";
import { make, Slice } from "./slice";

describe("make for plain arrays", () => {
	it("creates a GoSlice with correct len and cap", () => {
		const s = make<number>(Array, 3, 5) as Slice<number>;
		expect(s.len).toBe(3);
		expect(s.cap).toBe(5);
		// set/get
		s.set(0, 10);
		s.set(1, 20);
		s.set(2, 30);
		expect(s.get(1)).toBe(20);
		// append grows
		s.append(40, 50, 60);
		expect(s.len).toBe(6);
		expect(Array.isArray(s.toArray())).toBe(true);
	});
});

describe("make for Uint8Array", () => {
	it("creates a typed GoSlice and supports toArray and append", () => {
		const s = make<number>(Uint8Array, 2, 4) as Slice<number>;
		expect(s.len).toBe(2);
		expect(s.cap).toBe(4);
		s.set(0, 1);
		s.set(1, 2);
		const arr = s.toArray() as Uint8Array;
		expect(arr.length).toBe(2);
		expect(arr[0]).toBe(1);
		// append should grow typed array backing
		s.append(3, 4, 5);
		expect(s.len).toBe(5);
		const arr2 = s.toArray() as Uint8Array;
		expect(arr2[4]).toBe(5);
	});
});
