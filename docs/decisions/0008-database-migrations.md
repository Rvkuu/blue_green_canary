# ADR 0008: Explicit versioned SQLite migrations


## Context

The blue and green application versions will share a persistent SQLite
database during canary and blue/green deployments. Applying schema changes
automatically from each app container at startup could make both versions
race to change the schema and could break the still-running version.

## Decision

Track schema changes as ordered, versioned SQL migrations in the repository.
Apply migrations as an explicit, single deployment step before deploying code
that depends on the new schema. Do not run migrations independently from each
application container at startup.

Migrations must preserve compatibility with application versions that may
still be receiving traffic. Prefer additive changes first; only remove
obsolete schema in a later step after no active version depends on it.

For the MVP, record the applied migration number with SQLite's
`PRAGMA user_version`. Docker Compose runs the migration command as a one-shot
service and starts v1 only after it completes successfully.

The migrator is forward-only: an older app image must not downgrade or reject
a database with a higher version. Each app checks only that the schema is at
least the minimum version it requires. This allows rollback to v1 after a
backward-compatible v2 migration; v2 migrations must be tested against v1
before rollout.

## Alternatives considered

- **Create tables automatically on each app startup:** less setup for the
  first table, but makes schema changes implicit and risks concurrent or
  incompatible changes during rollouts.
- **A full migration framework:** could provide more features, but adds
  tooling and dependencies before the small MVP needs them.

## Consequences

- Database changes are reviewable, ordered, and reproducible.
- Deployment instructions must include the migration step before new app
  versions receive traffic.
- The migration runner must prevent simultaneous application of the same
  migration.
- The initial schema can remain small while later releases practice
  backward-compatible blue/green database changes.
