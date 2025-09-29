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
  private _writeLocked = false;
  private _readCount = 0;
  private _writeWaitQueue: Array<() => void> = [];
  private _readWaitQueue: Array<() => void> = [];

  /**
   * Acquire the write lock. Blocks until no readers or writers are active.
   */
  async lock(): Promise<void> {
    if (!this._writeLocked && this._readCount === 0) {
      this._writeLocked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this._writeWaitQueue.push(resolve);
    });
  }

  /**
   * Release the write lock.
   */
  unlock(): void {
    if (!this._writeLocked) {
      throw new Error('RWMutex: unlock of unlocked write mutex');
    }

    this._writeLocked = false;
    this._processWaitQueue();
  }

  /**
   * Acquire a read lock. Multiple readers can hold the lock simultaneously.
   */
  async rlock(): Promise<void> {
    if (!this._writeLocked && this._writeWaitQueue.length === 0) {
      this._readCount++;
      return;
    }

    return new Promise<void>((resolve) => {
      this._readWaitQueue.push(() => {
        this._readCount++;
        resolve();
      });
    });
  }

  /**
   * Release a read lock.
   */
  runlock(): void {
    if (this._readCount === 0) {
      throw new Error('RWMutex: runlock of unlocked read mutex');
    }

    this._readCount--;
    if (this._readCount === 0) {
      this._processWaitQueue();
    }
  }

  /**
   * Try to acquire the write lock without waiting.
   */
  tryLock(): boolean {
    if (this._writeLocked || this._readCount > 0) {
      return false;
    }
    this._writeLocked = true;
    return true;
  }

  /**
   * Try to acquire a read lock without waiting.
   */
  tryRLock(): boolean {
    if (this._writeLocked || this._writeWaitQueue.length > 0) {
      return false;
    }
    this._readCount++;
    return true;
  }

  private _processWaitQueue(): void {
    // Prioritize writers over readers for fairness
    if (this._writeWaitQueue.length > 0 && this._readCount === 0) {
      const next = this._writeWaitQueue.shift();
      if (next) {
        this._writeLocked = true;
        next();
      }
    } else if (this._readWaitQueue.length > 0 && !this._writeLocked) {
      // Wake up all waiting readers
      const readers = this._readWaitQueue.splice(0);
      readers.forEach(reader => reader());
    }
  }

  /**
   * Get current read count
   */
  get readCount(): number {
    return this._readCount;
  }

  /**
   * Check if write locked
   */
  get writeLocked(): boolean {
    return this._writeLocked;
  }
}