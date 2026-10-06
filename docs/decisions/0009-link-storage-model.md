# ADR 0009: Minimal link storage model


## Context

The MVP must create short links, resolve them, and count successful redirects.
Its public API does not need link ownership, editing, deletion, or creation
timestamps.

## Decision

The initial SQLite schema contains one `links` table:

```sql
CREATE TABLE links (
  code TEXT NOT NULL PRIMARY KEY CHECK (length(code) = 8),
  destination_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0)
) STRICT;
```

The code is unique and exactly eight characters, the destination is required,
and click counts start at zero and cannot be negative. The application
validates that destinations are well-formed HTTP or HTTPS URLs before storage.
Incrementing a click count is an atomic database update.

Do not store a `created_at` timestamp in the MVP; it is not needed to satisfy
the agreed use cases.

## Alternatives considered

- **Add timestamps and additional analytics fields:** potentially useful later,
  but not required for current create, redirect, and count behavior.
- **Store counts only in application memory:** rejected because counts must
  survive container restarts and be shared by both app versions.

## Consequences

- The MVP schema remains small and directly represents required behavior.
- The SQLite constraints protect uniqueness and basic data integrity even if
  application code has a bug.
- Adding timestamps or further analytics later will require a reviewed schema
  migration.
