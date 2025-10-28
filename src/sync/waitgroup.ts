/**
 * WaitGroup waits for a collection of operations to finish
 */

export class WaitGroup {
	#counter = 0;
	#waiters: Array<() => void> = [];

	/**
	 * Add delta to the WaitGroup counter.
	 * If the counter becomes zero, all waiting operations are released.
	 * If the counter goes negative, throws an error.
	 */
	add(delta: number): void {
		this.#counter += delta;

		if (this.#counter < 0) {
			throw new Error("WaitGroup: negative counter");
		}

		if (this.#counter === 0) {
			// Wake up all waiters
			const waiters = this.#waiters.splice(0);
			waiters.forEach((waiter) => waiter());
		}
	}

	/**
	 * Decrements the WaitGroup counter by one.
	 * Equivalent to add(-1).
	 */
	done(): void {
		this.add(-1);
	}

	/**
	 * Blocks until the WaitGroup counter is zero.
	 */
	async wait(): Promise<void> {
		if (this.#counter === 0) {
			return;
		}

		return new Promise<void>((resolve) => {
			this.#waiters.push(resolve);
		});
	}

	/**
	 * Execute an async function and automatically manage the counter.
	 * Equivalent to add(1) followed by executing the function and calling done() when it completes.
	 */
	async go(fn: () => Promise<void> | void): Promise<void> {
		this.add(1);

		try {
			await fn();
		} finally {
			this.done();
		}
	}

	/**
	 * Get current counter value
	 */
	get counter(): number {
		return this.#counter;
	}
}
