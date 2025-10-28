/**
 * EOFError is returned by Read when no more input is available.
 */
export class EOFError extends Error {
  constructor() {
    super("EOF");
    this.name = "EOFError";
  }
}
