/**
 * Closer is the interface that wraps the basic Close method.
 * Close closes the stream.
 */
export interface Closer {
  close(): Promise<Error | undefined>;
}
