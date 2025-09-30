import { describe, it, expect, beforeEach } from '@jest/globals';
import { Channel } from './channel.js';

describe('Channel', () => {
  it('should throw error for negative capacity', () => {
    expect(() => new Channel(-1)).toThrow('Channel: capacity must be non-negative');
  });

  describe('Unbuffered Channel', () => {
    let ch: Channel<number>;

    beforeEach(() => {
      ch = new Channel<number>(0);
    });

    it('should initialize correctly', () => {
      expect(ch.capacity).toBe(0);
      expect(ch.length).toBe(0);
      expect(ch.closed).toBe(false);
    });

    it('should handle synchronous send/receive', async () => {
      const promise = ch.receive();
      
      // Send should complete immediately since receiver is waiting
      await ch.send(42);
      
      const value = await promise;
      expect(value).toBe(42);
    });

    it('should handle asynchronous send/receive', async () => {
      const sendPromise = ch.send(100);
      
      // Let send operation start waiting
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const value = await ch.receive();
      expect(value).toBe(100);
      
      await sendPromise; // Should complete now
    });

    it('should handle tryReceive on empty channel', () => {
      expect(ch.tryReceive()).toBeUndefined();
    });

    it('should handle trySend with waiting receiver', async () => {
      const promise = ch.receive();
      
      expect(ch.trySend(123)).toBe(true);
      
      const value = await promise;
      expect(value).toBe(123);
    });

    it('should handle trySend without waiting receiver', () => {
      expect(ch.trySend(456)).toBe(false);
    });
  });

  describe('Buffered Channel', () => {
    let ch: Channel<string>;

    beforeEach(() => {
      ch = new Channel<string>(3);
    });

    it('should initialize correctly', () => {
      expect(ch.capacity).toBe(3);
      expect(ch.length).toBe(0);
      expect(ch.closed).toBe(false);
    });

    it('should handle buffered sends', async () => {
      await ch.send('a');
      await ch.send('b');
      await ch.send('c');
      
      expect(ch.length).toBe(3);
      
      // Fourth send should block
      const sendPromise = ch.send('d');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(ch.length).toBe(3); // Still full
      
      // Receive one to make space
      const value = await ch.receive();
      expect(value).toBe('a');
      expect(ch.length).toBe(3); // 'd' should have been added
      
      await sendPromise; // Should complete
    });

    it('should handle buffered receives', async () => {
      await ch.send('x');
      await ch.send('y');
      
      const value1 = await ch.receive();
      const value2 = await ch.receive();
      
      expect(value1).toBe('x');
      expect(value2).toBe('y');
      expect(ch.length).toBe(0);
    });

    it('should handle tryReceive with buffered values', async () => {
      await ch.send('test');
      
      expect(ch.tryReceive()).toBe('test');
      expect(ch.tryReceive()).toBeUndefined();
    });

    it('should handle trySend with buffer space', () => {
      expect(ch.trySend('1')).toBe(true);
      expect(ch.trySend('2')).toBe(true);
      expect(ch.trySend('3')).toBe(true);
      expect(ch.trySend('4')).toBe(false); // Buffer full
      
      expect(ch.length).toBe(3);
    });
  });

  describe('Channel Closing', () => {
    let ch: Channel<number>;

    beforeEach(() => {
      ch = new Channel<number>(1);
    });

    it('should close correctly', () => {
      ch.close();
      expect(ch.closed).toBe(true);
    });

    it('should throw error on send to closed channel', () => {
      ch.close();
      expect(ch.send(1)).rejects.toThrow('Channel: send on closed channel');
    });

    it('should throw error on receive from closed empty channel', async () => {
      ch.close();
      expect(ch.receive()).rejects.toThrow('Channel: receive from closed channel');
    });

    it('should receive remaining buffered values after close', async () => {
      await ch.send(99);
      ch.close();
      
      const value = await ch.receive();
      expect(value).toBe(99);
      
      // Now should throw
      expect(ch.receive()).rejects.toThrow('Channel: receive from closed channel');
    });

    it('should handle trySend on closed channel', () => {
      ch.close();
      expect(ch.trySend(1)).toBe(false);
    });

    it('should handle multiple closes', () => {
      ch.close();
      ch.close(); // Should not throw
      expect(ch.closed).toBe(true);
    });
  });

  describe('Channel Patterns', () => {
    it('should handle fan-out pattern', async () => {
      const input = new Channel<number>(5); // Larger buffer to avoid blocking
      const output1 = new Channel<number>(5);
      const output2 = new Channel<number>(5);
      
      // Send values first
      await input.send(1);
      await input.send(2);
      await input.send(3);
      await input.send(4);
      
      // Fan-out operation - process all available values
      const values: number[] = [];
      for (let i = 0; i < 4; i++) {
        values.push(await input.receive());
      }
      
      // Route values
      for (const value of values) {
        if (value % 2 === 1) { // Route odd numbers to output1
          await output1.send(value);
        } else { // Route even numbers to output2
          await output2.send(value);
        }
      }
      
      // Receive from outputs
      const results1 = [await output1.receive(), await output1.receive()];
      const results2 = [await output2.receive(), await output2.receive()];
      
      expect(results1.sort()).toEqual([1, 3]);
      expect(results2.sort()).toEqual([2, 4]);
    });

    it('should handle worker pool pattern', async () => {
      const jobs = new Channel<number>(5);
      const results = new Channel<number>(5);
      const numWorkers = 3;
      
      // Start workers
      const workers = Array.from({ length: numWorkers }, (_, id) => 
        (async () => {
          try {
            while (true) {
              const job = await jobs.receive();
              // Simulate processing
              await new Promise(resolve => setTimeout(resolve, 10));
              await results.send(job * 2);
            }
          } catch {
            // Channel closed
          }
        })()
      );
      
      // Send jobs
      for (let i = 1; i <= 5; i++) {
        await jobs.send(i);
      }
      
      // Collect results
      const collectedResults: number[] = [];
      for (let i = 0; i < 5; i++) {
        collectedResults.push(await results.receive());
      }
      
      jobs.close();
      
      collectedResults.sort((a, b) => a - b);
      expect(collectedResults).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe('Channel used as semaphore (prefilled tokens)', () => {
    it('limits concurrent workers to capacity', async () => {
      const capacity = 4;
      const ch = new Channel<number>(capacity);

      // pre-fill tokens
      for (let i = 0; i < capacity; i++) {
        await ch.send(1);
      }

      let concurrent = 0;
      let maxConcurrent = 0;

      const worker = async () => {
        await ch.receive(); // acquire
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);

        // simulate work
        await new Promise((res) => setTimeout(res, 10 + Math.floor(Math.random() * 30)));

        concurrent--;
        await ch.send(1); // release
      };

      const tasks: Promise<void>[] = [];
      for (let i = 0; i < 30; i++) tasks.push(worker());

      await Promise.all(tasks);

      expect(maxConcurrent).toBeLessThanOrEqual(capacity);
    });

    it('tryReceive behaves as tryAcquire', async () => {
      const ch = new Channel<number>(1);
      await ch.send(1);

      const got = ch.tryReceive();
      expect(got).toBe(1);

      const got2 = ch.tryReceive();
      expect(got2).toBeUndefined();
    });

    it('works with buffered channel as mutex (capacity=1)', async () => {
      const ch = new Channel<number>(1); // buffered mutex-like

      let inCs = 0;
      let maxInCs = 0;

      const worker = async () => {
        await ch.receive();
        inCs++;
        maxInCs = Math.max(maxInCs, inCs);
        await new Promise((r) => setTimeout(r, 5));
        inCs--;
        await ch.send(1);
      };

      // prefill one token so the channel acts as a mutex
      await ch.send(1);

      const tasks = Array.from({ length: 10 }, () => worker());
      await Promise.all(tasks);

      expect(maxInCs).toBeGreaterThan(0);
      expect(maxInCs).toBeLessThanOrEqual(1); // buffered capacity=1 acts like mutex
    });
  });
});