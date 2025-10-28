/**
 * Mutex provides mutual exclusion synchronization primitive
 */

export class Mutex {
	#locked = false;
	#waitQueue: Array<() => void> = [];

	/**
	 * Acquire the lock. If the lock is already held, wait until it's released.
	 */
	async lock(): Promise<void> {
		if (!this.#locked) {
			this.#locked = true;
			return;
		}

		return new Promise<void>((resolve) => {
			this.#waitQueue.push(resolve);
		});
	}

	/**
	 * Release the lock. If there are waiters, wake up the next one.
	 */
	unlock(): void {
		if (!this.#locked) {
			throw new Error("Mutex: unlock of unlocked mutex");
		}

		if (this.#waitQueue.length > 0) {
			const next = this.#waitQueue.shift();
			if (next) {
				// Keep the mutex locked for the next waiter
				next();
			}
		} else {
			this.#locked = false;
		}
	}

	/**
	 * Try to acquire the lock without waiting. Returns true if successful.
	 */
	tryLock(): boolean {
		if (this.#locked) {
			return false;
		}
		this.#locked = true;
		return true;
	}

	/**
	 * Check if the mutex is currently locked
	 */
	get locked(): boolean {
		return this.#locked;
	}
}
