#!/usr/bin/env -S deno run --allow-write

/**
 * Simple manual test to verify the slog package works correctly.
 * This doesn't require external dependencies.
 */

import { ConsoleHandler, FileHandler, JSONFormatter, Level, Logger, TextFormatter } from "./mod.ts";

console.log("=== Testing slog package ===\n");

// Test 1: Console logging with JSON formatter
console.log("Test 1: JSON formatting");
const jsonLogger = new Logger(
	new ConsoleHandler({ level: Level.Debug, formatter: new JSONFormatter() }),
);
jsonLogger.debug("Debug message", { context: "test" });
jsonLogger.info("Info message", ["user", 123], ["status", "active"]);
jsonLogger.warn("Warning message", { code: 404 });
jsonLogger.error("Error message", new Error("Something went wrong"));
console.log("");

// Test 2: Console logging with Text formatter
console.log("Test 2: Text formatting");
const textLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new TextFormatter() }),
);
textLogger.debug("This should be filtered out");
textLogger.info("Info message", { service: "api", port: 8080 });
textLogger.warn("Warning", { retry: true });
console.log("");

// Test 3: Context propagation with with()
console.log("Test 3: Context propagation");
const baseLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);
const reqLogger = baseLogger.with({ requestId: "req-123", userId: "user-456" });
reqLogger.info("Request started");
reqLogger.info("Processing", { endpoint: "/api/users" });
console.log("");

// Test 4: Group prefixes
console.log("Test 4: Group prefixes");
const appLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);
const dbLogger = appLogger.withGroup("database");
dbLogger.info("Query executed", { table: "users", rows: 42, duration: 123 });
const cacheLogger = appLogger.withGroup("cache");
cacheLogger.info("Cache hit", { key: "user:123" });
console.log("");

// Test 5: Nested groups and context
console.log("Test 5: Nested groups and context");
const rootLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);
const serviceLogger = rootLogger.withGroup("service").with({ name: "api" });
const dbGroup = serviceLogger.withGroup("db");
dbGroup.info("Connected", { host: "localhost", port: 5432 });
console.log("");

// Test 6: File logging
console.log("Test 6: File logging");
const tempFile = await Deno.makeTempFile();
console.log(`Writing logs to: ${tempFile}`);
const fileLogger = new Logger(
	new FileHandler(tempFile, { level: Level.Info, formatter: new JSONFormatter() }),
);
await fileLogger.info("First log entry", { id: 1 });
await fileLogger.info("Second log entry", { id: 2 });
await fileLogger.error("Error entry", { id: 3 }, new Error("Test error"));

// Wait a bit for async writes
await new Promise((resolve) => setTimeout(resolve, 100));

const fileContent = await Deno.readTextFile(tempFile);
console.log("File contents:");
console.log(fileContent);

await Deno.remove(tempFile);
console.log("");

// Test 7: Different value types
console.log("Test 7: Different value types");
const typeLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new TextFormatter() }),
);
typeLogger.info("Testing types", {
	string: "hello",
	number: 42,
	boolean: true,
	nullValue: null,
	date: new Date("2024-01-01T00:00:00.000Z"),
	array: [1, 2, 3],
	object: { nested: "value" },
});
console.log("");

console.log("=== All tests completed successfully! ===");
