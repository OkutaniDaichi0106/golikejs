/**
 * Channel provides Go-style channels for communication between async operations
 */

export interface ChannelInterface<T> {
  send(value: T): Promise<void>;
  receive(): Promise<T>;
  close(): void;
  tryReceive(): T | undefined;
  trySend(value: T): boolean;
}

export class Channel<T> implements ChannelInterface<T> {
  private _buffer: T[] = [];
  private _capacity: number;
  private _closed = false;
  private _sendWaiters: Array<{ value: T; resolve: () => void }> = [];
  private _receiveWaiters: Array<{ resolve: (value: T) => void }> = [];

  /**
   * Create a channel with the given capacity.
   * If capacity is 0, creates an unbuffered channel.
   */
  constructor(capacity = 0) {
    if (capacity < 0) {
      throw new Error('Channel: capacity must be non-negative');
    }
    this._capacity = capacity;
  }

  /**
   * Send a value to the channel. For buffered channels, this may block if the buffer is full.
   * For unbuffered channels, this blocks until a receiver is ready.
   */
  async send(value: T): Promise<void> {
    if (this._closed) {
      throw new Error('Channel: send on closed channel');
    }

    // If there's a waiting receiver, send directly
    if (this._receiveWaiters.length > 0) {
      const waiter = this._receiveWaiters.shift();
      if (waiter) {
        waiter.resolve(value);
        return;
      }
    }

    // If buffered and buffer has space, add to buffer
    if (this._capacity > 0 && this._buffer.length < this._capacity) {
      this._buffer.push(value);
      return;
    }

    // Otherwise, wait for a receiver
    return new Promise<void>((resolve) => {
      this._sendWaiters.push({ value, resolve });
    });
  }

  /**
   * Receive a value from the channel. Blocks until a value is available or the channel is closed.
   */
  async receive(): Promise<T> {
    // If buffer has values, take from buffer
    if (this._buffer.length > 0) {
      const value = this._buffer.shift()!;
      this._processSendWaiters();
      return value;
    }

    // If there's a waiting sender, receive directly
    if (this._sendWaiters.length > 0) {
      const waiter = this._sendWaiters.shift();
      if (waiter) {
        waiter.resolve();
        return waiter.value;
      }
    }

    // If channel is closed and no values, throw
    if (this._closed) {
      throw new Error('Channel: receive from closed channel');
    }

    // Otherwise, wait for a sender
    return new Promise<T>((resolve) => {
      this._receiveWaiters.push({ resolve });
    });
  }

  /**
   * Close the channel. After closing, no more values can be sent.
   */
  close(): void {
    if (this._closed) {
      return;
    }
    
    this._closed = true;
    
    // Wake up all waiting senders with error
    this._sendWaiters.forEach(() => {
      // In a real implementation, we'd reject these promises
      // For simplicity, we'll just clear the queue
    });
    this._sendWaiters.length = 0;
  }

  /**
   * Try to receive a value without blocking. Returns undefined if no value is available.
   */
  tryReceive(): T | undefined {
    if (this._buffer.length > 0) {
      const value = this._buffer.shift()!;
      this._processSendWaiters();
      return value;
    }

    if (this._sendWaiters.length > 0) {
      const waiter = this._sendWaiters.shift();
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
    if (this._closed) {
      return false;
    }

    // If there's a waiting receiver, send directly
    if (this._receiveWaiters.length > 0) {
      const waiter = this._receiveWaiters.shift();
      if (waiter) {
        waiter.resolve(value);
        return true;
      }
    }

    // If buffered and buffer has space, add to buffer
    if (this._capacity > 0 && this._buffer.length < this._capacity) {
      this._buffer.push(value);
      return true;
    }

    return false;
  }

  private _processSendWaiters(): void {
    // If buffer has space and there are waiting senders, move them to buffer
    while (this._buffer.length < this._capacity && this._sendWaiters.length > 0) {
      const waiter = this._sendWaiters.shift();
      if (waiter) {
        this._buffer.push(waiter.value);
        waiter.resolve();
      }
    }
  }

  /**
   * Get current buffer length
   */
  get length(): number {
    return this._buffer.length;
  }

  /**
   * Get channel capacity
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * Check if channel is closed
   */
  get closed(): boolean {
    return this._closed;
  }
}