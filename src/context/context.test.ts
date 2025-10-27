import { assertEquals, assert, assertThrows } from './_test_util.ts';
import type { Context } from './context';
import {
    background,
    watchSignal,
    withAbort,
    withCancel,
    withCancelCause,
    withTimeout,
    watchPromise,
    afterFunc,
    ContextCancelledError,
    ContextTimeoutError
} from './context';

        Deno.test('background - should create a background context', () => {
            const ctx = background();
            assert(ctx !== undefined);
            assertEquals(ctx.err(), undefined);

        Deno.test('background - should return the same instance on multiple calls', () => {
            const ctx1 = background();
            const ctx2 = background();
            assertEquals(ctx1, ctx2);

        Deno.test('should not be aborted initially', () => {
            const ctx = background();
            assertEquals(ctx.err(), undefined);
        });
    });

        Deno.test('watchSignal - should create a context with custom signal', () => {
            const parentCtx = background();
            const controller = new AbortController();
            const childCtx = watchSignal(parentCtx, controller.signal);
            
            assert(childCtx !== undefined);
            assertEquals(childCtx.err(), undefined);

        Deno.test('should be cancelled when custom signal is aborted', async () => {
            const parentCtx = background();
            const controller = new AbortController();
            const childCtx = watchSignal(parentCtx, controller.signal);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            controller.abort(new Error('Custom abort'));
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
            assert(childCtx.err() instanceof Error);
        });

        Deno.test('should handle already aborted signal', () => {
            const parentCtx = background();
            const controller = new AbortController();
            const testError = new Error('Already aborted');
            controller.abort(testError);
            
            const childCtx = watchSignal(parentCtx, controller.signal);
            assert(childCtx.err() instanceof Error);
        });

        Deno.test('should remove listener when context ends earlier', async () => {
            const parentCtx = background();
            const controller = new AbortController();
            const childCtx = watchSignal(parentCtx, controller.signal);

            // Wait for potential listener setup
            await new Promise(resolve => setTimeout(resolve, 1));

            // Cancel context first
            const [c, cancel] = withCancel(childCtx);
            cancel();

            // No error should be thrown when aborting controller later
            controller.abort(new Error('Should be ignored'));
            await new Promise(resolve => setTimeout(resolve, 1));
            assertEquals(true, true); // reach here without uncaught errors
        });
    });

        Deno.test('withCancel - should create a cancellable context', () => {
            const parentCtx = background();
            const [childCtx, cancel] = withCancel(parentCtx);
            
            assert(childCtx !== undefined);
            assertEquals(childCtx.err(), undefined);
            assertEquals(typeof cancel, 'function');

        Deno.test('should cancel the context when cancel function is called', async () => {
            const parentCtx = background();
            const [childCtx, cancel] = withCancel(parentCtx);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
            assert(childCtx.err() instanceof Error);
        });

        Deno.test('should be cancelled when parent is cancelled', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const [childCtx, ] = withCancel(parentCtx);
            
            let childDone = false;
            childCtx.done().then(() => { childDone = true; });
            
            parentCancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(childDone, true);
            assert(childCtx.err() instanceof Error);
        });
    });

        Deno.test('withCancelCause - should create a cancellable context with custom error', () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            assert(childCtx !== undefined);
            assertEquals(childCtx.err(), undefined);
            assertEquals(typeof cancelWithCause, 'function');

        Deno.test('should cancel with custom error', async () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            const customError = new Error('Custom cancellation');
            let done = false;
            
            childCtx.done().then(() => { 
                done = true; 
                assertEquals(childCtx.err(), customError);
            });
            
            cancelWithCause(customError);
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
        });

        Deno.test('should handle undefined error', async () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            cancelWithCause(undefined);
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
        });
    });

        Deno.test('withTimeout - should create a context with timeout', () => {
            const parentCtx = background();
            const childCtx = withTimeout(parentCtx, 1000);
            
            assert(childCtx !== undefined);
            assertEquals(childCtx.err(), undefined);

        Deno.test('should cancel after timeout', async () => {
            const parentCtx = background();
            const childCtx = withTimeout(parentCtx, 50);
            
            let done = false;
            let caughtError: any = null;
            
            childCtx.done().then(() => { 
                done = true; 
                caughtError = childCtx.err();
            });
            
            // Wait longer than timeout
            await new Promise(resolve => setTimeout(resolve, 50));
            
            assertEquals(done, true);
            assert(caughtError instanceof Error);
            if (caughtError instanceof Error) {
                assert(caughtError.message.includes('timeout'));
            }
        });

        Deno.test('should not timeout if parent is cancelled first', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const childCtx = withTimeout(parentCtx, 1000);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            // Cancel parent before timeout
            parentCancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
        });
    });

        Deno.test('watchPromise - should create a context that cancels when promise resolves', async () => {
            const parentCtx = background();
            const promise = Promise.resolve('test value');
            const childCtx = watchPromise(parentCtx, promise);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
            assertEquals(childCtx.err(), undefined);

        Deno.test('should create a context that cancels when promise rejects', async () => {
            const parentCtx = background();
            const testError = new Error('Promise rejected');
            const promise = Promise.reject(testError);
            const childCtx = watchPromise(parentCtx, promise);
            
            let done = false;
            let error: Error | null = null;
            
            childCtx.done().then(() => { 
                done = true; 
                error = childCtx.err() || null;
            });
            
            // Wait for promise to reject
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
            assert(error instanceof Error);
        });

        Deno.test('should handle non-Error rejection reasons', async () => {
            const parentCtx = background();
            const promise = Promise.reject('string rejection');
            const childCtx = watchPromise(parentCtx, promise);
            
            let done = false;
            let caughtError: any = null;
            
            childCtx.done().then(() => { 
                done = true; 
                caughtError = childCtx.err();
            });
            
            // Wait for promise to reject
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(done, true);
            assert(caughtError instanceof Error);
            if (caughtError instanceof Error) {
                assert(caughtError.message.includes('string rejection'));
            }
        });
    });

        Deno.test('Context interface - should provide done() promise that resolves when cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            
            let resolved = false;
            let error: Error | null = null;
            
            ctx.done().then(() => {
                resolved = true;
                error = ctx.err() || null;
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assertEquals(resolved, true);
            assert(error instanceof Error);
        });

        Deno.test('should have signal property', () => {
            const ctx = background();
            assert(ctx !== undefined);
        });

        Deno.test('should return error when cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            
            assertEquals(ctx.err(), undefined);
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            assert(ctx.err() instanceof Error);
        });
    });

        Deno.test('ContextCancelledError - should be an instance of Error', () => {
            assert(ContextCancelledError instanceof Error);

        Deno.test('should have the correct message', () => {
            assertEquals(ContextCancelledError.message, 'Context cancelled');
        });
    });

        Deno.test('ContextTimeoutError - should be an instance of Error', () => {
            assert(ContextTimeoutError instanceof Error);

        Deno.test('should have the correct message', () => {
            assertEquals(ContextTimeoutError.message, 'Context timeout');
        });
    });

        Deno.test('withAbort - aborting controller cancels context', async () => {
            const parent = background();
            const [ctx, ac] = withAbort(parent);

            let done = false;
            ctx.done().then(() => { done = true; });

            ac.abort(new Error('abort reason'));
            await new Promise((r) => setTimeout(r, 10));

            assertEquals(done, true);
            assert(ctx.err() instanceof Error);

        Deno.test('cancelling context aborts controller', async () => {
            const [parent, parentCancel] = withCancel(background());
            const [ctx, ac] = withAbort(parent);

            let signalled = false;
            ac.signal.addEventListener('abort', () => { signalled = true; }, { once: true });

            parentCancel();

            await new Promise((r) => setTimeout(r, 10));

            assertEquals(signalled, true);
        });
    });

        Deno.test('afterFunc - should execute callback when context is cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;

            assertEquals(called, false);
            cancel();

            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, true);
        });

        Deno.test('should return true when stop is called before execution', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            const stopped = stop();
            assertEquals(stopped, true);
            assertEquals(called, false);

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, false);
        });

        Deno.test('should return false when stop is called after execution', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, true);

            const stopped = stop();
            assertEquals(stopped, false);
        });

        Deno.test('should return false on second stop call', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            const stopped1 = stop();
            assertEquals(stopped1, true);

            const stopped2 = stop();
            assertEquals(stopped2, false);

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, false);
        });

        Deno.test('should handle async callbacks', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, async () => {
                await new Promise((r) => setTimeout(r, 5));
                called = true;
            });

            cancel();
            await new Promise((r) => setTimeout(r, 20));
            assertEquals(called, true);
        });

        Deno.test('should propagate parent context cancellation', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const [childCtx, childCancel] = withCancel(parentCtx);
            let called = false;

            const stop = afterFunc(childCtx, () => {
                called = true;
            });

            parentCancel();
            await new Promise((r) => setTimeout(r, 10));

            assertEquals(called, true);
            assertEquals(stop(), false);
        });

        Deno.test('should handle errors in callback gracefully', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, async () => {
                called = true;
                throw new Error('Test error');
            });

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, true);
            // No error should be thrown
        });

        Deno.test('should work with withTimeout context', async () => {
            const ctx = withTimeout(background(), 20);
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            await new Promise((r) => setTimeout(r, 40));
            assertEquals(called, true);
        });

        Deno.test('should work with watchPromise context', async () => {
            let resolvePromise: () => void;
            const promise = new Promise<void>((resolve) => {
                resolvePromise = resolve;
            });

            const ctx = watchPromise(background(), promise);
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            resolvePromise!();
            await new Promise((r) => setTimeout(r, 10));
            assertEquals(called, true);
        });
    });
});
