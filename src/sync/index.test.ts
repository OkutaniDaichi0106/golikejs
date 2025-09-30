import { describe, it, expect } from 'bun:test';
import { Mutex, RWMutex, WaitGroup, Semaphore, Channel, Cond } from './index.js';

describe('golikejs package', () => {
  it('should export all synchronization primitives', () => {
    expect(Mutex).toBeDefined();
    expect(RWMutex).toBeDefined();
    expect(WaitGroup).toBeDefined();
    expect(Semaphore).toBeDefined();
    expect(Channel).toBeDefined();
    expect(Cond).toBeDefined();
  });

  it('should create instances of all primitives', () => {
    const mutex = new Mutex();
    const rwmutex = new RWMutex();
    const wg = new WaitGroup();
    const sem = new Semaphore(1);
    const ch = new Channel<number>();
    const cond = new Cond(mutex);

    expect(mutex).toBeInstanceOf(Mutex);
    expect(rwmutex).toBeInstanceOf(RWMutex);
    expect(wg).toBeInstanceOf(WaitGroup);
    expect(sem).toBeInstanceOf(Semaphore);
    expect(ch).toBeInstanceOf(Channel);
    expect(cond).toBeInstanceOf(Cond);
  });

  it('should work together in a realistic scenario', async () => {
    const mutex = new Mutex();
    const wg = new WaitGroup();
    const results: number[] = [];
    
    // Simulate concurrent workers with shared state
    const numWorkers = 3;
    wg.add(numWorkers);
    
    const workers = Array.from({ length: numWorkers }, (_, id) =>
      (async (workerId: number) => {
        for (let i = 0; i < 5; i++) {
          await mutex.lock();
          
          // Critical section - modify shared state
          const current = results.length;
          await new Promise(resolve => setTimeout(resolve, 1)); // Simulate work
          results.push(workerId * 100 + i);
          
          mutex.unlock();
          
          // Non-critical work
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        }
        wg.done();
      })(id)
    );
    
    // Wait for all workers to complete
    await wg.wait();
    
    expect(results).toHaveLength(15); // 3 workers * 5 items each
    
    // Verify each worker contributed
    const worker0Results = results.filter(x => Math.floor(x / 100) === 0);
    const worker1Results = results.filter(x => Math.floor(x / 100) === 1);
    const worker2Results = results.filter(x => Math.floor(x / 100) === 2);
    
    expect(worker0Results).toHaveLength(5);
    expect(worker1Results).toHaveLength(5);
    expect(worker2Results).toHaveLength(5);
  });
});