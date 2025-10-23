

# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and this project adheres to Semantic Versioning.

## [0.3.2] - 2025-10-22

### Added

- **`afterFunc()` function**: Added Go-style `context.AfterFunc` implementation to the context package for registering cleanup callbacks that execute when a context is cancelled or finished.
  - Returns a `stop()` function to prevent callback execution before it runs
  - Supports both synchronous and asynchronous callbacks
  - Errors in callbacks are silently ignored (fire-and-forget execution)
  - Works seamlessly with all context creation functions (`withCancel`, `withTimeout`, `watchPromise`, etc.)

## [0.3.1] - 2025-10-13

### Performance

- **Test optimization**: Reduced test execution time by ~18% (from ~11s to ~9.5s) by optimizing timeouts and reducing worker counts in integration tests.
- **Timeout reductions**: Decreased setTimeout values across tests (semaphore: 50ms→10ms, context: 100ms→50ms, channel workers: 10-40ms→5-15ms).
- **Worker count optimization**: Reduced concurrent worker count in channel tests from 30 to 15 for faster execution.

## [0.3.0] - 2025-01-15

### Added

- **`select()` function**: Added Go-style select functionality to the channel package for multiplexing channel operations with default case support.
- **Helper functions**: Added `receive()`, `send()`, and `default_()` helper functions with Promise-chain style API for more intuitive select usage.

## [0.2.0] - 2025-01-15

### Added

- `src/io` — Added Go-like io utilities.
- `src/io/errors.ts` — Added Go-like io errors.
- `WaitGroup.go()` — Added Go method to WaitGroup for automatic counter management of async functions.

## [0.1.8] - 2025-10-13

### Added

- `src/io` — Added Go-like io utilities.
- `src/io/errors.ts` — Added Go-like io errors.
- `WaitGroup.go()` — Added Go method to WaitGroup for automatic counter management of async functions.

## [0.1.8] - 2025-10-13

### Added

- CommonJS support alongside ESM in package exports.

### Fixed

- Flaky semaphore test timing assertions.

## [0.1.7] - 2025-10-02

### Added

- CommonJS support alongside ESM in package exports.

### Fixed

- Flaky semaphore test timing assertions.

## [0.1.6] - 2025-10-02

### Fixed

- Package exports for ESM-only support to fix import issues in test runtimes.

## [0.1.5] - 2025-10-02

### Changed

- Migrated from Bun to Node.js/npm environment.
- Updated build scripts and test setup.

## [0.1.4] - 2025-10-02

### Fixed

- Git tag conflicts during version bump.

## [0.1.3] - 2025-10-02

### Added

- Initial release with sync and context packages.

## [0.1.0] - 2025-09-30

### Added

- `src/context` — Go-like context utilities (Background, withCancel, withTimeout, done semantics).
- `src/sync/channel.ts` — Channel<T> with unbuffered/buffered semantics (ring buffer).
- `src/sync/mutex.ts`, `src/sync/rwmutex.ts` — Mutex and RWMutex.
- `src/sync/waitgroup.ts` — WaitGroup.
- `src/sync/semaphore.ts` — Semaphore.
- `src/sync/cond.ts` — Cond compatible with Go's `sync.Cond`.
- Tests and Bun-based test setup (`bun test`).
- CI workflow and Codecov integration.
- Publish workflow to publish releases to npm (requires `NPM_TOKEN`).
- Documentation: `README.md` and `README.ja.md`.

### Changed

- Project reorganized and package renamed to `golikejs` to reflect broader scope (reimplementations of Go standard packages).

### Fixed

- N/A

---

For details, see `README.md` and repository files.