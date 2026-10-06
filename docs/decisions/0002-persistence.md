# ADR 0002: SQLite with a persistent Docker volume


## Context

The service needs to retain shortened URLs and click counts across application
container restarts. The lab should remain quick to run locally with Docker
Compose and avoid introducing an external database service before it is
needed.

## Decision

Use SQLite for application data and persist its database file in a Docker
volume.

## Alternatives considered

- **In-memory storage:** simplest to implement, but loses all data on restart
  and would not satisfy the persistence requirement.
- **PostgreSQL in Compose:** closer to a multi-service production setup, but
  adds operational and schema-management work that is not necessary for the
  initial learning goals.

## Consequences

- The lab remains self-contained and can be started with Docker Compose.
- The persistent volume keeps link data independent of application container
  lifecycles.
- The application must ensure concurrent requests and schema initialization
  are handled correctly for the chosen SQLite library.
- SQLite is appropriate for this learning setup; production scaling and
  database high availability are outside the MVP.
