import { describe, it, expect, beforeEach } from "vitest";
import { Semaphore } from "./semaphore.js";

describe("Semaphore", () => {
	it("should throw error for negative permits", () => {
		expect(() => new Semaphore(-1)).toThrow("Semaphore: permits must be non-negative");
	});

	it("should initialize with correct permits", () => {
		const sem = new Semaphore(3);
		expect(sem.availablePermits).toBe(3);
		expect(sem.queueLength).toBe(0);
	});

	it("should handle acquire and release correctly", async () => {
		const sem = new Semaphore(2);

		await sem.acquire();
		expect(sem.availablePermits).toBe(1);

		await sem.acquire();
		expect(sem.availablePermits).toBe(0);

		sem.release();
		expect(sem.availablePermits).toBe(1);

		sem.release();
		expect(sem.availablePermits).toBe(2);
	});

	it("should handle tryAcquire correctly", () => {
		const sem = new Semaphore(1);

		expect(sem.tryAcquire()).toBe(true);
		expect(sem.availablePermits).toBe(0);
		expect(sem.tryAcquire()).toBe(false);

		sem.release();
		expect(sem.tryAcquire()).toBe(true);
	});

	it("should handle blocking when no permits available", async () => {
		const sem = new Semaphore(1);
		const results: number[] = [];

		// Acquire the only permit
		await sem.acquire();

		// Start a task that will have to wait
		const waitingTask = async () => {
			await sem.acquire();
			results.push(1);
			sem.release();
		};

		const promise = waitingTask();

		// Task should be waiting
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(results).toHaveLength(0);
		expect(sem.queueLength).toBe(1);

		// Release permit to unblock waiting task
		sem.release();

		await promise;
		expect(results).toEqual([1]);
	});

	it("should handle multiple concurrent acquisitions", async () => {
		const sem = new Semaphore(2);
		const results: number[] = [];
		const startTime = Date.now();

		const tasks = Array.from({ length: 4 }, (_, i) =>
			(async (id: number) => {
				await sem.acquire();

				// Simulate work
				await new Promise((resolve) => setTimeout(resolve, 10));
				results.push(id);

				sem.release();
			})(i)
		);

		await Promise.all(tasks);

		const endTime = Date.now();
		const elapsed = endTime - startTime;

		// Should take approximately 20ms (2 batches of 10ms each)
		expect(elapsed).toBeGreaterThanOrEqual(15);
		expect(elapsed).toBeLessThan(50);

		expect(results).toHaveLength(4);
		expect(new Set(results)).toEqual(new Set([0, 1, 2, 3]));
	});

	it("should maintain FIFO order for waiters", async () => {
		const sem = new Semaphore(1);
		const results: number[] = [];

		// Acquire the permit first
		await sem.acquire();

		// Start multiple waiters
		const promises: Promise<void>[] = [];
		for (let i = 0; i < 3; i++) {
			promises.push(
				(async (id: number) => {
					await sem.acquire();
					results.push(id);
					// Quick release to let next waiter proceed
					setTimeout(() => sem.release(), 1);
				})(i)
			);
		}

		// Let waiters queue up
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(sem.queueLength).toBe(3);

		// Release to start the chain
		sem.release();

		await Promise.all(promises);

		expect(results).toEqual([0, 1, 2]);
	});

	it("should handle zero permits (binary semaphore)", async () => {
		const sem = new Semaphore(0);
		expect(sem.availablePermits).toBe(0);

		const results: number[] = [];

		// This should block since no permits available
		const blockedTask = async () => {
			await sem.acquire();
			results.push(1);
		};

		const promise = blockedTask();

		// Should be waiting
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(results).toHaveLength(0);

		// Release a permit
		sem.release();

		await promise;
		expect(results).toEqual([1]);
	});

	it("should handle resource pool scenario", async () => {
		const poolSize = 3;
		const sem = new Semaphore(poolSize);
		const activeConnections = new Set<number>();
		const maxConcurrent = { value: 0 };

		const tasks = Array.from({ length: 10 }, (_, i) =>
			(async (id: number) => {
				await sem.acquire();

				activeConnections.add(id);
				maxConcurrent.value = Math.max(maxConcurrent.value, activeConnections.size);

				// Simulate using the resource
				await new Promise((resolve) => setTimeout(resolve, 20));

				activeConnections.delete(id);
				sem.release();
			})(i)
		);

		await Promise.all(tasks);

		// Should never exceed pool size
		expect(maxConcurrent.value).toBeLessThanOrEqual(poolSize);
		expect(maxConcurrent.value).toBeGreaterThan(0);
		expect(activeConnections.size).toBe(0);
		expect(sem.availablePermits).toBe(poolSize);
	});
});
