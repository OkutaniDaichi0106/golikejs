/**
 * WaitGroup waits for a collection of operations to finish
 */
export declare class WaitGroup {
    #private;
    /**
     * Add delta to the WaitGroup counter.
     * If the counter becomes zero, all waiting operations are released.
     * If the counter goes negative, throws an error.
     */
    add(delta: number): void;
    /**
     * Decrements the WaitGroup counter by one.
     * Equivalent to add(-1).
     */
    done(): void;
    /**
     * Blocks until the WaitGroup counter is zero.
     */
    wait(): Promise<void>;
    /**
     * Get current counter value
     */
    get counter(): number;
}
//# sourceMappingURL=waitgroup.d.ts.map