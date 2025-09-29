/**
 * RWMutex provides read-write mutual exclusion synchronization primitive
 */

export interface RWMutexInterface {
  lock(): Promise<void>;
  unlock(): void;
  rlock(): Promise<void>;
  runlock(): void;
  tryLock(): boolean;
  tryRLock(): boolean;
}

export class RWMutex implements RWMutexInterface {
  #writeLocked = false;
  #readCount = 0;
  #writeWaitQueue: Array<() => void> = [];
  #readWaitQueue: Array<() => void> = [];

  /**
   * Acquire the write lock. Blocks until no readers or writers are active.
   */
  async lock(): Promise<void> {
    if (!this.#writeLocked && this.#readCount === 0) {
      this.#writeLocked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.#writeWaitQueue.push(resolve);
    });
  }

  /**
   * Release the write lock.
   */
  unlock(): void {
    if (!this.#writeLocked) {
      throw new Error('RWMutex: unlock of unlocked write mutex');
    }

    this.#writeLocked = false;
    this.#processWaitQueue();
  }

  /**
   * Acquire a read lock. Multiple readers can hold the lock simultaneously.
   */
  async rlock(): Promise<void> {
    if (!this.#writeLocked && this.#writeWaitQueue.length === 0) {
      this.#readCount++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.#readWaitQueue.push(() => {
        this.#readCount++;
        resolve();
      });
    });
  }

  /**
   * Release a read lock.
   */
  runlock(): void {
    if (this.#readCount === 0) {
      throw new Error('RWMutex: runlock of unlocked read mutex');
    }

    this.#readCount--;
    if (this.#readCount === 0) {
      this.#processWaitQueue();
    }
  }

  /**
   * Try to acquire the write lock without waiting.
   */
  tryLock(): boolean {
    if (this.#writeLocked || this.#readCount > 0) {
      return false;
    }
    this.#writeLocked = true;
    return true;
  }

  /**
   * Try to acquire a read lock without waiting.
   */
  tryRLock(): boolean {
    if (this.#writeLocked || this.#writeWaitQueue.length > 0) {
      return false;
    }
    this.#readCount++;
    return true;
  }

  #processWaitQueue(): void {
    // Prioritize writers over readers for fairness
    if (this.#writeWaitQueue.length > 0 && this.#readCount === 0) {
      const next = this.#writeWaitQueue.shift();
      if (next) {
        this.#writeLocked = true;
        next();
      }
    } else if (this.#readWaitQueue.length > 0 && !this.#writeLocked) {
      // Wake up all waiting readers
      const readers = this.#readWaitQueue.splice(0);
      readers.forEach(reader => reader());
    }
  }

  /**
   * Get current read count
   */
  get readCount(): number {
    return this.#readCount;
  }

  /**
   * Check if write locked
   */
  get writeLocked(): boolean {
    return this.#writeLocked;
  }
}