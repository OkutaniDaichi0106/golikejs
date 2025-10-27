import { Mutex } from './mutex.ts';
import { assertEquals, assertThrows } from './_test_util.ts';

Deno.test('Mutex - should initially be unlocked', () => {
  const mutex = new Mutex();
  assertEquals(mutex.locked, false);
});

Deno.test('Mutex - should lock and unlock successfully', async () => {
  const mutex = new Mutex();
  await mutex.lock();
  assertEquals(mutex.locked, true);
  
  mutex.unlock();
  assertEquals(mutex.locked, false);
});

Deno.test('Mutex - should throw error when unlocking unlocked mutex', () => {
  const mutex = new Mutex();
  assertThrows(() => mutex.unlock(), Error, 'Mutex: unlock of unlocked mutex');
});

Deno.test('Mutex - should handle tryLock correctly', () => {
  const mutex = new Mutex();
  assertEquals(mutex.tryLock(), true);
  assertEquals(mutex.locked, true);
  assertEquals(mutex.tryLock(), false);
  
  mutex.unlock();
  assertEquals(mutex.locked, false);
});

Deno.test('Mutex - should handle concurrent access correctly', async () => {
  const mutex = new Mutex();
  const results: number[] = [];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < 5; i++) {
    promises.push(
      (async (id: number) => {
        await mutex.lock();
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(id);
        mutex.unlock();
      })(i)
    );
  }

  await Promise.all(promises);
  
  // All operations should complete
  assertEquals(results.length, 5);
  // Results should contain all IDs (order may vary due to timing)
  assertEquals(new Set(results), new Set([0, 1, 2, 3, 4]));
});

Deno.test('Mutex - should maintain FIFO order for waiters', async () => {
  const mutex = new Mutex();
  const results: number[] = [];
  
  // Lock the mutex first
  await mutex.lock();
  
  // Start multiple waiters
  const promises: Promise<void>[] = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      (async (id: number) => {
        await mutex.lock();
        results.push(id);
        // Quick unlock to let next waiter proceed
        setTimeout(() => mutex.unlock(), 1);
      })(i)
    );
  }
  
  // Let waiters queue up
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Unlock to start the chain
  mutex.unlock();
  
  await Promise.all(promises);
  
  assertEquals(results, [0, 1, 2]);
});