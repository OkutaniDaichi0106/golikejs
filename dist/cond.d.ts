/**
 * Cond implements condition variables for coordinating access to shared resources
 */
import { Mutex } from './mutex.js';
export declare class Cond {
    #private;
    /**
     * Create a new condition variable associated with the given mutex
     */
    constructor(mutex: Mutex);
    /**
     * Wait atomically unlocks the mutex and suspends execution until awakened by Signal or Broadcast.
     * When wait returns, the mutex is locked again.
     */
    wait(): Promise<void>;
    /**
     * Signal wakes one waiting goroutine, if any.
     * The caller must hold the mutex when calling Signal.
     */
    signal(): void;
    /**
     * Broadcast wakes all waiting goroutines, if any.
     * The caller must hold the mutex when calling Broadcast.
     */
    broadcast(): void;
    /**
     * Get number of waiting operations
     */
    get waitersCount(): number;
}
//# sourceMappingURL=cond.d.ts.map