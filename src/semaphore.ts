/**
 * Semaphore provides counting semaphore synchronization primitive
 */

export interface SemaphoreInterface {
  acquire(): Promise<void>;
  release(): void;
  tryAcquire(): boolean;
}

export class Semaphore implements SemaphoreInterface {
  private _permits: number;
  private _waitQueue: Array<() => void> = [];

  /**
   * Create a semaphore with the given number of permits
   */
  constructor(permits: number) {
    if (permits < 0) {
      throw new Error('Semaphore: permits must be non-negative');
    }
    this._permits = permits;
  }

  /**
   * Acquire a permit. If no permits are available, wait until one is released.
   */
  async acquire(): Promise<void> {
    if (this._permits > 0) {
      this._permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this._waitQueue.push(resolve);
    });
  }

  /**
   * Release a permit, potentially waking up a waiter.
   */
  release(): void {
    if (this._waitQueue.length > 0) {
      const next = this._waitQueue.shift();
      if (next) {
        next();
      }
    } else {
      this._permits++;
    }
  }

  /**
   * Try to acquire a permit without waiting. Returns true if successful.
   */
  tryAcquire(): boolean {
    if (this._permits > 0) {
      this._permits--;
      return true;
    }
    return false;
  }

  /**
   * Get available permits count
   */
  get availablePermits(): number {
    return this._permits;
  }

  /**
   * Get number of threads waiting
   */
  get queueLength(): number {
    return this._waitQueue.length;
  }
}