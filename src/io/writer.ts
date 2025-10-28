import { Closer } from "./closer.ts";

/**
 * Writer is the interface that wraps the basic Write method.
 * Write writes len(p) bytes from p to the underlying data stream.
 * It returns the number of bytes written (0 <= n <= len(p)) and any error encountered.
 * Write must return a non-nil error if it returns n < len(p).
 */
export interface Writer {
  write(p: Uint8Array): Promise<[number, Error | undefined]>;
}

/**
 * WriteCloser is the interface that groups the basic Write and Close methods.
 */
export interface WriteCloser extends Writer, Closer {}

export type { Closer };
