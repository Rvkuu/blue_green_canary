# ADR 0007: Use Node.js built-in SQLite support


## Context

The service needs persistent SQLite storage and already uses Node.js. The
development host has Node.js 24, while the existing app containers use Node.js
18. Node.js provides a built-in SQLite API in newer releases, avoiding an
additional native database dependency.

## Decision

Use Node.js's built-in `node:sqlite` module and upgrade both application
container images to Node.js 24. Do not add a third-party SQLite driver for the
MVP.

The Node.js 24 documentation currently describes `node:sqlite` as a release
candidate. This is an explicit learning-project trade-off, not a claim that
the API is production-stable. Reassess before using this implementation for a
production service. See the
[Node.js 24 SQLite documentation](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)
for the current stability status and API details.

## Alternatives considered

- **An established external SQLite driver:** has a longer history, but adds a
  dependency and native-module packaging/build considerations.
- **Keep Node.js 18 and use an external driver:** avoids a runtime-image
  upgrade but retains the older runtime and adds the driver dependency.

## Consequences

- Database access does not require a third-party npm package.
- Both app containers and the host test environment must use Node.js 24 or
  newer.
- The Node.js 24 built-in SQLite API is release-candidate stability and could
  change; review the official documentation when upgrading Node.js.
- `DatabaseSync` performs database operations synchronously, which can block
  the event loop. This is acceptable for the low-volume lab; revisit the
  driver choice if throughput requirements change.
- Both app versions will access one persisted SQLite database in the Compose
  deployment, so concurrent writes, initialization, and schema compatibility
  must be handled and tested.
- Migration/versioning strategy and database connection settings remain
  technical decisions to settle before implementation.
