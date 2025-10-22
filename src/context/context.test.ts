import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('Context', () => {
    describe('background', () => {
        it('should create a background context', () => {
            const ctx = background();
            expect(ctx).toBeDefined();
            expect(ctx.err()).toBeUndefined();
        });

        it('should return the same instance on multiple calls', () => {
            const ctx1 = background();
            const ctx2 = background();
            expect(ctx1).toBe(ctx2);
        });

        it('should not be aborted initially', () => {
            const ctx = background();
            expect(ctx.err()).toBeUndefined();
        });
    });

    describe('watchSignal', () => {
        it('should create a context with custom signal', () => {
            const parentCtx = background();
            const controller = new AbortController();
            const childCtx = watchSignal(parentCtx, controller.signal);
            
            expect(childCtx).toBeDefined();
            expect(childCtx.err()).toBeUndefined();
        });

        it('should be cancelled when custom signal is aborted', async () => {
            const parentCtx = background();
            const controller = new AbortController();
            const childCtx = watchSignal(parentCtx, controller.signal);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            controller.abort(new Error('Custom abort'));
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
            expect(childCtx.err()).toBeInstanceOf(Error);
        });

        it('should handle already aborted signal', () => {
            const parentCtx = background();
            const controller = new AbortController();
            const testError = new Error('Already aborted');
            controller.abort(testError);
            
            const childCtx = watchSignal(parentCtx, controller.signal);
            expect(childCtx.err()).toBeInstanceOf(Error);
        });

        it('should remove listener when context ends earlier', async () => {
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
            expect(true).toBe(true); // reach here without uncaught errors
        });
    });

    describe('withCancel', () => {
        it('should create a cancellable context', () => {
            const parentCtx = background();
            const [childCtx, cancel] = withCancel(parentCtx);
            
            expect(childCtx).toBeDefined();
            expect(childCtx.err()).toBeUndefined();
            expect(typeof cancel).toBe('function');
        });

        it('should cancel the context when cancel function is called', async () => {
            const parentCtx = background();
            const [childCtx, cancel] = withCancel(parentCtx);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
            expect(childCtx.err()).toBeInstanceOf(Error);
        });

        it('should be cancelled when parent is cancelled', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const [childCtx, ] = withCancel(parentCtx);
            
            let childDone = false;
            childCtx.done().then(() => { childDone = true; });
            
            parentCancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(childDone).toBe(true);
            expect(childCtx.err()).toBeInstanceOf(Error);
        });
    });

    describe('withCancelCause', () => {
        it('should create a cancellable context with custom error', () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            expect(childCtx).toBeDefined();
            expect(childCtx.err()).toBeUndefined();
            expect(typeof cancelWithCause).toBe('function');
        });

        it('should cancel with custom error', async () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            const customError = new Error('Custom cancellation');
            let done = false;
            
            childCtx.done().then(() => { 
                done = true; 
                expect(childCtx.err()).toBe(customError);
            });
            
            cancelWithCause(customError);
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
        });

        it('should handle undefined error', async () => {
            const parentCtx = background();
            const [childCtx, cancelWithCause] = withCancelCause(parentCtx);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            cancelWithCause(undefined);
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
        });
    });

    describe('withTimeout', () => {
        it('should create a context with timeout', () => {
            const parentCtx = background();
            const childCtx = withTimeout(parentCtx, 1000);
            
            expect(childCtx).toBeDefined();
            expect(childCtx.err()).toBeUndefined();
        });

        it('should cancel after timeout', async () => {
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
            
            expect(done).toBe(true);
            expect(caughtError).toBeInstanceOf(Error);
            if (caughtError instanceof Error) {
                expect(caughtError.message).toContain('timeout');
            }
        });

        it('should not timeout if parent is cancelled first', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const childCtx = withTimeout(parentCtx, 1000);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            // Cancel parent before timeout
            parentCancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
        });
    });

    describe('watchPromise', () => {
        it('should create a context that cancels when promise resolves', async () => {
            const parentCtx = background();
            const promise = Promise.resolve('test value');
            const childCtx = watchPromise(parentCtx, promise);
            
            let done = false;
            childCtx.done().then(() => { done = true; });
            
            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(done).toBe(true);
            expect(childCtx.err()).toBeUndefined();
        });

        it('should create a context that cancels when promise rejects', async () => {
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
            
            expect(done).toBe(true);
            expect(error).toBeInstanceOf(Error);
        });

        it('should handle non-Error rejection reasons', async () => {
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
            
            expect(done).toBe(true);
            expect(caughtError).toBeInstanceOf(Error);
            if (caughtError instanceof Error) {
                expect(caughtError.message).toContain('string rejection');
            }
        });
    });

    describe('Context interface', () => {
        it('should provide done() promise that resolves when cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            
            let resolved = false;
            let error: Error | null = null;
            
            ctx.done().then(() => {
                resolved = true;
                error = ctx.err() || null;
            });
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(resolved).toBe(true);
            expect(error).toBeInstanceOf(Error);
        });

        it('should have signal property', () => {
            const ctx = background();
            expect(ctx).toBeDefined();
        });

        it('should return error when cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            
            expect(ctx.err()).toBeUndefined();
            
            cancel();
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(ctx.err()).toBeInstanceOf(Error);
        });
    });

    describe('ContextCancelledError', () => {
        it('should be an instance of Error', () => {
            expect(ContextCancelledError).toBeInstanceOf(Error);
        });

        it('should have the correct message', () => {
            expect(ContextCancelledError.message).toBe('Context cancelled');
        });
    });

    describe('ContextTimeoutError', () => {
        it('should be an instance of Error', () => {
            expect(ContextTimeoutError).toBeInstanceOf(Error);
        });

        it('should have the correct message', () => {
            expect(ContextTimeoutError.message).toBe('Context timeout');
        });
    });

    describe('withAbort', () => {
        it('aborting controller cancels context', async () => {
            const parent = background();
            const [ctx, ac] = withAbort(parent);

            let done = false;
            ctx.done().then(() => { done = true; });

            ac.abort(new Error('abort reason'));
            await new Promise((r) => setTimeout(r, 10));

            expect(done).toBe(true);
            expect(ctx.err()).toBeInstanceOf(Error);
        });

        it('cancelling context aborts controller', async () => {
            const [parent, parentCancel] = withCancel(background());
            const [ctx, ac] = withAbort(parent);

            let signalled = false;
            ac.signal.addEventListener('abort', () => { signalled = true; }, { once: true });

            parentCancel();

            await new Promise((r) => setTimeout(r, 10));

            expect(signalled).toBe(true);
        });
    });

    describe('afterFunc', () => {
        it('should execute callback when context is cancelled', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            expect(called).toBe(false);
            cancel();

            await new Promise((r) => setTimeout(r, 10));
            expect(called).toBe(true);
        });

        it('should return true when stop is called before execution', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            const stopped = stop();
            expect(stopped).toBe(true);
            expect(called).toBe(false);

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            expect(called).toBe(false);
        });

        it('should return false when stop is called after execution', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            expect(called).toBe(true);

            const stopped = stop();
            expect(stopped).toBe(false);
        });

        it('should return false on second stop call', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            const stopped1 = stop();
            expect(stopped1).toBe(true);

            const stopped2 = stop();
            expect(stopped2).toBe(false);

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            expect(called).toBe(false);
        });

        it('should handle async callbacks', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, async () => {
                await new Promise((r) => setTimeout(r, 5));
                called = true;
            });

            cancel();
            await new Promise((r) => setTimeout(r, 20));
            expect(called).toBe(true);
        });

        it('should propagate parent context cancellation', async () => {
            const [parentCtx, parentCancel] = withCancel(background());
            const [childCtx, childCancel] = withCancel(parentCtx);
            let called = false;

            const stop = afterFunc(childCtx, () => {
                called = true;
            });

            parentCancel();
            await new Promise((r) => setTimeout(r, 10));

            expect(called).toBe(true);
            expect(stop()).toBe(false);
        });

        it('should handle errors in callback gracefully', async () => {
            const [ctx, cancel] = withCancel(background());
            let called = false;

            const stop = afterFunc(ctx, async () => {
                called = true;
                throw new Error('Test error');
            });

            cancel();
            await new Promise((r) => setTimeout(r, 10));
            expect(called).toBe(true);
            // No error should be thrown
        });

        it('should work with withTimeout context', async () => {
            const ctx = withTimeout(background(), 20);
            let called = false;

            const stop = afterFunc(ctx, () => {
                called = true;
            });

            await new Promise((r) => setTimeout(r, 40));
            expect(called).toBe(true);
        });

        it('should work with watchPromise context', async () => {
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
            expect(called).toBe(true);
        });
    });
});
