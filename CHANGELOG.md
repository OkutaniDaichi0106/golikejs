

# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and this project adheres to Semantic Versioning.

## [Unreleased]

- No changes yet.

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

