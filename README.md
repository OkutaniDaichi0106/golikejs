# gosync

Go-style synchronization primitives for JavaScript/TypeScript

[![npm version](https://badge.fury.io/js/gosync.svg)](https://badge.fury.io/js/gosync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`gosync` provides a comprehensive set of synchronization primitives inspired by Go's `sync` package, implemented in TypeScript for JavaScript/TypeScript applications. These primitives help coordinate access to shared resources and manage concurrent operations.

## Features

- **Mutex**: Mutual exclusion lock
- **RWMutex**: Read-write mutual exclusion lock
- **WaitGroup**: Wait for a collection of operations to finish
- **Semaphore**: Counting semaphore for resource pooling
- **Channel**: Go-style channels for communication between async operations
- **Cond**: Condition variables for coordinating access to shared resources

## Installation

```bash
# Using bun
bun add gosync

# Using npm
npm install gosync

# Using yarn
yarn add gosync
```

## Usage

### Mutex

```typescript
import { Mutex } from 'gosync';

const mutex = new Mutex();

async function criticalSection() {
  await mutex.lock();
  try {
    // Critical section code here
    console.log('In critical section');
  } finally {
    mutex.unlock();
  }
}

// Or use tryLock for non-blocking acquisition
if (mutex.tryLock()) {
  try {
    // Got the lock
  } finally {
    mutex.unlock();
  }
} else {
  // Lock was not available
}
```

### RWMutex

```typescript
import { RWMutex } from 'gosync';

const rwmutex = new RWMutex();

// Multiple readers can acquire read locks simultaneously
async function reader() {
  await rwmutex.rlock();
  try {
    // Read operation
    console.log('Reading data');
  } finally {
    rwmutex.runlock();
  }
}

// Only one writer can acquire write lock
async function writer() {
  await rwmutex.lock();
  try {
    // Write operation
    console.log('Writing data');
  } finally {
    rwmutex.unlock();
  }
}
```

### WaitGroup

```typescript
import { WaitGroup } from 'gosync';

const wg = new WaitGroup();

async function worker(id: number) {
  console.log(`Worker ${id} starting`);
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`Worker ${id} done`);
  wg.done();
}

async function main() {
  wg.add(3);
  
  // Start workers
  worker(1);
  worker(2);
  worker(3);
  
  // Wait for all workers to finish
  await wg.wait();
  console.log('All workers completed');
}
```

### Semaphore

```typescript
import { Semaphore } from 'gosync';

// Create a semaphore with 3 permits (e.g., connection pool)
const sem = new Semaphore(3);

async function useResource(id: number) {
  await sem.acquire();
  try {
    console.log(`Resource ${id} acquired`);
    // Use the resource
    await new Promise(resolve => setTimeout(resolve, 100));
  } finally {
    sem.release();
    console.log(`Resource ${id} released`);
  }
}

// Try to acquire without blocking
if (sem.tryAcquire()) {
  try {
    // Got a permit
  } finally {
    sem.release();
  }
}
```

### Channel

```typescript
import { Channel } from 'gosync';

// Unbuffered channel (synchronous)
const ch1 = new Channel<number>();

// Buffered channel
const ch2 = new Channel<string>(5);

async function producer() {
  for (let i = 0; i < 5; i++) {
    await ch2.send(`message ${i}`);
  }
  ch2.close();
}

async function consumer() {
  try {
    while (true) {
      const message = await ch2.receive();
      console.log('Received:', message);
    }
  } catch (error) {
    // Channel closed
    console.log('Channel closed');
  }
}

// Non-blocking operations
const value = ch2.tryReceive(); // Returns value or undefined
const sent = ch2.trySend('test'); // Returns true if sent, false otherwise
```

### Cond (Condition Variable)

```typescript
import { Cond, Mutex } from 'gosync';

const mutex = new Mutex();
const cond = new Cond(mutex);
let ready = false;

async function waiter() {
  await mutex.lock();
  while (!ready) {
    await cond.wait(); // Automatically unlocks mutex and waits
  }
  console.log('Condition met!');
  mutex.unlock();
}

async function signaler() {
  await mutex.lock();
  ready = true;
  cond.signal(); // Wake up one waiter
  mutex.unlock();
}

// Use broadcast() to wake up all waiters
cond.broadcast();
```

## Advanced Patterns

### Producer-Consumer with Channel

```typescript
import { Channel, WaitGroup } from 'gosync';

const jobs = new Channel<number>(5);
const results = new Channel<number>(5);
const wg = new WaitGroup();

// Producer
async function producer() {
  for (let i = 1; i <= 10; i++) {
    await jobs.send(i);
  }
  jobs.close();
}

// Workers
async function worker(id: number) {
  try {
    while (true) {
      const job = await jobs.receive();
      const result = job * job; // Process job
      await results.send(result);
    }
  } catch {
    // Jobs channel closed
  }
  wg.done();
}

// Consumer
async function consumer() {
  const collected = [];
  try {
    while (true) {
      collected.push(await results.receive());
    }
  } catch {
    // Results channel closed
  }
  return collected;
}

async function main() {
  // Start workers
  wg.add(3);
  for (let i = 0; i < 3; i++) {
    worker(i);
  }
  
  // Start producer
  producer();
  
  // Wait for all jobs to be processed
  await wg.wait();
  results.close();
  
  const results = await consumer();
  console.log('Results:', results);
}
```

## API Reference

### Mutex
- `lock(): Promise<void>` - Acquire the lock
- `unlock(): void` - Release the lock
- `tryLock(): boolean` - Try to acquire lock without blocking
- `locked: boolean` - Check if currently locked

### RWMutex
- `lock(): Promise<void>` - Acquire write lock
- `unlock(): void` - Release write lock
- `rlock(): Promise<void>` - Acquire read lock
- `runlock(): void` - Release read lock
- `tryLock(): boolean` - Try to acquire write lock without blocking
- `tryRLock(): boolean` - Try to acquire read lock without blocking

### WaitGroup
- `add(delta: number): void` - Add to the counter
- `done(): void` - Decrement counter by 1
- `wait(): Promise<void>` - Wait until counter reaches 0
- `counter: number` - Current counter value

### Semaphore
- `acquire(): Promise<void>` - Acquire a permit
- `release(): void` - Release a permit
- `tryAcquire(): boolean` - Try to acquire without blocking
- `availablePermits: number` - Number of available permits
- `queueLength: number` - Number of waiting operations

### Channel<T>
- `send(value: T): Promise<void>` - Send a value
- `receive(): Promise<T>` - Receive a value
- `close(): void` - Close the channel
- `tryReceive(): T | undefined` - Try to receive without blocking
- `trySend(value: T): boolean` - Try to send without blocking
- `capacity: number` - Channel capacity
- `length: number` - Current buffer length
- `closed: boolean` - Whether channel is closed

### Cond
- `wait(): Promise<void>` - Wait for condition
- `signal(): void` - Wake up one waiter
- `broadcast(): void` - Wake up all waiters
- `waitersCount: number` - Number of waiting operations

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the library
bun run build

# Run in development mode
bun run dev
```

## Requirements

- Bun runtime (recommended) or Node.js 16+
- TypeScript 5+ (for TypeScript projects)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.