import { describe, it, expect, beforeEach } from "vitest";
import { Channel, select, receive, send, default_ } from "./channel.js";

describe("Channel", () => {
	it("should throw error for negative capacity", () => {
		expect(() => new Channel(-1)).toThrow("Channel: capacity must be non-negative");
	});

	describe("Unbuffered Channel", () => {
		let ch: Channel<number>;

		beforeEach(() => {
			ch = new Channel<number>(0);
		});

		it("should initialize correctly", () => {
			expect(ch.capacity).toBe(0);
			expect(ch.length).toBe(0);
			expect(ch.closed).toBe(false);
		});

		it("should handle synchronous send/receive", async () => {
			const promise = ch.receive();

			// Send should complete immediately since receiver is waiting
			await ch.send(42);

			const [value, ok] = await promise;
			expect(ok).toBe(true);
			expect(value).toBe(42);
		});

		it("should handle asynchronous send/receive", async () => {
			const sendPromise = ch.send(100);

			// Let send operation start waiting
			await new Promise((resolve) => setTimeout(resolve, 10));

			const [value, ok] = await ch.receive();
			expect(ok).toBe(true);
			expect(value).toBe(100);

			await sendPromise; // Should complete now
		});

		it("should handle tryReceive on empty channel", () => {
			const [value, ok] = ch.tryReceive();
			expect(ok).toBe(false);
			expect(value).toBeUndefined();
		});

		it("should handle trySend with waiting receiver", async () => {
			const promise = ch.receive();

			expect(ch.trySend(123)).toBe(true);

			const [value, ok] = await promise;
			expect(ok).toBe(true);
			expect(value).toBe(123);
		});

		it("should handle trySend without waiting receiver", () => {
			expect(ch.trySend(456)).toBe(false);
		});
	});

	describe("Buffered Channel", () => {
		let ch: Channel<string>;

		beforeEach(() => {
			ch = new Channel<string>(3);
		});

		it("should initialize correctly", () => {
			expect(ch.capacity).toBe(3);
			expect(ch.length).toBe(0);
			expect(ch.closed).toBe(false);
		});

		it("should handle buffered sends", async () => {
			await ch.send("a");
			await ch.send("b");
			await ch.send("c");

			expect(ch.length).toBe(3);

			// Fourth send should block
			const sendPromise = ch.send("d");

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(ch.length).toBe(3); // Still full

			// Receive one to make space
			const [value, ok] = await ch.receive();
			expect(ok).toBe(true);
			expect(value).toBe("a");
			expect(ch.length).toBe(3); // 'd' should have been added

			await sendPromise; // Should complete
		});

		it("should handle buffered receives", async () => {
			await ch.send("x");
			await ch.send("y");

			const [value1, ok1] = await ch.receive();
			const [value2, ok2] = await ch.receive();

			expect(ok1).toBe(true);
			expect(value1).toBe("x");
			expect(ok2).toBe(true);
			expect(value2).toBe("y");
			expect(ch.length).toBe(0);
		});

		it("should handle tryReceive with buffered values", async () => {
			await ch.send("test");

			const [value, ok] = ch.tryReceive();
			expect(ok).toBe(true);
			expect(value).toBe("test");

			const [value2, ok2] = ch.tryReceive();
			expect(ok2).toBe(false);
			expect(value2).toBeUndefined();
		});

		it("should handle trySend with buffer space", () => {
			expect(ch.trySend("1")).toBe(true);
			expect(ch.trySend("2")).toBe(true);
			expect(ch.trySend("3")).toBe(true);
			expect(ch.trySend("4")).toBe(false); // Buffer full

			expect(ch.length).toBe(3);
		});
	});

	describe("Channel Closing", () => {
		let ch: Channel<number>;

		beforeEach(() => {
			ch = new Channel<number>(1);
		});

		it("should close correctly", () => {
			ch.close();
			expect(ch.closed).toBe(true);
		});

		it("should throw error on send to closed channel", () => {
			ch.close();
			expect(ch.send(1)).rejects.toThrow("Channel: send on closed channel");
		});

		it("should return closed signal on receive from closed empty channel", async () => {
			ch.close();
			const [value, ok] = await ch.receive();
			expect(ok).toBe(false);
			expect(value).toBeUndefined();
		});

		it("should receive remaining buffered values after close", async () => {
			await ch.send(99);
			ch.close();

			const [value, ok] = await ch.receive();
			expect(ok).toBe(true);
			expect(value).toBe(99);

			// Now should return closed signal
			const [value2, ok2] = await ch.receive();
			expect(ok2).toBe(false);
			expect(value2).toBeUndefined();
		});

		it("should handle trySend on closed channel", () => {
			ch.close();
			expect(ch.trySend(1)).toBe(false);
		});

		it("should handle multiple closes", () => {
			ch.close();
			ch.close(); // Should not throw
			expect(ch.closed).toBe(true);
		});
	});

	describe("Channel Patterns", () => {
		it("should handle fan-out pattern", async () => {
			const input = new Channel<number>(5); // Larger buffer to avoid blocking
			const output1 = new Channel<number>(5);
			const output2 = new Channel<number>(5);

			// Send values first
			await input.send(1);
			await input.send(2);
			await input.send(3);
			await input.send(4);

			// Fan-out operation - process all available values
			const values: number[] = [];
			for (let i = 0; i < 4; i++) {
				const [value, ok] = await input.receive();
				if (ok) {
					values.push(value);
				}
			}

			// Route values
			for (const value of values) {
				if (value % 2 === 1) {
					// Route odd numbers to output1
					await output1.send(value);
				} else {
					// Route even numbers to output2
					await output2.send(value);
				}
			}

			// Receive from outputs
			const [r1_1, ok1_1] = await output1.receive();
			const [r1_2, ok1_2] = await output1.receive();
			const results1 = ok1_1 && ok1_2 ? [r1_1, r1_2] : [];

			const [r2_1, ok2_1] = await output2.receive();
			const [r2_2, ok2_2] = await output2.receive();
			const results2 = ok2_1 && ok2_2 ? [r2_1, r2_2] : [];

			expect(results1.sort()).toEqual([1, 3]);
			expect(results2.sort()).toEqual([2, 4]);
		});

		it("should handle worker pool pattern", async () => {
			const jobs = new Channel<number>(5);
			const results = new Channel<number>(5);
			const numWorkers = 3;

			// Start workers
			const workers = Array.from({ length: numWorkers }, (_, id) =>
				(async () => {
					try {
						while (true) {
							const [job, ok] = await jobs.receive();
							if (!ok) break; // Channel closed
							// Simulate processing
							await new Promise((resolve) => setTimeout(resolve, 10));
							await results.send(job * 2);
						}
					} catch {
						// Channel closed
					}
				})()
			);

			// Send jobs
			for (let i = 1; i <= 5; i++) {
				await jobs.send(i);
			}

			// Collect results
			const collectedResults: number[] = [];
			for (let i = 0; i < 5; i++) {
				const [result, ok] = await results.receive();
				if (ok) {
					collectedResults.push(result);
				}
			}

			jobs.close();

			collectedResults.sort((a, b) => a - b);
			expect(collectedResults).toEqual([2, 4, 6, 8, 10]);
		});
	});

	describe("Channel used as semaphore (prefilled tokens)", () => {
		it("limits concurrent workers to capacity", async () => {
			const capacity = 4;
			const ch = new Channel<number>(capacity);

			// pre-fill tokens
			for (let i = 0; i < capacity; i++) {
				await ch.send(1);
			}

			let concurrent = 0;
			let maxConcurrent = 0;

			const worker = async () => {
				const [token, ok] = await ch.receive(); // acquire
				if (!ok) return;
				concurrent++;
				maxConcurrent = Math.max(maxConcurrent, concurrent);

				// simulate work
				await new Promise((res) => setTimeout(res, 5 + Math.floor(Math.random() * 10)));

				concurrent--;
				await ch.send(1); // release
			};

			const tasks: Promise<void>[] = [];
			for (let i = 0; i < 15; i++) tasks.push(worker());

			await Promise.all(tasks);

			expect(maxConcurrent).toBeLessThanOrEqual(capacity);
		});

		it("tryReceive behaves as tryAcquire", async () => {
			const ch = new Channel<number>(1);
			await ch.send(1);

			const [got, ok] = ch.tryReceive();
			expect(ok).toBe(true);
			expect(got).toBe(1);

			const [got2, ok2] = ch.tryReceive();
			expect(ok2).toBe(false);
			expect(got2).toBeUndefined();
		});

		it("works with buffered channel as mutex (capacity=1)", async () => {
			const ch = new Channel<number>(1); // buffered mutex-like

			let inCs = 0;
			let maxInCs = 0;

			const worker = async () => {
				const [token, ok] = await ch.receive();
				if (!ok) return;
				inCs++;
				maxInCs = Math.max(maxInCs, inCs);
				await new Promise((r) => setTimeout(r, 5));
				inCs--;
				await ch.send(1);
			};

			// prefill one token so the channel acts as a mutex
			await ch.send(1);

			const tasks = Array.from({ length: 10 }, () => worker());
			await Promise.all(tasks);

			expect(maxInCs).toBeGreaterThan(0);
			expect(maxInCs).toBeLessThanOrEqual(1); // buffered capacity=1 acts like mutex
		});
	});

	describe("select function", () => {
		it("should select from multiple receive operations", async () => {
			const ch1 = new Channel<number>();
			const ch2 = new Channel<number>();

			let receivedValue: number | undefined;
			let receivedFrom: string | undefined;

			// Send to ch1 first
			setTimeout(() => ch1.send(42), 10);

			await select([
				{
					channel: ch1,
					action: (value, ok) => {
						receivedValue = value;
						receivedFrom = "ch1";
					},
				},
				{
					channel: ch2,
					action: (value, ok) => {
						receivedValue = value;
						receivedFrom = "ch2";
					},
				},
			]);

			expect(receivedFrom).toBe("ch1");
			expect(receivedValue).toBe(42);
		});

		it("should select from multiple send operations", async () => {
			const ch1 = new Channel<number>();
			const ch2 = new Channel<number>();

			let sentTo: string | undefined;

			// Start receivers
			setTimeout(async () => {
				await ch1.receive();
				await ch2.receive();
			}, 10);

			await select([
				{
					channel: ch1,
					value: 100,
					action: () => {
						sentTo = "ch1";
					},
				},
				{
					channel: ch2,
					value: 200,
					action: () => {
						sentTo = "ch2";
					},
				},
			]);

			expect(sentTo).toBe("ch1");
		});

		it("should execute default case when no operations are ready", async () => {
			const ch1 = new Channel<number>();
			const ch2 = new Channel<number>();

			let defaultExecuted = false;

			await select([
				{ channel: ch1, action: () => {} },
				{ channel: ch2, action: () => {} },
				{
					default: () => {
						defaultExecuted = true;
					},
				},
			]);

			expect(defaultExecuted).toBe(true);
		});

		it("should not execute default when operations are ready", async () => {
			const bufferedCh = new Channel<number>(1);

			// Pre-fill buffered channel
			await bufferedCh.send(42);

			let defaultExecuted = false;
			let receivedValue: number | undefined;

			await select([
				{
					channel: bufferedCh,
					action: (value, ok) => {
						receivedValue = value;
					},
				},
				{
					default: () => {
						defaultExecuted = true;
					},
				},
			]);

			expect(defaultExecuted).toBe(false);
			expect(receivedValue).toBe(42);
		});

		it("should handle mixed receive and send operations", async () => {
			const ch1 = new Channel<number>();
			const ch2 = new Channel<number>();

			let operation: string | undefined;

			// Start a receiver for ch2
			setTimeout(async () => {
				await ch2.receive();
			}, 5);

			await select([
				{
					channel: ch1,
					action: () => {
						operation = "receive";
					},
				},
				{
					channel: ch2,
					value: 300,
					action: () => {
						operation = "send";
					},
				},
			]);

			expect(operation).toBe("send");
		});

		it("should throw error when no cases provided", async () => {
			await expect(select([])).rejects.toThrow("select: no cases provided");
		});
	});

	describe("select helper functions", () => {
		it("should work with receive helper", async () => {
			const ch = new Channel<number>();

			let receivedValue: number | undefined;
			setTimeout(() => ch.send(42), 10);

			await select([
				receive(ch).then((value, ok) => {
					receivedValue = value;
				}),
			]);

			expect(receivedValue).toBe(42);
		});

		it("should work with send helper", async () => {
			const ch = new Channel<number>();

			let sent = false;
			setTimeout(async () => {
				await ch.receive();
			}, 10);

			await select([
				send(ch, 100).then(() => {
					sent = true;
				}),
			]);

			expect(sent).toBe(true);
		});

		it("should work with default helper", async () => {
			const ch = new Channel<number>();

			let defaultExecuted = false;

			await select([
				receive(ch).then(() => {}),
				default_(() => {
					defaultExecuted = true;
				}),
			]);

			expect(defaultExecuted).toBe(true);
		});

		it("should work with mixed helpers", async () => {
			const ch1 = new Channel<number>(1); // buffered channel
			const ch2 = new Channel<number>();

			let result: string | undefined;

			// Pre-fill buffered channel
			await ch1.send(42);

			await select([
				receive(ch1).then((value, ok) => {
					result = `received: ${value}`;
				}),
				receive(ch2).then((value, ok) => {
					result = `received from ch2: ${value}`;
				}),
				send(ch2, 100).then(() => {
					result = "sent";
				}),
				default_(() => {
					result = "default";
				}),
			]);

			expect(result).toBe("received: 42");
		});
	});
});
