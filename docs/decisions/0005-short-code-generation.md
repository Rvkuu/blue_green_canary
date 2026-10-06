# ADR 0005: Random short-code format


## Context

Short codes should stay compact in URLs, be generated without user input, and
avoid exposing the number or order of links created. Random generation can
produce duplicate codes, so uniqueness must be guaranteed by persistence
rather than assumed from probability alone.

## Decision

Generate an eight-character code from uppercase letters, lowercase letters,
and digits (62 possible characters per position). Use a cryptographically
strong random source with uniform selection. Enforce a unique constraint on
the stored code and retry generation if an insertion collides.

An eight-character code has `62^8` possible values (about 218 trillion).
Collisions remain possible; the database constraint and retry are what prevent
two links from receiving the same code. Codes are not credentials and do not
provide access control.

## Alternatives considered

- **Shorter codes:** reduce typing slightly but leave a smaller code space and
  make collisions more frequent as the number of links grows.
- **Sequential identifiers:** simple and collision-free, but reveal
  information about creation order and are easy to enumerate.
- **Rely on randomness without a database uniqueness constraint:** rejected
  because even very unlikely collisions must not overwrite or alias links.

## Consequences

- Links remain short and codes do not reveal creation order.
- Code lookup is case-sensitive.
- Storage must enforce code uniqueness atomically; generation retries only
  genuine code collisions, with a bounded retry policy.
- Randomness makes guessing harder but is not a substitute for authentication
  or authorization.
