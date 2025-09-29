import { describe, it, expect, beforeEach } from 'bun:test';
import { Mutex } from '../src/mutex.js';

describe('Mutex', () => {
  let mutex: Mutex;

  beforeEach(() => {
    mutex = new Mutex();
  });

  it('should initially be unlocked', () => {
    expect(mutex.locked).toBe(false);
  });

  it('should lock and unlock successfully', async () => {
    await mutex.lock();
    expect(mutex.locked).toBe(true);
    
    mutex.unlock();
    expect(mutex.locked).toBe(false);
  });

  it('should throw error when unlocking unlocked mutex', () => {
    expect(() => mutex.unlock()).toThrow('Mutex: unlock of unlocked mutex');
  });

  it('should handle tryLock correctly', () => {
    expect(mutex.tryLock()).toBe(true);
    expect(mutex.locked).toBe(true);
    expect(mutex.tryLock()).toBe(false);
    
    mutex.unlock();
    expect(mutex.locked).toBe(false);
  });

  it('should handle concurrent access correctly', async () => {
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
    expect(results).toHaveLength(5);
    // Results should contain all IDs (order may vary due to timing)
    expect(new Set(results)).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('should maintain FIFO order for waiters', async () => {
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
    
    expect(results).toEqual([0, 1, 2]);
  });
});