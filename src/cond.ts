/**
 * Cond implements condition variables for coordinating access to shared resources
 */

import type { MutexInterface } from './mutex.js';

export interface CondInterface {
  wait(): Promise<void>;
  signal(): void;
  broadcast(): void;
}

export class Cond implements CondInterface {
  private _mutex: MutexInterface;
  private _waiters: Array<() => void> = [];

  /**
   * Create a new condition variable associated with the given mutex
   */
  constructor(mutex: MutexInterface) {
    this._mutex = mutex;
  }

  /**
   * Wait atomically unlocks the mutex and suspends execution until awakened by Signal or Broadcast.
   * When wait returns, the mutex is locked again.
   */
  async wait(): Promise<void> {
    // Unlock the mutex before waiting
    this._mutex.unlock();

    // Wait for a signal
    await new Promise<void>((resolve) => {
      this._waiters.push(resolve);
    });

    // Reacquire the mutex before returning
    await this._mutex.lock();
  }

  /**
   * Signal wakes one waiting goroutine, if any.
   * The caller must hold the mutex when calling Signal.
   */
  signal(): void {
    if (this._waiters.length > 0) {
      const waiter = this._waiters.shift();
      if (waiter) {
        // Use setTimeout to avoid immediate execution
        setTimeout(waiter, 0);
      }
    }
  }

  /**
   * Broadcast wakes all waiting goroutines, if any.
   * The caller must hold the mutex when calling Broadcast.
   */
  broadcast(): void {
    if (this._waiters.length > 0) {
      const waiters = this._waiters.splice(0);
      waiters.forEach(waiter => {
        // Use setTimeout to avoid immediate execution
        setTimeout(waiter, 0);
      });
    }
  }

  /**
   * Get number of waiting operations
   */
  get waitersCount(): number {
    return this._waiters.length;
  }
}