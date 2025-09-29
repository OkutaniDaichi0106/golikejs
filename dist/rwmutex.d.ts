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
export declare class RWMutex implements RWMutexInterface {
    private _writeLocked;
    private _readCount;
    private _writeWaitQueue;
    private _readWaitQueue;
    /**
     * Acquire the write lock. Blocks until no readers or writers are active.
     */
    lock(): Promise<void>;
    /**
     * Release the write lock.
     */
    unlock(): void;
    /**
     * Acquire a read lock. Multiple readers can hold the lock simultaneously.
     */
    rlock(): Promise<void>;
    /**
     * Release a read lock.
     */
    runlock(): void;
    /**
     * Try to acquire the write lock without waiting.
     */
    tryLock(): boolean;
    /**
     * Try to acquire a read lock without waiting.
     */
    tryRLock(): boolean;
    private _processWaitQueue;
    /**
     * Get current read count
     */
    get readCount(): number;
    /**
     * Check if write locked
     */
    get writeLocked(): boolean;
}
//# sourceMappingURL=rwmutex.d.ts.map