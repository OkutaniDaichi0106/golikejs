
# golikejs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Reimplementation of Go's concurrency and utility primitives for JavaScript and TypeScript runtimes.

**golikejs** is a library that brings familiar Go designs to JavaScript and TypeScript.
It aims to provide practical API compatibility with Go’s standard library and offers Go-style implementations such as concurrency primitives and I/O utilities.

## Packages

- **[sync](./src/sync/)** — Synchronization primitives for concurrent programs.
- **[context](./src/context/)** — Context utilities for cancellation and timeouts.
- **[bytes](./src/bytes/)** — Byte-slice helpers and buffer utilities.
- **[io](./src/io/)** — I/O primitives and small helpers.

## Installation

| Package Manager | Command |
| --- | --- |
| Deno | `deno add jsr:@okudai/golikejs` |
| npm | `npx jsr add @okudai/golikejs` |
| pnpm | `pnpm i jsr:@okudai/golikejs` |
| Bun | `bunx jsr add @okudai/golikejs` |
| yarn | `yarn add jsr:@okudai/golikejs` |
| vlt | `vlt install jsr:@okudai/golikejs` |

### Quick Start

```ts
import { Mutex } from 'jsr:@okudai/golikejs/sync';

const m = new Mutex();
await m.lock();
try {
  // critical section
} finally {
  m.unlock();
}
```

For detailed examples and API documentation, see the individual package READMEs.

## Development

This project uses Deno for development and testing.

### Prerequisites

- [Deno](https://deno.land/) 2.x or later

### Commands

| Task | Command |
| --- | --- |
| Test | `deno task test` |
| Test with coverage | `deno task test:coverage` |
| Format code | `deno task fmt` |
| Lint code | `deno task lint` |
| Type check | `deno task check` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](./LICENSE) for details.

