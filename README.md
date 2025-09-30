
# golikejs

[![npm version](https://badge.fury.io/js/golikejs.svg)](https://badge.fury.io/js/golikejs) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
- Build & testing
- Publishing
- Contributing
- License

Features

- Mutex, RWMutex — mutual exclusion primitives matching Go semantics.
- WaitGroup — wait for a collection of goroutine-like tasks.
- Semaphore — counting semaphore.
- Channel<T> — unbuffered and buffered channels with send/receive semantics.
- Cond — condition variables.
- Context — cancellation propagation and done/error semantics.

Installation

```bash
npm install golikejs
# or with bun
bun add golikejs
```

Quick examples

Mutex

```ts
import { Mutex } from 'golikejs';

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
import { Channel } from 'golikejs';

const ch = new Channel<number>(3);
await ch.send(1);
const v = await ch.receive();
```

Context (cancellation)

```ts
import { context } from 'golikejs';

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
import { Cond, Mutex } from 'golikejs';

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
import { Semaphore } from 'golikejs';

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
import { WaitGroup } from 'golikejs';

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
- Cond: `wait()`, `signal()`, `broadcast()`
- Context helpers in `context` module: `Background()`, `withCancel()`, `withTimeout()`, and `withDeadline()` (see source API for details)

Build & testing

- Run tests with Bun (recommended):

```bash
bun test
```

- Build (if needed):

```bash
bun run build
```

Publishing

The repository contains a GitHub Actions workflow that can publish the package to npm when a release is created or a `v*` tag is pushed. To enable automated publishing:

1. Create an npm token (Settings → Access Tokens on npmjs.com) and add it to your GitHub repository secrets as `NPM_TOKEN`.
2. Push a tag such as `v1.0.0` or create a GitHub Release. The `publish` workflow will run and publish to npm with the configured token.

Contributing

Contributions, bug reports, and PRs are welcome. Please open issues for proposals or file PRs with tests where appropriate. We try to keep the APIs stable and faithful to Go where possible.

License

MIT
