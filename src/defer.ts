export type DeferredSyncFunc = () => void;
export type DeferredAsyncFunc = () => Promise<void>;
export type DeferFunc = (fn: DeferredSyncFunc | DeferredAsyncFunc) => void;

export async function scope(fn: (defer: DeferFunc) => void | Promise<void>): Promise<void> {
    const task: (DeferredSyncFunc | DeferredAsyncFunc)[] = [];

    const defer: DeferFunc = (fn) => {
        task.push(fn);
    };

    try {
        await fn(defer);
    } finally {
        while (task.length > 0) {
            const fn = task.pop();
            if (!fn) continue;
            try {
                await fn();
            } catch (e) {
                console.error(e);
            }
        }
    }
}