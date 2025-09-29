/**
 * Channel provides Go-style channels for communication between async operations
 */
export declare class Channel<T> {
    #private;
    /**
     * Create a channel with the given capacity.
     * If capacity is 0, creates an unbuffered channel.
     */
    constructor(capacity?: number);
    /**
     * Send a value to the channel. For buffered channels, this may block if the buffer is full.
     * For unbuffered channels, this blocks until a receiver is ready.
     */
    send(value: T): Promise<void>;
    /**
     * Receive a value from the channel. Blocks until a value is available or the channel is closed.
     */
    receive(): Promise<T>;
    /**
     * Close the channel. After closing, no more values can be sent.
     */
    close(): void;
    /**
     * Try to receive a value without blocking. Returns undefined if no value is available.
     */
    tryReceive(): T | undefined;
    /**
     * Try to send a value without blocking. Returns true if successful.
     */
    trySend(value: T): boolean;
    /**
     * Get current buffer length
     */
    get length(): number;
    /**
     * Get channel capacity
     */
    get capacity(): number;
    /**
     * Check if channel is closed
     */
    get closed(): boolean;
}
//# sourceMappingURL=channel.d.ts.map