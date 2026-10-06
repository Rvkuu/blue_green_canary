# ADR 0010: Per-request application logs

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The deployment lab needs to show which application version handled a request
and make traffic distribution observable during a later canary rollout.
Counting successful short-link redirects is not sufficient: it does not count
health checks, API calls, or failed requests.

## Decision

Log one structured JSON event when every HTTP response completes. Include the
application version, per-process request sequence number, HTTP method, path,
response status, and elapsed duration in milliseconds. Write logs to stdout so
Docker can collect them with `docker compose logs`.

The sequence number is local to an application process and resets when its
container restarts. It is a teaching aid for observing traffic, not a durable
or production metrics system. Avoid recording query strings or request bodies.

For v1, use a fixed version field of `v1`. The later v2 implementation must
identify itself as `v2` so logs can be compared per version.

## Alternatives considered

- **Only count successful link redirects:** misses other application traffic
  and does not reveal HTTP status or latency.
- **Add a metrics backend now:** provides durable aggregation and dashboards,
  but adds operational components beyond the MVP lab.
- **Write request counts into SQLite:** would add a database write for every
  request and would mix operational metrics with product click analytics.

## Consequences

- Logs expose a clear per-version request count and basic latency/status
  observations without adding another service.
- Counts reset with the process and are not durable across restarts.
- A production deployment would normally use a metrics and log aggregation
  system rather than in-memory sequence numbers.

## Health-check behavior

The `/health` endpoint checks that the app can query SQLite. Docker Compose
uses it to mark v1 healthy and waits for that state before starting Nginx.
Open-source Nginx does not actively poll this endpoint. Its upstream has only
one server today, so there is no alternate backend for Nginx to fail over to.
Active Nginx upstream health checks are a NGINX Plus feature. The lab will
distinguish container readiness from proxy active health monitoring.
