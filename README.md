
# golikejs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

golikejs reimplements selected parts of Go's standard library for JavaScript and TypeScript runtimes. The goal is practical API parity where it makes sense, so you can use familiar concurrency and context patterns from Go in JS/TS projects. The project is intentionally small and focused: it reproduces commonly used primitives (sync, context, channels, semaphores, etc.) and keeps semantics close to Go's originals.

Table of contents

- Features
- Installation
- Quick examples
  - Mutex
  - Channel
  - Context
  - Cond
  - Semaphore
  - WaitGroup
- API summary
- Development
- Contributing
- License

Features

- Mutex, RWMutex — mutual exclusion primitives matching Go semantics.
- WaitGroup — wait for a collection of goroutine-like tasks.
- Semaphore — counting semaphore.
- Channel<T> — unbuffered and buffered channels with send/receive semantics.
- select() — multiplex channel operations like Go's select statement.
- Cond — condition variables.
- Context — cancellation propagation and done/error semantics.

Installation

**Deno**

```ts
import { Mutex } from 'https://deno.land/x/golikejs/src/sync/index.ts';
// or use specific version
import { Mutex } from 'https://deno.land/x/golikejs@v0.4.0/src/sync/index.ts';
```

**npm (Node.js, Bun)**

Note: npm support is being phased out. For npm users, you can still use version 0.4.0 or earlier:

```bash
npm install golikejs@0.4.0
```

Quick examples

Mutex

```ts
import { Mutex } from 'https://deno.land/x/golikejs/src/sync/index.ts';

const m = new Mutex();
await m.lock();
try {
  // critical section
} finally {
  m.unlock();
}
```

Channel (buffered)

```ts
import { Channel } from 'https://deno.land/x/golikejs/src/channel/index.ts';

const ch = new Channel<number>(3);
await ch.send(1);
const [value, ok] = await ch.receive();
```

Channel select (multiplexing)

```ts
import { Channel, select, receive, send, default_ } from 'https://deno.land/x/golikejs/src/channel/index.ts';

const ch1 = new Channel<string>();
const ch2 = new Channel<number>();

// Intuitive API with helper functions
let result: string | undefined;
await select([
  receive(ch1).then((value, ok) => { result = `ch1: ${value}`; }),
  receive(ch2).then((value, ok) => { result = `ch2: ${value}`; }),
  send(ch1, 'hello').then(() => { result = 'sent to ch1'; }),
  default_(() => { result = 'no data available'; })
]);

// Or using the direct object API
await select([
  { channel: ch1, action: (value, ok) => { result = `ch1: ${value}`; } },
  { channel: ch2, action: (value, ok) => { result = `ch2: ${value}`; } },
  { channel: ch1, value: 'hello', action: () => { result = 'sent to ch1'; } },
  { default: () => { result = 'no data available'; } }
]);
```

Context (cancellation)

```ts
import { context } from 'https://deno.land/x/golikejs/src/context/index.ts';

const ctx = context.withCancel(context.Background());
// some async work that listens for cancellation
const task = async (ctx) => {
  await ctx.done; // resolves when canceled
};

// cancel the context
ctx.cancel(new Error('shutdown'));
```

Cond

```ts
import { Cond, Mutex } from 'https://deno.land/x/golikejs/src/sync/index.ts';

const mu = new Mutex();
const cond = new Cond(mu);

// in a waiter
await mu.lock();
try {
  await cond.wait();
} finally {
  mu.unlock();
}

// elsewhere
await mu.lock();
try {
  cond.signal();
} finally {
  mu.unlock();
}
```

Semaphore

```ts
import { Semaphore } from 'https://deno.land/x/golikejs/src/sync/index.ts';

const s = new Semaphore(2);
await s.acquire();
try {
  // limited concurrency section
} finally {
  s.release();
}
```

WaitGroup

```ts
import { WaitGroup } from 'https://deno.land/x/golikejs/src/sync/index.ts';

const wg = new WaitGroup();
wg.add(1);
(async () => {
  try {
    // work
  } finally {
    wg.done();
  }
})();
await wg.wait();
```

API summary

- Mutex: `lock()`, `unlock()`, `tryLock()`
- RWMutex: `rlock()`, `runlock()`, `lock()`, `unlock()`
- WaitGroup: `add()`, `done()`, `wait()`
- Semaphore: `acquire()`, `release()`, `tryAcquire()`
- Channel<T>: `send()`, `receive()`, `trySend()`, `tryReceive()`, `close()`
- select: `select()`, `receive()`, `send()`, `default_()`
- Cond: `wait()`, `signal()`, `broadcast()`
- Context helpers in `context` module: `Background()`, `withCancel()`, `withTimeout()`, and `withDeadline()` (see source API for details)

Development

This project uses Deno for development and testing.

**Prerequisites**

- [Deno](https://deno.land/) 2.x or later

**Run tests**

```bash
deno task test
```

**Run tests with coverage**

```bash
deno task test:coverage
```

**Format code**

```bash
deno task fmt
```

**Lint code**

```bash
deno task lint
```

**Type check**

```bash
deno task check
```

Contributing

Contributions, bug reports, and PRs are welcome. Please open issues for proposals or file PRs with tests where appropriate. We try to keep the APIs stable and faithful to Go where possible.

License

MIT
