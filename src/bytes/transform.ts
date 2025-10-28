// map returns a copy of the byte slice s with all its characters modified according to the mapping function.
// If mapping returns a negative value, the character is dropped from the string with no replacement.
export function map(mapping: (r: number) => number, s: Uint8Array): Uint8Array {
	const str = new TextDecoder().decode(s);
	let result = '';
	for (const char of str) {
		const mapped = mapping(char.charCodeAt(0));
		if (mapped >= 0) {
			result += String.fromCharCode(mapped);
		}
	}
	return new TextEncoder().encode(result);
}

// repeat returns a new byte slice consisting of count copies of b.
export function repeat(b: Uint8Array, count: number): Uint8Array {
	if (count === 0) {
		return new Uint8Array(0);
	}
	if (count < 0) {
		throw new Error('bytes: negative Repeat count');
	}
	if (b.length === 0) {
		return new Uint8Array(0);
	}
	const result = new Uint8Array(b.length * count);
	for (let i = 0; i < count; i++) {
		result.set(b, i * b.length);
	}
	return result;
}

// replace returns a copy of the slice s with the first n non-overlapping instances of old replaced by new.
// If old is empty, it matches at the beginning of the slice and after each UTF-8 sequence, yielding up to k+1 replacements for a k-rune string.
// If n < 0, there is no limit on the number of replacements.
export function replace(s: Uint8Array, old: Uint8Array, new_: Uint8Array, n: number): Uint8Array {
	if (old.length === 0) {
		// Special case: replace at each rune boundary
		const str = new TextDecoder().decode(s);
		let result = '';
		let replacements = 0;
		for (let i = 0; i < str.length; i++) {
			if (n >= 0 && replacements >= n) {
				result += str.slice(i);
				break;
			}
			result += new TextDecoder().decode(new_);
			result += str[i];
			replacements++;
		}
		if (n < 0 || replacements < n) {
			result += new TextDecoder().decode(new_);
		}
		return new TextEncoder().encode(result);
	}

	const parts: Uint8Array[] = [];
	let pos = 0;
	let replacements = 0;
	while (true) {
		const idx = index(s.subarray(pos), old);
		if (idx < 0 || (n >= 0 && replacements >= n)) {
			parts.push(s.subarray(pos));
			break;
		}
		parts.push(s.subarray(pos, pos + idx));
		parts.push(new_);
		pos += idx + old.length;
		replacements++;
	}
	return concat(...parts);
}

// replaceAll returns a copy of the slice s with all non-overlapping instances of old replaced by new.
// If old is empty, it matches at the beginning of the slice and after each UTF-8 sequence, yielding up to k+1 replacements for a k-rune string.
export function replaceAll(s: Uint8Array, old: Uint8Array, new_: Uint8Array): Uint8Array {
	return replace(s, old, new_, -1);
}

// runWhile returns a subslice of s, starting at index i and extending as long as r(i) returns true for each element.
// It panics if i is out of bounds.
export function runWhile(s: Uint8Array, i: number, r: (b: number) => boolean): Uint8Array {
	if (i < 0 || i > s.length) {
		throw new Error('bytes: index out of bounds');
	}
	let end = i;
	while (end < s.length && r(s[end]!)) {
		end++;
	}
	return s.subarray(i, end);
}

// toLower returns a copy of the byte slice s with all Unicode letters mapped to their lower case.
export function toLower(s: Uint8Array): Uint8Array {
	const str = new TextDecoder().decode(s);
	return new TextEncoder().encode(str.toLowerCase());
}

// toTitle returns a copy of the byte slice s with all Unicode letters mapped to their title case.
export function toTitle(s: Uint8Array): Uint8Array {
	const str = new TextDecoder().decode(s);
	return new TextEncoder().encode(str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()));
}

// toUpper returns a copy of the byte slice s with all Unicode letters mapped to their upper case.
export function toUpper(s: Uint8Array): Uint8Array {
	const str = new TextDecoder().decode(s);
	return new TextEncoder().encode(str.toUpperCase());
}

// toValidUTF8 returns a copy of the byte slice s with each run of invalid UTF-8 byte sequences replaced by the replacement slice r.
// If r is nil or empty, invalid UTF-8 byte sequences are replaced by U+FFFD.
export function toValidUTF8(s: Uint8Array, r: Uint8Array): Uint8Array {
	const decoder = new TextDecoder('utf-8', { fatal: false });
	const str = decoder.decode(s);
	const replacement = r.length > 0 ? new TextDecoder().decode(r) : '\uFFFD';
	const result = str.replace(/�/g, replacement);
	return new TextEncoder().encode(result);
}

// Helper function to concatenate Uint8Arrays
function concat(...arrays: Uint8Array[]): Uint8Array {
	const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}

// Helper function index (assuming it's defined elsewhere, but for completeness)
function index(s: Uint8Array, sep: Uint8Array): number {
	if (sep.length === 0) {
		return 0;
	}
	if (sep.length > s.length) {
		return -1;
	}
	for (let i = 0; i <= s.length - sep.length; i++) {
		let match = true;
		for (let j = 0; j < sep.length; j++) {
			if (s[i + j] !== sep[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
	}
	return -1;
}