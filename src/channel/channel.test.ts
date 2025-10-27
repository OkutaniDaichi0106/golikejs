import { assert, assertEquals, assertThrows } from './_test_util.ts';
import { Channel, default_, receive, select, send } from './channel.ts';

Deno.test('Channel - should throw error for negative capacity', () => {
  assertThrows(() => new Channel(-1), Error, 'Channel: capacity must be non-negative');

  let ch: Channel<number>;

  Deno.test('Unbuffered Channel - should initialize correctly', () => {
    assertEquals(ch.capacity, 0);
    assertEquals(ch.length, 0);
    assertEquals(ch.closed, false);

    Deno.test('should handle synchronous send/receive', async () => {
      const promise = ch.receive();

      // Send should complete immediately since receiver is waiting
      await ch.send(42);

      const [value, ok] = await promise;
      assertEquals(ok, true);
      assertEquals(value, 42);
    });

    Deno.test('should handle asynchronous send/receive', async () => {
      const sendPromise = ch.send(100);

      // Let send operation start waiting
      await new Promise((resolve) => setTimeout(resolve, 10));

      const [value, ok] = await ch.receive();
      assertEquals(ok, true);
      assertEquals(value, 100);

      await sendPromise; // Should complete now
    });

    Deno.test('should handle tryReceive on empty channel', () => {
      const [value, ok] = ch.tryReceive();
      assertEquals(ok, false);
      assertEquals(value, undefined);
    });

    Deno.test('should handle trySend with waiting receiver', async () => {
      const promise = ch.receive();

      assertEquals(ch.trySend(123), true);

      const [value, ok] = await promise;
      assertEquals(ok, true);
      assertEquals(value, 123);
    });

    Deno.test('should handle trySend without waiting receiver', () => {
      assertEquals(ch.trySend(456), false);
    });
  });

  let ch: Channel<string>;

  Deno.test('Buffered Channel - should initialize correctly', () => {
    assertEquals(ch.capacity, 3);
    assertEquals(ch.length, 0);
    assertEquals(ch.closed, false);

    Deno.test('should handle buffered sends', async () => {
      await ch.send('a');
      await ch.send('b');
      await ch.send('c');

      assertEquals(ch.length, 3);

      // Fourth send should block
      const sendPromise = ch.send('d');

      await new Promise((resolve) => setTimeout(resolve, 10));
      assertEquals(ch.length, 3); // Still full

      // Receive one to make space
      const [value, ok] = await ch.receive();
      assertEquals(ok, true);
      assertEquals(value, 'a');
      assertEquals(ch.length, 3); // 'd' should have been added

      await sendPromise; // Should complete
    });

    Deno.test('should handle buffered receives', async () => {
      await ch.send('x');
      await ch.send('y');

      const [value1, ok1] = await ch.receive();
      const [value2, ok2] = await ch.receive();

      assertEquals(ok1, true);
      assertEquals(value1, 'x');
      assertEquals(ok2, true);
      assertEquals(value2, 'y');
      assertEquals(ch.length, 0);
    });

    Deno.test('should handle tryReceive with buffered values', async () => {
      await ch.send('test');

      const [value, ok] = ch.tryReceive();
      assertEquals(ok, true);
      assertEquals(value, 'test');

      const [value2, ok2] = ch.tryReceive();
      assertEquals(ok2, false);
      assertEquals(value2, undefined);
    });

    Deno.test('should handle trySend with buffer space', () => {
      assertEquals(ch.trySend('1'), true);
      assertEquals(ch.trySend('2'), true);
      assertEquals(ch.trySend('3'), true);
      assertEquals(ch.trySend('4'), false); // Buffer full

      assertEquals(ch.length, 3);
    });
  });

  let ch: Channel<number>;

  Deno.test('Channel Closing - should close correctly', () => {
    ch.close();
    assertEquals(ch.closed, true);

    Deno.test('should throw error on send to closed channel', () => {
      ch.close();
      expect(ch.send(1)).rejects.toThrow('Channel: send on closed channel');
    });

    Deno.test('should return closed signal on receive from closed empty channel', async () => {
      ch.close();
      const [value, ok] = await ch.receive();
      assertEquals(ok, false);
      assertEquals(value, undefined);
    });

    Deno.test('should receive remaining buffered values after close', async () => {
      await ch.send(99);
      ch.close();

      const [value, ok] = await ch.receive();
      assertEquals(ok, true);
      assertEquals(value, 99);

      // Now should return closed signal
      const [value2, ok2] = await ch.receive();
      assertEquals(ok2, false);
      assertEquals(value2, undefined);
    });

    Deno.test('should handle trySend on closed channel', () => {
      ch.close();
      assertEquals(ch.trySend(1), false);
    });

    Deno.test('should handle multiple closes', () => {
      ch.close();
      ch.close(); // Should not throw
      assertEquals(ch.closed, true);
    });
  });

  Deno.test('Channel Patterns - should handle fan-out pattern', async () => {
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
      const [value, ok] = await input.receive();
      if (ok) {
        values.push(value);
      }
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
    const [r1_1, ok1_1] = await output1.receive();
    const [r1_2, ok1_2] = await output1.receive();
    const results1 = ok1_1 && ok1_2 ? [r1_1, r1_2] : [];

    const [r2_1, ok2_1] = await output2.receive();
    const [r2_2, ok2_2] = await output2.receive();
    const results2 = ok2_1 && ok2_2 ? [r2_1, r2_2] : [];

    assertEquals(results1.sort(), [1, 3]);
    assertEquals(results2.sort(), [2, 4]);

    Deno.test('should handle worker pool pattern', async () => {
      const jobs = new Channel<number>(5);
      const results = new Channel<number>(5);
      const numWorkers = 3;

      // Start workers
      const workers = Array.from({ length: numWorkers }, (_, id) =>
        (async () => {
          try {
            while (true) {
              const [job, ok] = await jobs.receive();
              if (!ok) break; // Channel closed
              // Simulate processing
              await new Promise((resolve) => setTimeout(resolve, 10));
              await results.send(job * 2);
            }
          } catch {
            // Channel closed
          }
        })());

      // Send jobs
      for (let i = 1; i <= 5; i++) {
        await jobs.send(i);
      }

      // Collect results
      const collectedResults: number[] = [];
      for (let i = 0; i < 5; i++) {
        const [result, ok] = await results.receive();
        if (ok) {
          collectedResults.push(result);
        }
      }

      jobs.close();

      collectedResults.sort((a, b) => a - b);
      assertEquals(collectedResults, [2, 4, 6, 8, 10]);
    });
  });

  Deno.test('Channel used as semaphore (prefilled tokens) - limits concurrent workers to capacity', async () => {
    const capacity = 4;
    const ch = new Channel<number>(capacity);

    // pre-fill tokens
    for (let i = 0; i < capacity; i++) {
      await ch.send(1);
    }

    let concurrent = 0;
    let maxConcurrent = 0;

    const worker = async () => {
      const [token, ok] = await ch.receive(); // acquire
      if (!ok) return;
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);

      // simulate work
      await new Promise((res) => setTimeout(res, 5 + Math.floor(Math.random() * 10)));

      concurrent--;
      await ch.send(1); // release
    };

    const tasks: Promise<void>[] = [];
    for (let i = 0; i < 15; i++) tasks.push(worker());

    await Promise.all(tasks);

    assert(maxConcurrent <= capacity);

    Deno.test('tryReceive behaves as tryAcquire', async () => {
      const ch = new Channel<number>(1);
      await ch.send(1);

      const [got, ok] = ch.tryReceive();
      assertEquals(ok, true);
      assertEquals(got, 1);

      const [got2, ok2] = ch.tryReceive();
      assertEquals(ok2, false);
      assertEquals(got2, undefined);
    });

    Deno.test('works with buffered channel as mutex (capacity=1)', async () => {
      const ch = new Channel<number>(1); // buffered mutex-like

      let inCs = 0;
      let maxInCs = 0;

      const worker = async () => {
        const [token, ok] = await ch.receive();
        if (!ok) return;
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

      assert(maxInCs > 0);
      assert(maxInCs <= 1); // buffered capacity=1 acts like mutex
    });
  });

  Deno.test('select function - should select from multiple receive operations', async () => {
    const ch1 = new Channel<number>();
    const ch2 = new Channel<number>();

    let receivedValue: number | undefined;
    let receivedFrom: string | undefined;

    // Send to ch1 first
    setTimeout(() => ch1.send(42), 10);

    await select([
      {
        channel: ch1,
        action: (value, ok) => {
          receivedValue = value;
          receivedFrom = 'ch1';
        },
      },
      {
        channel: ch2,
        action: (value, ok) => {
          receivedValue = value;
          receivedFrom = 'ch2';
        },
      },
    ]);

    assertEquals(receivedFrom, 'ch1');
    assertEquals(receivedValue, 42);

    Deno.test('should select from multiple send operations', async () => {
      const ch1 = new Channel<number>();
      const ch2 = new Channel<number>();

      let sentTo: string | undefined;

      // Start receivers
      setTimeout(async () => {
        await ch1.receive();
        await ch2.receive();
      }, 10);

      await select([
        {
          channel: ch1,
          value: 100,
          action: () => {
            sentTo = 'ch1';
          },
        },
        {
          channel: ch2,
          value: 200,
          action: () => {
            sentTo = 'ch2';
          },
        },
      ]);

      assertEquals(sentTo, 'ch1');
    });

    Deno.test('should execute default case when no operations are ready', async () => {
      const ch1 = new Channel<number>();
      const ch2 = new Channel<number>();

      let defaultExecuted = false;

      await select([
        { channel: ch1, action: () => {} },
        { channel: ch2, action: () => {} },
        {
          default: () => {
            defaultExecuted = true;
          },
        },
      ]);

      assertEquals(defaultExecuted, true);
    });

    Deno.test('should not execute default when operations are ready', async () => {
      const bufferedCh = new Channel<number>(1);

      // Pre-fill buffered channel
      await bufferedCh.send(42);

      let defaultExecuted = false;
      let receivedValue: number | undefined;

      await select([
        {
          channel: bufferedCh,
          action: (value, ok) => {
            receivedValue = value;
          },
        },
        {
          default: () => {
            defaultExecuted = true;
          },
        },
      ]);

      assertEquals(defaultExecuted, false);
      assertEquals(receivedValue, 42);
    });

    Deno.test('should handle mixed receive and send operations', async () => {
      const ch1 = new Channel<number>();
      const ch2 = new Channel<number>();

      let operation: string | undefined;

      // Start a receiver for ch2
      setTimeout(async () => {
        await ch2.receive();
      }, 5);

      await select([
        {
          channel: ch1,
          action: () => {
            operation = 'receive';
          },
        },
        {
          channel: ch2,
          value: 300,
          action: () => {
            operation = 'send';
          },
        },
      ]);

      assertEquals(operation, 'send');
    });

    Deno.test('should throw error when no cases provided', async () => {
      await expect(select([])).rejects.toThrow('select: no cases provided');
    });
  });

  Deno.test('select helper functions - should work with receive helper', async () => {
    const ch = new Channel<number>();

    let receivedValue: number | undefined;
    setTimeout(() => ch.send(42), 10);

    await select([
      receive(ch).then((value, ok) => {
        receivedValue = value;
      }),
    ]);

    assertEquals(receivedValue, 42);

    Deno.test('should work with send helper', async () => {
      const ch = new Channel<number>();

      let sent = false;
      setTimeout(async () => {
        await ch.receive();
      }, 10);

      await select([
        send(ch, 100).then(() => {
          sent = true;
        }),
      ]);

      assertEquals(sent, true);
    });

    Deno.test('should work with default helper', async () => {
      const ch = new Channel<number>();

      let defaultExecuted = false;

      await select([
        receive(ch).then(() => {}),
        default_(() => {
          defaultExecuted = true;
        }),
      ]);

      assertEquals(defaultExecuted, true);
    });

    Deno.test('should work with mixed helpers', async () => {
      const ch1 = new Channel<number>(1); // buffered channel
      const ch2 = new Channel<number>();

      let result: string | undefined;

      // Pre-fill buffered channel
      await ch1.send(42);

      await select([
        receive(ch1).then((value, ok) => {
          result = `received: ${value}`;
        }),
        receive(ch2).then((value, ok) => {
          result = `received from ch2: ${value}`;
        }),
        send(ch2, 100).then(() => {
          result = 'sent';
        }),
        default_(() => {
          result = 'default';
        }),
      ]);

      assertEquals(result, 'received: 42');
    });
  });
});
