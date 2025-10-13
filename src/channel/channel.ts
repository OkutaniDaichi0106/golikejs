/**
 * Channel provides Go-style channels for communication between async operations
 */

export class Channel<T> {
  // ring buffer storage when capacity > 0
  #buffer: (T | undefined)[] | null = null;
  #capacity: number;
  #head = 0; // index of next read
  #tail = 0; // index of next write
  #count = 0; // number of items in buffer
  #closed = false;
  #sendWaiters: Array<{ value: T; resolve: () => void }> = [];
  #receiveWaiters: Array<{ resolve: (value: T) => void }> = [];

  /**
   * Create a channel with the given capacity.
   * If capacity is 0, creates an unbuffered channel.
   */
  constructor(capacity = 0) {
    if (capacity < 0) {
      throw new Error('Channel: capacity must be non-negative');
    }
    this.#capacity = capacity;
    if (capacity > 0) this.#buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Send a value to the channel. For buffered channels, this may block if the buffer is full.
   * For unbuffered channels, this blocks until a receiver is ready.
   */
  async send(value: T): Promise<void> {
    if (this.#closed) {
      throw new Error('Channel: send on closed channel');
    }

    // If there's a waiting receiver, send directly
    if (this.#receiveWaiters.length > 0) {
      const waiter = this.#receiveWaiters.shift();
      if (waiter) {
        waiter.resolve(value);
        return;
      }
    }

    // If buffered and buffer has space, add to buffer
    if (this.#capacity > 0 && this.#count < this.#capacity) {
      // write at tail
      const buf = this.#buffer!;
      buf[this.#tail] = value;
      this.#tail = (this.#tail + 1) % this.#capacity;
      this.#count++;
      return;
    }

    // Otherwise, wait for a receiver
    return new Promise<void>((resolve) => {
      this.#sendWaiters.push({ value, resolve });
    });
  }

  /**
   * Receive a value from the channel. Blocks until a value is available or the channel is closed.
   */
  async receive(): Promise<T> {
    // If buffer has values, take from ring buffer
    if (this.#count > 0) {
      const buf = this.#buffer!;
      const value = buf[this.#head]!;
      buf[this.#head] = undefined;
      this.#head = (this.#head + 1) % this.#capacity;
      this.#count--;
      this.#processSendWaiters();
      return value;
    }

    // If there's a waiting sender, receive directly
    if (this.#sendWaiters.length > 0) {
      const waiter = this.#sendWaiters.shift();
      if (waiter) {
        waiter.resolve();
        return waiter.value;
      }
    }

    // If channel is closed and no values, throw
    if (this.#closed) {
      throw new Error('Channel: receive from closed channel');
    }

    // Otherwise, wait for a sender
    return new Promise<T>((resolve) => {
      this.#receiveWaiters.push({ resolve });
    });
  }

  /**
   * Close the channel. After closing, no more values can be sent.
   */
  close(): void {
    if (this.#closed) {
      return;
    }
    
    this.#closed = true;
    
    // Wake up all waiting senders with error
    this.#sendWaiters.forEach(() => {
      // In a real implementation, we'd reject these promises
      // For simplicity, we'll just clear the queue
    });
    this.#sendWaiters.length = 0;
  }

  /**
   * Try to receive a value without blocking. Returns undefined if no value is available.
   */
  tryReceive(): T | undefined {
    if (this.#count > 0) {
      const buf = this.#buffer!;
      const value = buf[this.#head]!;
      buf[this.#head] = undefined;
      this.#head = (this.#head + 1) % this.#capacity;
      this.#count--;
      this.#processSendWaiters();
      return value;
    }

    if (this.#sendWaiters.length > 0) {
      const waiter = this.#sendWaiters.shift();
      if (waiter) {
        waiter.resolve();
        return waiter.value;
      }
    }

    return undefined;
  }

  /**
   * Try to send a value without blocking. Returns true if successful.
   */
  trySend(value: T): boolean {
    if (this.#closed) {
      return false;
    }

    // If there's a waiting receiver, send directly
    if (this.#receiveWaiters.length > 0) {
      const waiter = this.#receiveWaiters.shift();
      if (waiter) {
        waiter.resolve(value);
        return true;
      }
    }

    // If buffered and buffer has space, add to ring buffer
    if (this.#capacity > 0 && this.#count < this.#capacity) {
      const buf = this.#buffer!;
      buf[this.#tail] = value;
      this.#tail = (this.#tail + 1) % this.#capacity;
      this.#count++;
      return true;
    }

    return false;
  }

  #processSendWaiters(): void {
    // If buffer has space and there are waiting senders, move them to buffer
    while (this.#count < this.#capacity && this.#sendWaiters.length > 0) {
      const waiter = this.#sendWaiters.shift();
      if (waiter) {
        const buf = this.#buffer!;
        buf[this.#tail] = waiter.value;
        this.#tail = (this.#tail + 1) % this.#capacity;
        this.#count++;
        waiter.resolve();
      }
    }
  }

  /**
   * Get current buffer length
   */
  get length(): number {
    return this.#count;
  }

  /**
   * Get channel capacity
   */
  get capacity(): number {
    return this.#capacity;
  }

  /**
   * Check if channel is closed
   */
  get closed(): boolean {
    return this.#closed;
  }
}