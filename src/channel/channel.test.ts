import { assert, assertEquals, assertThrows } from './_test_util.ts';
import { Channel, default_, receive, select, send } from './channel.ts';

Deno.test('Channel - should throw error for negative capacity', () => {
  assertThrows(() => new Channel(-1), Error, 'Channel: capacity must be non-negative');
});

// Unbuffered Channel Tests
Deno.test('Channel - Unbuffered: should initialize correctly', () => {
  const ch = new Channel<number>(0);
  assertEquals(ch.capacity, 0);
  assertEquals(ch.length, 0);
  assertEquals(ch.closed, false);
});

Deno.test('Channel - Unbuffered: should handle synchronous send/receive', async () => {
  const ch = new Channel<number>(0);
  const promise = ch.receive();
  
  // Send should complete immediately since receiver is waiting
  await ch.send(42);
  
  const [value, ok] = await promise;
  assertEquals(ok, true);
  assertEquals(value, 42);
});

Deno.test('Channel - Unbuffered: should handle asynchronous send/receive', async () => {
  const ch = new Channel<number>(0);
  const sendPromise = ch.send(100);
  
  // Let send operation start waiting
  await new Promise((resolve) => setTimeout(resolve, 10));
  
  const [value, ok] = await ch.receive();
  assertEquals(ok, true);
  assertEquals(value, 100);
  
  await sendPromise; // Should complete now
});

Deno.test('Channel - Unbuffered: should handle tryReceive on empty channel', () => {
  const ch = new Channel<number>(0);
  const [value, ok] = ch.tryReceive();
  assertEquals(ok, false);
  assertEquals(value, undefined);
});

Deno.test('Channel - Unbuffered: should handle trySend with waiting receiver', async () => {
  const ch = new Channel<number>(0);
  const promise = ch.receive();
  
  assertEquals(ch.trySend(123), true);
  
  const [value, ok] = await promise;
  assertEquals(ok, true);
  assertEquals(value, 123);
});

Deno.test('Channel - Unbuffered: should handle trySend without waiting receiver', () => {
  const ch = new Channel<number>(0);
  assertEquals(ch.trySend(456), false);
});

// Buffered Channel Tests
Deno.test('Channel - Buffered: should initialize correctly', () => {
  const ch = new Channel<number>(3);
  assertEquals(ch.capacity, 3);
  assertEquals(ch.length, 0);
  assertEquals(ch.closed, false);
});

Deno.test('Channel - Buffered: should handle buffered sends', async () => {
  const ch = new Channel<number>(3);
  await ch.send(1);
  await ch.send(2);
  await ch.send(3);
  
  assertEquals(ch.length, 3);
  
  // Fourth send should block
  const sendPromise = ch.send(4);
  
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(ch.length, 3); // Still full
  
  // Receive one to make space
  const [value, ok] = await ch.receive();
  assertEquals(ok, true);
  assertEquals(value, 1);
  assertEquals(ch.length, 3); // '4' should have been added
  
  await sendPromise; // Should complete
});

Deno.test('Channel - Buffered: should handle buffered receives', async () => {
  const ch = new Channel<number>(3);
  await ch.send(10);
  await ch.send(20);
  
  const [value1, ok1] = await ch.receive();
  const [value2, ok2] = await ch.receive();
  
  assertEquals(ok1, true);
  assertEquals(value1, 10);
  assertEquals(ok2, true);
  assertEquals(value2, 20);
  assertEquals(ch.length, 0);
});

Deno.test('Channel - Buffered: should handle tryReceive with buffered data', () => {
  const ch = new Channel<number>(3);
  ch.trySend(100);
  ch.trySend(200);
  
  const [value1, ok1] = ch.tryReceive();
  assertEquals(ok1, true);
  assertEquals(value1, 100);
  
  const [value2, ok2] = ch.tryReceive();
  assertEquals(ok2, true);
  assertEquals(value2, 200);
});

Deno.test('Channel - Buffered: should handle trySend with space available', () => {
  const ch = new Channel<number>(3);
  assertEquals(ch.trySend(1), true);
  assertEquals(ch.trySend(2), true);
  assertEquals(ch.trySend(3), true);
  assertEquals(ch.length, 3);
});

Deno.test('Channel - Buffered: should handle trySend when full', () => {
  const ch = new Channel<number>(2);
  assertEquals(ch.trySend(1), true);
  assertEquals(ch.trySend(2), true);
  assertEquals(ch.trySend(3), false); // Should fail when full
});

// Close Tests
Deno.test('Channel - Close: should close channel', () => {
  const ch = new Channel<number>(1);
  ch.close();
  assertEquals(ch.closed, true);
});

Deno.test('Channel - Close: should throw error when sending on closed channel', async () => {
  const ch = new Channel<number>(1);
  ch.close();
  
  await assertThrows(
    async () => {
      await ch.send(1);
    },
    Error,
    'Channel: send on closed channel',
  );
});

Deno.test('Channel - Close: should return false from receive on closed empty channel', async () => {
  const ch = new Channel<number>(0);
  ch.close();
  
  const [value, ok] = await ch.receive();
  assertEquals(ok, false);
  assertEquals(value, undefined);
});

Deno.test('Channel - Close: should drain buffered values before closing', async () => {
  const ch = new Channel<number>(3);
  await ch.send(1);
  await ch.send(2);
  ch.close();
  
  const [value1, ok1] = await ch.receive();
  assertEquals(ok1, true);
  assertEquals(value1, 1);
  
  const [value2, ok2] = await ch.receive();
  assertEquals(ok2, true);
  assertEquals(value2, 2);
  
  const [value3, ok3] = await ch.receive();
  assertEquals(ok3, false);
  assertEquals(value3, undefined);
});

Deno.test('Channel - Close: should handle multiple close calls idempotently', () => {
  const ch = new Channel<number>(1);
  ch.close();
  ch.close();
  assertEquals(ch.closed, true);
});

// Select Tests
Deno.test('Channel - Select: should throw error when no cases provided', async () => {
  await assertThrows(
    async () => {
      await select([]);
    },
    Error,
    'select: no cases provided',
  );
});

Deno.test('Channel - Select: should handle single receive case', async () => {
  const ch = new Channel<number>(1);
  await ch.send(42);
  
  let result: number | undefined;
  await select([
    receive(ch).then((value, ok) => {
      result = value;
    }),
  ]);
  
  assertEquals(result, 42);
});

Deno.test('Channel - Select: should handle single send case', async () => {
  const ch = new Channel<number>(1);
  
  let sent = false;
  await select([
    send(ch, 99).then(() => {
      sent = true;
    }),
  ]);
  
  assertEquals(sent, true);
  const [value, ok] = await ch.receive();
  assertEquals(value, 99);
  assertEquals(ok, true);
});

Deno.test('Channel - Select: should handle default case when no channel ready', async () => {
  const ch = new Channel<number>(0);
  
  let defaultExecuted = false;
  await select([
    receive(ch).then(() => {
      // Should not execute
    }),
    default_(() => {
      defaultExecuted = true;
    }),
  ]);
  
  assertEquals(defaultExecuted, true);
});

Deno.test('Channel - Select: should handle multiple channels', async () => {
  const ch1 = new Channel<number>(1);
  const ch2 = new Channel<number>(1);
  
  await ch1.send(100);
  
  let result: number | undefined;
  await select([
    receive(ch1).then((value) => {
      result = value;
    }),
    receive(ch2).then((value) => {
      result = value;
    }),
  ]);
  
  assertEquals(result, 100);
});

Deno.test('Channel - Select: should handle send and receive cases', async () => {
  const ch1 = new Channel<number>(1);
  const ch2 = new Channel<number>(1);
  
  let action = '';
  await select([
    send(ch1, 10).then(() => {
      action = 'sent to ch1';
    }),
    receive(ch2).then(() => {
      action = 'received from ch2';
    }),
  ]);
  
  assert(action === 'sent to ch1' || action === 'received from ch2');
});

Deno.test('Channel - Select: should work with closed channels', async () => {
  const ch = new Channel<number>(0);
  ch.close();
  
  let receivedFromClosed = false;
  await select([
    receive(ch).then((value, ok) => {
      receivedFromClosed = !ok;
    }),
  ]);
  
  assertEquals(receivedFromClosed, true);
});

// Integration Tests
Deno.test('Channel - Integration: should handle producer-consumer pattern', async () => {
  const ch = new Channel<number>(3);
  const results: number[] = [];
  
  // Producer
  const producer = async () => {
    for (let i = 1; i <= 5; i++) {
      await ch.send(i);
    }
    ch.close();
  };
  
  // Consumer
  const consumer = async () => {
    while (true) {
      const [value, ok] = await ch.receive();
      if (!ok) break;
      results.push(value);
    }
  };
  
  await Promise.all([producer(), consumer()]);
  
  assertEquals(results, [1, 2, 3, 4, 5]);
});

Deno.test('Channel - Integration: should handle multiple concurrent senders', async () => {
  const ch = new Channel<number>(5);
  const results: number[] = [];
  
  const sender1 = async () => {
    await ch.send(1);
    await ch.send(2);
  };
  
  const sender2 = async () => {
    await ch.send(3);
    await ch.send(4);
  };
  
  const receiver = async () => {
    for (let i = 0; i < 4; i++) {
      const [value, ok] = await ch.receive();
      if (ok) results.push(value);
    }
  };
  
  await Promise.all([sender1(), sender2(), receiver()]);
  
  assertEquals(results.length, 4);
  assert(results.includes(1));
  assert(results.includes(2));
  assert(results.includes(3));
  assert(results.includes(4));
});

Deno.test('Channel - Integration: should handle select with timeout pattern', async () => {
  const ch = new Channel<number>(0);
  const timeoutCh = new Channel<number>(0);
  
  // Simulate timeout after 50ms
  setTimeout(() => {
    timeoutCh.close();
  }, 50);
  
  let timedOut = false;
  await select([
    receive(ch).then(() => {
      // Should not execute
    }),
    receive(timeoutCh).then((_, ok) => {
      if (!ok) timedOut = true;
    }),
  ]);
  
  assertEquals(timedOut, true);
});
