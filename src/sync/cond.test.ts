import { Mutex } from './mutex.ts';
import { Cond } from './cond.ts';
import { assert, assertEquals } from '@std/assert';

// Tests for Cond (condition variable) behavior

Deno.test('Cond - wait releases mutex and reacquires it after signal', async () => {
	const m = new Mutex();
	const c = new Cond(m);

	let waiterAcquired = false;

	// Start a waiter that will acquire the mutex, then call wait()
	const waiter = (async () => {
		await m.lock();
		// This will release the mutex and wait; when it returns it will have reacquired the mutex
		await c.wait();
		waiterAcquired = true;
		// release immediately
		m.unlock();
	})();

	// Give the waiter a tick to acquire and call wait (which unlocks)
	await new Promise((r) => setTimeout(r, 10));

	// At this point, the waiter should have released the mutex, so main can lock
	await m.lock();

	// Now signal the waiter while holding the mutex
	c.signal();

	// release our lock so waiter can proceed and reacquire
	m.unlock();

	// wait for waiter to finish
	await waiter;

	// ensure waiter reacquired the mutex and then returned
	assertEquals(waiterAcquired, true);
});

Deno.test('Cond - signal wakes only one waiter', async () => {
	const m = new Mutex();
	const c = new Cond(m);

	// Start multiple waiters (each will acquire the mutex and then wait)
	let woke = 0;

	const makeWaiter = async () => {
		await m.lock();
		await c.wait();
		woke++;
		m.unlock();
	};

	const waiters = [makeWaiter(), makeWaiter(), makeWaiter()];

	// Give them time to queue
	await new Promise((r) => setTimeout(r, 10));
	assert(c.waitersCount >= 3);

	// Acquire mutex, then wake one waiter and release
	await m.lock();
	c.signal();
	m.unlock();

	// Give some time for one to wake
	await new Promise((r) => setTimeout(r, 20));

	assertEquals(woke, 1);

	// cleanup: broadcast to wake remaining and ensure they finish
	await m.lock();
	c.broadcast();
	m.unlock();
	await Promise.all(waiters);
});

Deno.test('Cond - broadcast wakes all waiters', async () => {
	const m = new Mutex();
	const c = new Cond(m);

	let woke = 0;
	const makeWaiter = async () => {
		await m.lock();
		await c.wait();
		woke++;
		m.unlock();
	};

	const waiters = [makeWaiter(), makeWaiter(), makeWaiter(), makeWaiter()];

	await new Promise((r) => setTimeout(r, 10));
	assert(c.waitersCount >= 4);

	await m.lock();
	c.broadcast();
	m.unlock();

	// Wait a bit for all to wake
	await new Promise((r) => setTimeout(r, 10));

	assertEquals(woke, 4);

	// ensure all finished
	await Promise.all(waiters);
});

Deno.test('Cond - signal/broadcast are no-ops when no waiters', () => {
	const m = new Mutex();
	const c = new Cond(m);

	// Should not throw
	c.signal();
	c.broadcast();

	assertEquals(c.waitersCount, 0);
});
