/**
 * Mutex provides mutual exclusion synchronization primitive
 */

export interface MutexInterface {
  lock(): Promise<void>;
  unlock(): void;
  tryLock(): boolean;
}

export class Mutex implements MutexInterface {
  private _locked = false;
  private _waitQueue: Array<() => void> = [];

  /**
   * Acquire the lock. If the lock is already held, wait until it's released.
   */
  async lock(): Promise<void> {
    if (!this._locked) {
      this._locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this._waitQueue.push(resolve);
    });
  }

  /**
   * Release the lock. If there are waiters, wake up the next one.
   */
  unlock(): void {
    if (!this._locked) {
      throw new Error('Mutex: unlock of unlocked mutex');
    }

    if (this._waitQueue.length > 0) {
      const next = this._waitQueue.shift();
      if (next) {
        // Keep the mutex locked for the next waiter
        next();
      }
    } else {
      this._locked = false;
    }
  }

  /**
   * Try to acquire the lock without waiting. Returns true if successful.
   */
  tryLock(): boolean {
    if (this._locked) {
      return false;
    }
    this._locked = true;
    return true;
  }

  /**
   * Check if the mutex is currently locked
   */
  get locked(): boolean {
    return this._locked;
  }
}