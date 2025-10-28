/**
 * Semaphore provides counting semaphore synchronization primitive
 */

export class Semaphore {
	#permits: number;
	#waitQueue: Array<() => void> = [];

	/**
	 * Create a semaphore with the given number of permits
	 */
	constructor(permits: number) {
		if (permits < 0) {
			throw new Error('Semaphore: permits must be non-negative');
		}
		this.#permits = permits;
	}

	/**
	 * Acquire a permit. If no permits are available, wait until one is released.
	 */
	async acquire(): Promise<void> {
		if (this.#permits > 0) {
			this.#permits--;
			return;
		}

		return new Promise<void>((resolve) => {
			this.#waitQueue.push(resolve);
		});
	}

	/**
	 * Release a permit, potentially waking up a waiter.
	 */
	release(): void {
		if (this.#waitQueue.length > 0) {
			const next = this.#waitQueue.shift();
			if (next) {
				next();
			}
		} else {
			this.#permits++;
		}
	}

	/**
	 * Try to acquire a permit without waiting. Returns true if successful.
	 */
	tryAcquire(): boolean {
		if (this.#permits > 0) {
			this.#permits--;
			return true;
		}
		return false;
	}

	/**
	 * Get available permits count
	 */
	get availablePermits(): number {
		return this.#permits;
	}

	/**
	 * Get number of threads waiting
	 */
	get queueLength(): number {
		return this.#waitQueue.length;
	}
}
