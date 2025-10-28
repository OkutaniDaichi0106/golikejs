import { assert } from "@std/assert";
import * as golikejs from "./mod.ts";

Deno.test("golikejs main module - should export all submodules", () => {
	assert(golikejs.sync !== undefined);
	assert(golikejs.context !== undefined);
	assert(golikejs.channel !== undefined);
});

Deno.test("golikejs main module - sync submodule should have expected exports", () => {
	assert(golikejs.sync.Mutex !== undefined);
	assert(golikejs.sync.WaitGroup !== undefined);
	// Add more as needed
});

Deno.test("golikejs main module - context submodule should have expected exports", () => {
	assert(golikejs.context.withCancel !== undefined);
	assert(golikejs.context.withTimeout !== undefined);
	// Add more as needed
});

Deno.test("golikejs main module - channel submodule should have expected exports", () => {
	assert(golikejs.channel.Channel !== undefined);
	// Add more as needed
});
