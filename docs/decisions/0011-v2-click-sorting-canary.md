# ADR 0011: v2 click sorting as the first canary

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The v1 API is complete and verified. The next release should introduce a
small, visible behavior change that can be compared through the existing
Nginx proxy while v1 remains available for immediate rollback.

## Decision

Build v2 as a separately deployable snapshot of the v1 service. Add an
optional `sort=clicks` query parameter to `GET /api/links`. v2 sorts click
counts descending and breaks equal-count ties by short code ascending. Without
the parameter, v2 preserves v1's existing code-ascending order. Unknown or
repeated sort values return a JSON `400 Bad Request`.

Keep v1 unchanged: it ignores unrecognized query parameters and returns its
normal code-ascending list. Both versions continue to use the same SQLite
schema and shared persistent volume.

For the initial canary, Nginx distributes requests approximately 95% to v1 and
5% to v2. Progress through 80/20, 50/50, and 0/100 only after observing
version-tagged request logs and validating responses at each stage. The weight
split is approximate for finite request samples.

## Alternatives considered

- **Add a separate endpoint:** requests for it would receive 404 from v1 while
  both versions are in the canary pool, making the first exposure fail for
  most users.
- **Change the default ordering:** would alter responses for all callers and
  make the v1/v2 comparison less explicit.
- **Change the database schema:** unnecessary for sorting and would add
  migration compatibility risk to the first v2 release.

## Consequences

- A valid request remains successful whichever version receives it; only v2
  applies the requested ordering.
- During the canary, the same valid sorting request can have different order
  depending on which version handles it. This visible inconsistency is the
  behavior being measured in the learning exercise.
- Invalid sort values return a 400 from v2 but fall back to v1's default
  ordering when routed to v1. Clients should use only the documented
  `sort=clicks` value.
- No schema migration is needed, which makes rollback to v1 straightforward.
- This release demonstrates traffic weighting and observation, but does not
  define production promotion thresholds or durable metrics.
