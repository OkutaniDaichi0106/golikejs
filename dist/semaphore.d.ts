/**
 * Semaphore provides counting semaphore synchronization primitive
 */
export interface SemaphoreInterface {
    acquire(): Promise<void>;
    release(): void;
    tryAcquire(): boolean;
}
export declare class Semaphore implements SemaphoreInterface {
    #private;
    /**
     * Create a semaphore with the given number of permits
     */
    constructor(permits: number);
    /**
     * Acquire a permit. If no permits are available, wait until one is released.
     */
    acquire(): Promise<void>;
    /**
     * Release a permit, potentially waking up a waiter.
     */
    release(): void;
    /**
     * Try to acquire a permit without waiting. Returns true if successful.
     */
    tryAcquire(): boolean;
    /**
     * Get available permits count
     */
    get availablePermits(): number;
    /**
     * Get number of threads waiting
     */
    get queueLength(): number;
}
//# sourceMappingURL=semaphore.d.ts.map