# ADR 0006: Built-in Node.js test runner


## Context

The MVP needs automated coverage for link creation, listing, redirects,
validation, and persistence. The current application uses Node.js, and the
development environment provides a recent Node.js LTS release.

## Decision

Use Node.js's built-in `node:test` runner with `node:assert/strict`. Begin with
HTTP-level tests against the application so that tests verify observable API
behavior, not only helper functions. Do not add a third-party test framework
for the MVP.

## Alternatives considered

- **A dedicated framework such as Jest or Vitest:** offers additional features,
  but adds dependencies and configuration before the project needs them.
- **Manual curl-only verification:** useful during development, but not
  repeatable enough to protect behavior as the app changes.

## Consequences

- Tests can run with the built-in `node --test` command and no test-runner
  dependency.
- The Node runtime used by the application and CI must support `node:test`.
- Tests should use temporary or isolated database state so they do not depend
  on a developer's persistent local data.
- A dedicated framework can be introduced later if testing needs justify the
  additional dependency.
