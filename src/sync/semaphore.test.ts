import { Semaphore } from './semaphore.ts';
import { assert, assertEquals, assertThrows } from './_test_util.ts';

Deno.test('Semaphore - should throw error for negative permits', () => {
  assertThrows(() => new Semaphore(-1), Error, 'Semaphore: permits must be non-negative');
});

Deno.test('Semaphore - should initialize with correct permits', () => {
  const sem = new Semaphore(3);
  assertEquals(sem.availablePermits, 3);
  assertEquals(sem.queueLength, 0);
});

Deno.test('Semaphore - should handle acquire and release correctly', async () => {
  const sem = new Semaphore(2);

  await sem.acquire();
  assertEquals(sem.availablePermits, 1);

  await sem.acquire();
  assertEquals(sem.availablePermits, 0);

  sem.release();
  assertEquals(sem.availablePermits, 1);

  sem.release();
  assertEquals(sem.availablePermits, 2);
});

Deno.test('Semaphore - should handle tryAcquire correctly', () => {
  const sem = new Semaphore(1);

  assertEquals(sem.tryAcquire(), true);
  assertEquals(sem.availablePermits, 0);
  assertEquals(sem.tryAcquire(), false);

  sem.release();
  assertEquals(sem.tryAcquire(), true);
});

Deno.test('Semaphore - should handle blocking when no permits available', async () => {
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
  assertEquals(results.length, 0);
  assertEquals(sem.queueLength, 1);

  // Release permit to unblock waiting task
  sem.release();

  await promise;
  assertEquals(results, [1]);
});

Deno.test('Semaphore - should handle multiple concurrent acquisitions', async () => {
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
    })(i));

  await Promise.all(tasks);

  const endTime = Date.now();
  const elapsed = endTime - startTime;

  // Should take approximately 20ms (2 batches of 10ms each)
  assert(elapsed >= 15);
  assert(elapsed < 50);

  assertEquals(results.length, 4);
  assertEquals(new Set(results), new Set([0, 1, 2, 3]));
});

Deno.test('Semaphore - should maintain FIFO order for waiters', async () => {
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
      })(i),
    );
  }

  // Let waiters queue up
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(sem.queueLength, 3);

  // Release to start the chain
  sem.release();

  await Promise.all(promises);

  assertEquals(results, [0, 1, 2]);
});

Deno.test('Semaphore - should handle zero permits (binary semaphore)', async () => {
  const sem = new Semaphore(0);
  assertEquals(sem.availablePermits, 0);

  const results: number[] = [];

  // This should block since no permits available
  const blockedTask = async () => {
    await sem.acquire();
    results.push(1);
  };

  const promise = blockedTask();

  // Should be waiting
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(results.length, 0);

  // Release a permit
  sem.release();

  await promise;
  assertEquals(results, [1]);
});

Deno.test('Semaphore - should handle resource pool scenario', async () => {
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
    })(i));

  await Promise.all(tasks);

  // Should never exceed pool size
  assert(maxConcurrent.value <= poolSize);
  assert(maxConcurrent.value > 0);
  assertEquals(activeConnections.size, 0);
  assertEquals(sem.availablePermits, poolSize);
});
