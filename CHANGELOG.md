

# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and this project adheres to Semantic Versioning.

## [Unreleased]

## [0.1.9] - 2025-01-15

### Added

- `src/io` — Added Go-like io utilities.
- `src/io/errors.ts` — Added Go-like io errors.
- `WaitGroup.go()` — Added Go method to WaitGroup for automatic counter management of async functions.

## [Unreleased]

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