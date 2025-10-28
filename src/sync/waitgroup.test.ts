import { WaitGroup } from './waitgroup.ts';
import { assert, assertEquals, assertThrows } from '@std/assert';

Deno.test('WaitGroup - should initialize with zero counter', () => {
	const wg = new WaitGroup();
	assertEquals(wg.counter, 0);
});

Deno.test('WaitGroup - should wait immediately when counter is zero', async () => {
	const wg = new WaitGroup();
	const start = Date.now();
	await wg.wait();
	const elapsed = Date.now() - start;

	// Should return immediately (within a few milliseconds)
	assert(elapsed < 50);
});

Deno.test('WaitGroup - should handle add and done correctly', async () => {
	const wg = new WaitGroup();
	wg.add(2);
	assertEquals(wg.counter, 2);

	wg.done();
	assertEquals(wg.counter, 1);

	wg.done();
	assertEquals(wg.counter, 0);
});

Deno.test('WaitGroup - should throw error on negative counter', () => {
	const wg = new WaitGroup();
	assertThrows(() => wg.add(-1), Error, 'WaitGroup: negative counter');
});

Deno.test('WaitGroup - should wait for all operations to complete', async () => {
	const wg = new WaitGroup();
	const results: number[] = [];
	wg.add(3);

	// Start three async operations
	const op1 = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		results.push(1);
		wg.done();
	};

	const op2 = async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
		results.push(2);
		wg.done();
	};

	const op3 = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		results.push(3);
		wg.done();
	};

	// Start operations
	op1();
	op2();
	op3();

	// Wait should block until all are done
	await wg.wait();

	assertEquals(results.length, 3);
	assertEquals(new Set(results), new Set([1, 2, 3]));
	assertEquals(wg.counter, 0);
});

Deno.test('WaitGroup - should handle multiple waiters', async () => {
	const wg = new WaitGroup();
	wg.add(1);

	const waiters: Promise<void>[] = [];
	const completions: number[] = [];

	// Create multiple waiters
	for (let i = 0; i < 3; i++) {
		waiters.push(
			(async (id: number) => {
				await wg.wait();
				completions.push(id);
			})(i),
		);
	}

	// Let waiters start
	await new Promise((resolve) => setTimeout(resolve, 10));

	// Complete the work
	wg.done();

	// All waiters should complete
	await Promise.all(waiters);

	assertEquals(completions.length, 3);
	assertEquals(new Set(completions), new Set([0, 1, 2]));
});

Deno.test('WaitGroup - should handle complex workflow', async () => {
	const wg = new WaitGroup();
	const results: string[] = [];

	// Simulate a complex workflow with multiple stages
	wg.add(2);

	// Stage 1: Two parallel operations
	const stage1Op1 = async () => {
		await new Promise((resolve) => setTimeout(resolve, 20));
		results.push('stage1-op1');
		wg.done();
	};

	const stage1Op2 = async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
		results.push('stage1-op2');
		wg.done();
	};

	stage1Op1();
	stage1Op2();

	// Wait for stage 1 to complete
	await wg.wait();

	// Stage 2: Single operation after stage 1
	wg.add(1);
	const stage2Op = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		results.push('stage2-op');
		wg.done();
	};

	stage2Op();
	await wg.wait();

	assert(results.includes('stage1-op1'));
	assert(results.includes('stage1-op2'));
	assert(results.includes('stage2-op'));
	assert(
		results.indexOf('stage2-op') > Math.max(
			results.indexOf('stage1-op1'),
			results.indexOf('stage1-op2'),
		),
	);
});

Deno.test('WaitGroup - should execute function with go method and manage counter automatically', async () => {
	const wg = new WaitGroup();
	const results: string[] = [];

	// Start two operations using go method
	await Promise.all([
		wg.go(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			results.push('op1');
		}),
		wg.go(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			results.push('op2');
		}),
	]);

	// Wait for all operations to complete
	await wg.wait();

	assertEquals(wg.counter, 0);
	assert(results.includes('op1'));
	assert(results.includes('op2'));
});

Deno.test('WaitGroup - should handle synchronous functions with go method', async () => {
	const wg = new WaitGroup();
	const results: number[] = [];

	await wg.go(() => {
		results.push(1);
	});

	await wg.wait();

	assertEquals(wg.counter, 0);
	assertEquals(results, [1]);
});

Deno.test('WaitGroup - should call done even if go function throws', async () => {
	const wg = new WaitGroup();
	let errorCaught = false;

	try {
		await wg.go(async () => {
			throw new Error('test error');
		});
	} catch (error) {
		errorCaught = true;
		assert(error instanceof Error);
		assertEquals((error as Error).message, 'test error');
	}

	// Even though the function threw, done should have been called
	assertEquals(errorCaught, true);
	assertEquals(wg.counter, 0);
});

