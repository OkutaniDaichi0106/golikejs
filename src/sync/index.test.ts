import { Mutex, RWMutex, WaitGroup, Semaphore, Cond } from './index.ts';
import { assertEquals, assert } from './_test_util.ts';

Deno.test('golikejs package - should export all synchronization primitives', () => {
  assert(Mutex !== undefined);
  assert(RWMutex !== undefined);
  assert(WaitGroup !== undefined);
  assert(Semaphore !== undefined);
  assert(Cond !== undefined);
});

Deno.test('golikejs package - should create instances of all primitives', () => {
  const mutex = new Mutex();
  const rwmutex = new RWMutex();
  const wg = new WaitGroup();
  const sem = new Semaphore(1);
  const cond = new Cond(mutex);

  assert(mutex instanceof Mutex);
  assert(rwmutex instanceof RWMutex);
  assert(wg instanceof WaitGroup);
  assert(sem instanceof Semaphore);
  assert(cond instanceof Cond);
});

Deno.test('golikejs package - should work together in a realistic scenario', async () => {
  const mutex = new Mutex();
  const wg = new WaitGroup();
  const results: number[] = [];
  
  // Simulate concurrent workers with shared state
  const numWorkers = 3;
  wg.add(numWorkers);
  
  const workers = Array.from({ length: numWorkers }, (_, id) =>
    (async (workerId: number) => {
      for (let i = 0; i < 3; i++) {
        await mutex.lock();
        
        // Critical section - modify shared state
        const current = results.length;
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate work
        results.push(workerId * 100 + i);
        
        mutex.unlock();
        
        // Non-critical work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
      }
      wg.done();
    })(id)
  );
  
  // Wait for all workers to complete
  await wg.wait();
  
  assertEquals(results.length, 9); // 3 workers * 3 items each
  
  // Verify each worker contributed
  const worker0Results = results.filter(x => Math.floor(x / 100) === 0);
  const worker1Results = results.filter(x => Math.floor(x / 100) === 1);
  const worker2Results = results.filter(x => Math.floor(x / 100) === 2);
  
  assertEquals(worker0Results.length, 3);
  assertEquals(worker1Results.length, 3);
  assertEquals(worker2Results.length, 3);
});