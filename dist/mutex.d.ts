/**
 * Mutex provides mutual exclusion synchronization primitive
 */
export declare class Mutex {
    #private;
    /**
     * Acquire the lock. If the lock is already held, wait until it's released.
     */
    lock(): Promise<void>;
    /**
     * Release the lock. If there are waiters, wake up the next one.
     */
    unlock(): void;
    /**
     * Try to acquire the lock without waiting. Returns true if successful.
     */
    tryLock(): boolean;
    /**
     * Check if the mutex is currently locked
     */
    get locked(): boolean;
}
//# sourceMappingURL=mutex.d.ts.map